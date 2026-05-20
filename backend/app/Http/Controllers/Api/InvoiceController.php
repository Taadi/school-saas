<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeCategory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\School;
use App\Models\Student;
use App\Models\Term;
use App\Models\User;
use App\Services\InvoiceService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function __construct(protected InvoiceService $invoices) {}

    /**
     * List invoices with filters. Students/parents are scoped to their own.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['nullable', 'integer'],
            'school_class_id' => ['nullable', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'term_id' => ['nullable', 'integer'],
            'academic_session_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in([Invoice::STATUS_PENDING, Invoice::STATUS_PARTIAL, Invoice::STATUS_PAID])],
            'search' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = Invoice::query()
            ->with([
                'student:id,user_id,admission_number',
                'student.user:id,name',
                'schoolClass:id,name',
                'arm:id,name',
                'term:id,name,academic_session_id',
                'academicSession:id,name',
            ])
            ->latest('id');

        $this->scopeForUser($query, $user);

        foreach (['student_id', 'school_class_id', 'arm_id', 'term_id', 'academic_session_id', 'status'] as $col) {
            if (! empty($data[$col])) {
                $query->where($col, $data[$col]);
            }
        }

        if ($search = $data['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($sq) use ($search) {
                        $sq->where('admission_number', 'like', "%{$search}%")
                            ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%"));
                    });
            });
        }

        $perPage = (int) ($data['per_page'] ?? 25);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
        ]);
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeAccess($request, $invoice);

        $invoice->load([
            'student:id,user_id,admission_number,guardian_name,guardian_phone',
            'student.user:id,name,email',
            'schoolClass:id,name',
            'arm:id,name',
            'term.academicSession:id,name',
            'items.category:id,name,code',
            'payments.recorder:id,name',
        ]);

        return response()->json(['data' => $invoice]);
    }

    /**
     * Bulk-generate invoices for a class/arm/term.
     */
    public function bulkGenerate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'include_optional' => ['sometimes', 'boolean'],
            'regenerate' => ['sometimes', 'boolean'],
        ]);

        $tenantId = $request->user()->tenant_id ?? app(TenantContext::class)->id();
        abort_unless($tenantId, 403, 'Tenant context required.');

        $school = School::query()->findOrFail($tenantId);
        $term = Term::with('academicSession')->findOrFail($data['term_id']);

        $result = $this->invoices->generateForClass(
            school: $school,
            schoolClassId: $data['school_class_id'],
            term: $term,
            armId: $data['arm_id'] ?? null,
            includeOptional: (bool) ($data['include_optional'] ?? false),
            regenerate: (bool) ($data['regenerate'] ?? false),
        );

        return response()->json([
            'message' => "Generated {$result['created']} new, refreshed {$result['refreshed']}, skipped {$result['skipped']}.",
            ...$result,
        ]);
    }

    /**
     * Generate / regenerate a single student's invoice for a term.
     */
    public function generateForStudent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'school_class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'include_optional' => ['sometimes', 'boolean'],
        ]);

        $tenantId = $request->user()->tenant_id ?? app(TenantContext::class)->id();
        abort_unless($tenantId, 403, 'Tenant context required.');

        $school = School::findOrFail($tenantId);
        $student = Student::findOrFail($data['student_id']);
        $term = Term::findOrFail($data['term_id']);

        $invoice = $this->invoices->generateForStudent(
            school: $school,
            student: $student,
            term: $term,
            schoolClassId: $data['school_class_id'] ?? null,
            armId: $data['arm_id'] ?? null,
            includeOptional: (bool) ($data['include_optional'] ?? false),
        );

        if (! $invoice) {
            return response()->json([
                'message' => 'No fee structure found for this student\'s class and term.',
            ], 422);
        }

        return response()->json(['data' => $invoice->load(['items.category', 'payments'])]);
    }

    /**
     * Add a custom line item to an existing invoice.
     */
    public function addItem(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeAccess($request, $invoice, requireWrite: true);

        $data = $request->validate([
            'fee_category_id' => ['required', 'exists:fee_categories,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $category = FeeCategory::findOrFail($data['fee_category_id']);

        InvoiceItem::create([
            'tenant_id' => $invoice->tenant_id,
            'invoice_id' => $invoice->id,
            'fee_category_id' => $category->id,
            'description' => $data['description'] ?: $category->name,
            'amount' => $data['amount'],
        ]);

        $invoice->refresh()->recalculate();

        return response()->json([
            'data' => $invoice->fresh(['items.category', 'payments']),
        ], 201);
    }

    public function removeItem(Request $request, Invoice $invoice, InvoiceItem $item): JsonResponse
    {
        $this->authorizeAccess($request, $invoice, requireWrite: true);
        abort_unless($item->invoice_id === $invoice->id, 404);

        $item->delete();
        $invoice->refresh()->recalculate();

        return response()->json(['data' => $invoice->fresh(['items.category', 'payments'])]);
    }

    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeAccess($request, $invoice, requireWrite: true);

        if ($invoice->amount_paid > 0) {
            return response()->json([
                'message' => 'Cannot delete an invoice with recorded payments.',
            ], 422);
        }

        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted.']);
    }

    /**
     * Aggregate dashboard summary: collected vs expected, defaulters, recent payments.
     */
    public function summary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_session_id' => ['nullable', 'integer'],
            'term_id' => ['nullable', 'integer'],
        ]);

        $base = Invoice::query();
        if (! empty($data['academic_session_id'])) {
            $base->where('academic_session_id', $data['academic_session_id']);
        }
        if (! empty($data['term_id'])) {
            $base->where('term_id', $data['term_id']);
        }

        $expected = (float) (clone $base)->sum('total_amount');
        $collected = (float) (clone $base)->sum('amount_paid');
        $outstanding = max(0, round($expected - $collected, 2));

        $invoiceCount = (clone $base)->count();
        $byStatus = (clone $base)
            ->selectRaw('status, COUNT(*) AS count, SUM(total_amount) AS total, SUM(amount_paid) AS paid')
            ->groupBy('status')
            ->get();

        $defaulters = (clone $base)
            ->with(['student:id,user_id,admission_number', 'student.user:id,name', 'schoolClass:id,name', 'arm:id,name'])
            ->where('balance', '>', 0)
            ->orderByDesc('balance')
            ->limit(10)
            ->get(['id', 'tenant_id', 'invoice_number', 'student_id', 'school_class_id', 'arm_id', 'total_amount', 'amount_paid', 'balance', 'status', 'due_date']);

        $recentPayments = \App\Models\Payment::query()
            ->with(['invoice.student:id,user_id,admission_number', 'invoice.student.user:id,name', 'recorder:id,name'])
            ->latest('paid_on')
            ->limit(10)
            ->get();

        return response()->json([
            'totals' => [
                'expected' => round($expected, 2),
                'collected' => round($collected, 2),
                'outstanding' => $outstanding,
                'collection_rate' => $expected > 0 ? round(($collected / $expected) * 100, 1) : 0,
                'invoice_count' => $invoiceCount,
            ],
            'by_status' => $byStatus,
            'defaulters' => $defaulters,
            'recent_payments' => $recentPayments,
        ]);
    }

    /**
     * Constrain invoice queries for non-admin users to their own records.
     */
    protected function scopeForUser($query, User $user): void
    {
        if (in_array($user->role, [User::ROLE_SUPER_ADMIN, User::ROLE_SCHOOL_ADMIN, User::ROLE_TEACHER], true)) {
            return;
        }

        if ($user->role === User::ROLE_STUDENT) {
            $query->whereHas('student', fn ($q) => $q->where('user_id', $user->id));
            return;
        }

        if ($user->role === User::ROLE_PARENT) {
            $query->whereHas('student', fn ($q) => $q->where('parent_user_id', $user->id));
            return;
        }

        $query->whereRaw('1=0');
    }

    protected function authorizeAccess(Request $request, Invoice $invoice, bool $requireWrite = false): void
    {
        $user = $request->user();

        if ($requireWrite && ! in_array($user->role, [User::ROLE_SCHOOL_ADMIN, User::ROLE_SUPER_ADMIN], true)) {
            abort(403, 'You do not have permission to modify this invoice.');
        }

        if (in_array($user->role, [User::ROLE_SUPER_ADMIN, User::ROLE_SCHOOL_ADMIN, User::ROLE_TEACHER], true)) {
            return;
        }

        $invoice->loadMissing('student:id,user_id,parent_user_id');
        $student = $invoice->student;

        if ($user->role === User::ROLE_STUDENT && $student?->user_id === $user->id) {
            return;
        }
        if ($user->role === User::ROLE_PARENT && $student?->parent_user_id === $user->id) {
            return;
        }

        abort(403, 'You cannot access this invoice.');
    }
}

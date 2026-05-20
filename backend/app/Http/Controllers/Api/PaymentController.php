<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['nullable', 'integer'],
            'student_id' => ['nullable', 'integer'],
            'method' => ['nullable', Rule::in(Payment::METHODS)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = Payment::query()
            ->with([
                'invoice:id,invoice_number,student_id,total_amount,amount_paid,balance,status',
                'invoice.student:id,user_id,admission_number',
                'invoice.student.user:id,name',
                'recorder:id,name',
            ])
            ->latest('paid_on')
            ->latest('id');

        $this->scopeForUser($query, $user);

        if (! empty($data['invoice_id'])) {
            $query->where('invoice_id', $data['invoice_id']);
        }
        if (! empty($data['student_id'])) {
            $query->whereHas('invoice', fn ($q) => $q->where('student_id', $data['student_id']));
        }
        if (! empty($data['method'])) {
            $query->where('method', $data['method']);
        }
        if (! empty($data['from'])) {
            $query->whereDate('paid_on', '>=', $data['from']);
        }
        if (! empty($data['to'])) {
            $query->whereDate('paid_on', '<=', $data['to']);
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

    /**
     * Record a payment against an invoice. Partial payments are allowed.
     * Triggers an invoice recalculation so balance/status stay in sync.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_on' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        /** @var Invoice $invoice */
        $invoice = Invoice::findOrFail($data['invoice_id']);

        if ($invoice->status === Invoice::STATUS_PAID) {
            return response()->json([
                'message' => 'This invoice is already fully paid.',
            ], 422);
        }

        $payment = DB::transaction(function () use ($invoice, $data, $request) {
            $payment = Payment::create([
                'tenant_id' => $invoice->tenant_id,
                'invoice_id' => $invoice->id,
                'amount' => $data['amount'],
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'paid_on' => $data['paid_on'],
                'recorded_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);

            $invoice->refresh()->recalculate();

            return $payment;
        });

        return response()->json([
            'data' => $payment->fresh(['recorder:id,name']),
            'invoice' => $invoice->fresh(['items.category', 'payments.recorder']),
        ], 201);
    }

    public function destroy(Request $request, Payment $payment): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, [User::ROLE_SCHOOL_ADMIN, User::ROLE_SUPER_ADMIN], true)) {
            abort(403, 'Only admins can void a payment.');
        }

        $invoice = $payment->invoice;

        DB::transaction(function () use ($payment, $invoice) {
            $payment->delete();
            $invoice?->refresh()->recalculate();
        });

        return response()->json(['message' => 'Payment removed.']);
    }

    protected function scopeForUser($query, User $user): void
    {
        if (in_array($user->role, [User::ROLE_SUPER_ADMIN, User::ROLE_SCHOOL_ADMIN, User::ROLE_TEACHER], true)) {
            return;
        }

        if ($user->role === User::ROLE_STUDENT) {
            $query->whereHas('invoice.student', fn ($q) => $q->where('user_id', $user->id));
            return;
        }

        if ($user->role === User::ROLE_PARENT) {
            $query->whereHas('invoice.student', fn ($q) => $q->where('parent_user_id', $user->id));
            return;
        }

        $query->whereRaw('1=0');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Result;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Term;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Role-aware dashboard summary.
     *
     * - school_admin / super_admin: school-wide KPIs, charts, recent activity
     * - teacher: own teaching workload + school-wide academic stats
     * - student / parent: own (or child's) outstanding fees and recent results
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $term = $this->currentTerm();
        $session = $term?->academicSession;

        $payload = [
            'role' => $user->role,
            'context' => [
                'session' => $session?->only(['id', 'name']),
                'term' => $term?->only(['id', 'name']),
            ],
        ];

        return response()->json(match ($user->role) {
            User::ROLE_STUDENT => $payload + $this->studentDashboard($user, $term),
            User::ROLE_PARENT  => $payload + $this->parentDashboard($user, $term),
            User::ROLE_TEACHER => $payload + $this->teacherDashboard($user, $term),
            default            => $payload + $this->adminDashboard($term),
        });
    }

    protected function adminDashboard(?Term $term): array
    {
        $studentsTotal = Student::query()->active()->count();
        $classesTotal = SchoolClass::query()->count();

        $base = $term
            ? Invoice::query()->where('term_id', $term->id)
            : Invoice::query();

        $expected = (float) (clone $base)->sum('total_amount');
        $collected = (float) (clone $base)->sum('amount_paid');
        $outstanding = max(0, round($expected - $collected, 2));
        $invoiceCount = (clone $base)->count();
        $defaulters = (clone $base)->where('balance', '>', 0)->count();

        $recentPayments = Payment::query()
            ->with([
                'invoice:id,invoice_number,student_id',
                'invoice.student:id,user_id,admission_number',
                'invoice.student.user:id,name',
            ])
            ->latest('paid_on')
            ->latest('id')
            ->limit(8)
            ->get(['id', 'tenant_id', 'invoice_id', 'amount', 'method', 'paid_on']);

        $recentAdmissions = Student::query()
            ->with(['user:id,name', 'enrollments.schoolClass:id,name', 'enrollments.arm:id,name'])
            ->latest('admitted_on')
            ->latest('id')
            ->limit(8)
            ->get(['id', 'tenant_id', 'user_id', 'admission_number', 'admitted_on', 'gender', 'status']);

        // Last 6 months of collections — simple bar series for the dashboard chart.
        $start = Carbon::now()->startOfMonth()->subMonths(5);
        $monthlyCollections = Payment::query()
            ->selectRaw("DATE_FORMAT(paid_on, '%Y-%m') AS month, SUM(amount) AS total")
            ->whereDate('paid_on', '>=', $start->toDateString())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $months = [];
        for ($i = 0; $i < 6; $i++) {
            $key = $start->copy()->addMonths($i)->format('Y-m');
            $label = $start->copy()->addMonths($i)->format('M');
            $months[] = [
                'label' => $label,
                'amount' => (float) ($monthlyCollections[$key]->total ?? 0),
            ];
        }

        // Students-per-class snapshot for an admin "class load" widget.
        $classBreakdown = SchoolClass::query()
            ->withCount(['enrollments as students_count'])
            ->orderBy('order')
            ->limit(8)
            ->get(['id', 'name'])
            ->map(fn ($c) => ['name' => $c->name, 'students' => $c->students_count]);

        return [
            'totals' => [
                'students' => $studentsTotal,
                'classes' => $classesTotal,
                'revenue' => round($collected, 2),
                'expected' => round($expected, 2),
                'pending' => $outstanding,
                'collection_rate' => $expected > 0 ? round(($collected / $expected) * 100, 1) : 0,
                'invoices' => $invoiceCount,
                'defaulters' => $defaulters,
            ],
            'monthly_collections' => $months,
            'class_breakdown' => $classBreakdown,
            'recent_payments' => $recentPayments,
            'recent_admissions' => $recentAdmissions,
        ];
    }

    protected function teacherDashboard(User $user, ?Term $term): array
    {
        $studentsTotal = Student::query()->active()->count();
        $classesTotal = SchoolClass::query()->count();

        // Results entered by this teacher in the current term, for the activity strip.
        $myResultsThisTerm = Result::query()
            ->when($term, fn ($q) => $q->where('term_id', $term->id))
            ->where('entered_by', $user->id)
            ->count();

        $resultsByStatus = Result::query()
            ->when($term, fn ($q) => $q->where('term_id', $term->id))
            ->where('entered_by', $user->id)
            ->selectRaw('status, COUNT(*) AS count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recentResults = Result::query()
            ->with([
                'student:id,user_id,admission_number',
                'student.user:id,name',
                'subject:id,code,name',
                'schoolClass:id,name',
            ])
            ->where('entered_by', $user->id)
            ->latest('updated_at')
            ->limit(8)
            ->get(['id', 'tenant_id', 'student_id', 'subject_id', 'school_class_id', 'total', 'grade', 'status', 'updated_at']);

        return [
            'totals' => [
                'students' => $studentsTotal,
                'classes' => $classesTotal,
                'my_results_term' => $myResultsThisTerm,
                'drafts' => (int) ($resultsByStatus['draft'] ?? 0),
                'submitted' => (int) ($resultsByStatus['submitted'] ?? 0),
                'approved' => (int) ($resultsByStatus['approved'] ?? 0),
            ],
            'recent_results' => $recentResults,
        ];
    }

    protected function studentDashboard(User $user, ?Term $term): array
    {
        $student = Student::query()->where('user_id', $user->id)->first();
        if (! $student) {
            return ['totals' => [], 'message' => 'Student profile not linked to this account yet.'];
        }
        return $this->personalDashboard($student, $term);
    }

    protected function parentDashboard(User $user, ?Term $term): array
    {
        $children = Student::query()
            ->with(['user:id,name', 'enrollments.schoolClass:id,name'])
            ->where('parent_user_id', $user->id)
            ->get();

        if ($children->isEmpty()) {
            return ['totals' => [], 'message' => 'No children linked to this parent account yet.'];
        }

        // For brevity show the first child's stats and the list of children.
        $primary = $children->first();
        $personal = $this->personalDashboard($primary, $term);

        $personal['children'] = $children->map(fn (Student $s) => [
            'id' => $s->id,
            'name' => $s->user?->name,
            'admission_number' => $s->admission_number,
            'class' => $s->enrollments->first()?->schoolClass?->name,
        ]);

        return $personal;
    }

    /**
     * Shared payload for student/parent: invoices, payment history, last results.
     */
    protected function personalDashboard(Student $student, ?Term $term): array
    {
        $base = Invoice::query()->where('student_id', $student->id);
        $totalBilled = (float) (clone $base)->sum('total_amount');
        $totalPaid = (float) (clone $base)->sum('amount_paid');
        $totalOutstanding = max(0, round($totalBilled - $totalPaid, 2));

        $currentTermInvoice = $term
            ? (clone $base)->where('term_id', $term->id)->first()
            : null;

        $recentPayments = Payment::query()
            ->with(['invoice:id,invoice_number,term_id', 'invoice.term:id,name'])
            ->whereIn('invoice_id', (clone $base)->pluck('id'))
            ->latest('paid_on')
            ->limit(6)
            ->get();

        $recentResults = Result::query()
            ->with(['subject:id,code,name', 'term:id,name'])
            ->where('student_id', $student->id)
            ->where('status', Result::STATUS_APPROVED)
            ->latest('updated_at')
            ->limit(6)
            ->get(['id', 'student_id', 'subject_id', 'term_id', 'ca1', 'ca2', 'midterm', 'exam', 'total', 'grade', 'status', 'updated_at']);

        return [
            'totals' => [
                'student_id' => $student->id,
                'student_name' => $student->user?->name,
                'admission_number' => $student->admission_number,
                'billed' => round($totalBilled, 2),
                'paid' => round($totalPaid, 2),
                'outstanding' => $totalOutstanding,
            ],
            'current_invoice' => $currentTermInvoice,
            'recent_payments' => $recentPayments,
            'recent_results' => $recentResults,
        ];
    }

    protected function currentTerm(): ?Term
    {
        return Term::query()
            ->with('academicSession:id,name')
            ->where('is_current', true)
            ->first()
            ?? Term::query()->with('academicSession:id,name')->latest('id')->first();
    }
}

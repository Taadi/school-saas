<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PlatformAdminController extends Controller
{
    /**
     * Cross-tenant KPIs for the landlord dashboard.
     */
    public function overview(): JsonResponse
    {
        $schoolsTotal = School::query()->count();
        $schoolsActive = School::query()->where('subscription_status', 'active')->count();
        $schoolsTrial = School::query()->where('subscription_status', 'trial')->count();
        $schoolsSuspended = School::query()->where('subscription_status', 'suspended')->count();

        $studentsTotal = Student::query()->withoutGlobalScopes()->count();
        $teachersTotal = User::query()->withoutGlobalScopes()->where('role', User::ROLE_TEACHER)->count();

        $since = Carbon::now()->subDays(30)->startOfDay();
        $paymentsLast30 = Payment::query()->withoutGlobalScopes()
            ->whereDate('paid_on', '>=', $since->toDateString())
            ->sum('amount');

        $recentSchools = School::query()
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'slug', 'subscription_status', 'created_at']);

        $monthStart = Carbon::now()->startOfMonth()->subMonths(5);
        $signupsByMonth = School::query()
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count")
            ->whereDate('created_at', '>=', $monthStart->toDateString())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $months = [];
        for ($i = 0; $i < 6; $i++) {
            $key = $monthStart->copy()->addMonths($i)->format('Y-m');
            $label = $monthStart->copy()->addMonths($i)->format('M');
            $months[] = [
                'label' => $label,
                'schools' => (int) ($signupsByMonth[$key]->count ?? 0),
            ];
        }

        return response()->json([
            'totals' => [
                'schools' => $schoolsTotal,
                'schools_active' => $schoolsActive,
                'schools_trial' => $schoolsTrial,
                'schools_suspended' => $schoolsSuspended,
                'students' => $studentsTotal,
                'teachers' => $teachersTotal,
                'payments_last_30_days' => round((float) $paymentsLast30, 2),
            ],
            'school_signups_by_month' => $months,
            'recent_schools' => $recentSchools,
        ]);
    }
}

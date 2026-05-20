<?php

use App\Models\AssessmentComponent;
use App\Models\AssessmentScheme;
use App\Models\GradingBand;
use App\Models\GradingScale;
use App\Models\ReportSetting;
use App\Models\School;
use App\Services\ReportSettingsService;
use App\Support\TenantContext;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill: every existing school gets a default Nigerian grading scale,
     * an "Standard CA + Exam" assessment scheme, and a baseline
     * `report_settings` row so the College Report screens render immediately
     * after deploy without manual setup.
     */
    public function up(): void
    {
        $tenantContext = app(TenantContext::class);

        DB::transaction(function () use ($tenantContext) {
            School::query()->withTrashed()->chunk(100, function ($schools) use ($tenantContext) {
                foreach ($schools as $school) {
                    $tenantContext->set($school->id);
                    try {
                        $this->seedScale($school->id);
                        $this->seedScheme($school->id);
                        $this->seedSettings($school->id);
                    } finally {
                        $tenantContext->clear();
                    }
                }
            });
        });
    }

    public function down(): void
    {
        // Forward-only seed — nothing to undo. The parent migrations drop the
        // tables wholesale.
    }

    protected function seedScale(int $tenantId): void
    {
        if (GradingScale::where('tenant_id', $tenantId)->exists()) {
            return;
        }

        $scale = GradingScale::create([
            'tenant_id' => $tenantId,
            'name' => 'Default Nigerian Scale',
            'description' => 'Auto-seeded WAEC-style grading.',
            'is_default' => true,
        ]);

        $bands = [
            ['min' => 70, 'max' => 100, 'grade' => 'A', 'point' => 5, 'remark' => 'Excellent'],
            ['min' => 60, 'max' => 69.99, 'grade' => 'B', 'point' => 4, 'remark' => 'Very Good'],
            ['min' => 50, 'max' => 59.99, 'grade' => 'C', 'point' => 3, 'remark' => 'Good'],
            ['min' => 45, 'max' => 49.99, 'grade' => 'D', 'point' => 2, 'remark' => 'Pass'],
            ['min' => 40, 'max' => 44.99, 'grade' => 'E', 'point' => 1, 'remark' => 'Fair'],
            ['min' => 0,  'max' => 39.99, 'grade' => 'F', 'point' => 0, 'remark' => 'Fail'],
        ];

        foreach ($bands as $i => $b) {
            GradingBand::create([
                'tenant_id' => $tenantId,
                'grading_scale_id' => $scale->id,
                'min_score' => $b['min'],
                'max_score' => $b['max'],
                'grade' => $b['grade'],
                'grade_point' => $b['point'],
                'remark' => $b['remark'],
                'sort_order' => $i,
            ]);
        }
    }

    protected function seedScheme(int $tenantId): void
    {
        if (AssessmentScheme::where('tenant_id', $tenantId)->exists()) {
            return;
        }

        $scaleId = GradingScale::where('tenant_id', $tenantId)
            ->where('is_default', true)
            ->value('id');

        $scheme = AssessmentScheme::create([
            'tenant_id' => $tenantId,
            'name' => 'Standard CA + Exam',
            'description' => 'Auto-seeded scheme: CA1 + CA2 + Mid-term + Exam = 100.',
            'grading_scale_id' => $scaleId,
            'total_max' => 100,
            'is_default' => true,
            'is_active' => true,
        ]);

        $components = [
            ['code' => 'ca1', 'label' => 'CA 1', 'max' => 10, 'is_exam' => false],
            ['code' => 'ca2', 'label' => 'CA 2', 'max' => 10, 'is_exam' => false],
            ['code' => 'midterm', 'label' => 'Mid-term', 'max' => 10, 'is_exam' => false],
            ['code' => 'exam', 'label' => 'Exam', 'max' => 70, 'is_exam' => true],
        ];

        foreach ($components as $i => $c) {
            AssessmentComponent::create([
                'tenant_id' => $tenantId,
                'assessment_scheme_id' => $scheme->id,
                'code' => $c['code'],
                'label' => $c['label'],
                'max_score' => $c['max'],
                'weight' => 1,
                'is_exam' => $c['is_exam'],
                'sort_order' => $i,
            ]);
        }
    }

    protected function seedSettings(int $tenantId): void
    {
        if (ReportSetting::where('tenant_id', $tenantId)->exists()) {
            return;
        }

        ReportSetting::create([
            'tenant_id' => $tenantId,
            'data' => app(ReportSettingsService::class)->defaults(),
        ]);
    }
};

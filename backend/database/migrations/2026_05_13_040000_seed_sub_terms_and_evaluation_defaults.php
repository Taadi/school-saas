<?php

use App\Models\AcademicSession;
use App\Models\AssessmentComponent;
use App\Models\AssessmentScheme;
use App\Models\EvaluationItem;
use App\Models\EvaluationRubric;
use App\Models\GradingScale;
use App\Models\School;
use App\Models\SubTerm;
use App\Models\Term;
use App\Support\TenantContext;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ctx = app(TenantContext::class);

        DB::transaction(function () use ($ctx) {
            School::query()->withTrashed()->chunk(50, function ($schools) use ($ctx) {
                foreach ($schools as $school) {
                    $ctx->set($school->id);
                    try {
                        $this->seedSubTermsForSchool($school->id);
                        $this->seedMidtermScheme($school->id);
                        $this->seedWeeklyRubric($school->id);
                    } finally {
                        $ctx->clear();
                    }
                }
            });
        });
    }

    public function down(): void
    {
        // Forward-only seed.
    }

    protected function seedSubTermsForSchool(int $tenantId): void
    {
        Term::query()->each(function (Term $term) use ($tenantId) {
            if (SubTerm::where('term_id', $term->id)->where('kind', 'midterm')->exists()) {
                return;
            }
            SubTerm::create([
                'tenant_id' => $tenantId,
                'term_id' => $term->id,
                'name' => 'Mid-term',
                'kind' => 'midterm',
                'ordinal' => 1,
                'is_active' => true,
            ]);
        });
    }

    protected function seedMidtermScheme(int $tenantId): void
    {
        $scaleId = GradingScale::where('tenant_id', $tenantId)->where('is_default', true)->value('id');
        if (! $scaleId) {
            return;
        }

        Term::query()->each(function (Term $term) use ($tenantId, $scaleId) {
            $subTerm = SubTerm::where('term_id', $term->id)->where('kind', 'midterm')->first();
            if (! $subTerm) {
                return;
            }
            if (AssessmentScheme::where('sub_term_id', $subTerm->id)->exists()) {
                return;
            }

            $schemeName = 'Mid-term — '.ucfirst($term->name)." ({$term->id})";

            if (AssessmentScheme::where('tenant_id', $tenantId)->where('name', $schemeName)->exists()) {
                return;
            }

            $scheme = AssessmentScheme::create([
                'tenant_id' => $tenantId,
                'name' => $schemeName,
                'description' => 'CA1 + CA2 for mid-term progress report (30 marks).',
                'academic_session_id' => $term->academic_session_id,
                'term_id' => $term->id,
                'sub_term_id' => $subTerm->id,
                'applies_to' => 'sub_term',
                'grading_scale_id' => $scaleId,
                'total_max' => 20,
                'is_default' => false,
                'is_active' => true,
            ]);

            foreach (
                [
                    ['code' => 'ca1', 'label' => 'CA 1', 'max' => 10],
                    ['code' => 'ca2', 'label' => 'CA 2', 'max' => 10],
                ] as $i => $c
            ) {
                AssessmentComponent::create([
                    'tenant_id' => $tenantId,
                    'assessment_scheme_id' => $scheme->id,
                    'code' => $c['code'],
                    'label' => $c['label'],
                    'max_score' => $c['max'],
                    'weight' => 1,
                    'is_exam' => false,
                    'sort_order' => $i,
                ]);
            }
        });
    }

    protected function seedWeeklyRubric(int $tenantId): void
    {
        if (EvaluationRubric::where('tenant_id', $tenantId)->where('is_default', true)->exists()) {
            return;
        }

        $rubric = EvaluationRubric::create([
            'tenant_id' => $tenantId,
            'name' => 'Weekly Behaviour & Homework',
            'description' => 'Form teacher weekly check-in: homework, conduct, punctuality.',
            'cadence' => 'weekly',
            'scope' => 'per_student',
            'target_role' => 'form_teacher',
            'is_active' => true,
            'is_default' => true,
        ]);

        $items = [
            ['code' => 'homework_done', 'label' => 'All assignments completed?', 'type' => 'yes_no', 'weight' => 2],
            ['code' => 'punctuality', 'label' => 'Punctuality', 'type' => 'scale_1_10', 'weight' => 1],
            ['code' => 'conduct', 'label' => 'Conduct in class', 'type' => 'scale_1_10', 'weight' => 1],
            ['code' => 'neatness', 'label' => 'Neatness & appearance', 'type' => 'scale_1_10', 'weight' => 1],
            ['code' => 'participation', 'label' => 'Class participation', 'type' => 'scale_1_10', 'weight' => 1],
        ];

        foreach ($items as $i => $item) {
            EvaluationItem::create([
                'tenant_id' => $tenantId,
                'evaluation_rubric_id' => $rubric->id,
                'code' => $item['code'],
                'label' => $item['label'],
                'type' => $item['type'],
                'weight' => $item['weight'],
                'sort_order' => $i,
            ]);
        }
    }
};

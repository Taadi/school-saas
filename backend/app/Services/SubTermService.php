<?php

namespace App\Services;

use App\Models\AssessmentComponent;
use App\Models\AssessmentScheme;
use App\Models\GradingScale;
use App\Models\SubTerm;
use App\Models\Term;

class SubTermService
{
    /**
     * Ensure a term has a default Mid-term sub-period and matching scheme.
     */
    public function seedForTerm(Term $term): SubTerm
    {
        $subTerm = SubTerm::firstOrCreate(
            [
                'term_id' => $term->id,
                'kind' => SubTerm::KIND_MIDTERM,
            ],
            [
                'tenant_id' => $term->tenant_id,
                'name' => 'Mid-term',
                'ordinal' => 1,
                'is_active' => true,
            ],
        );

        $this->seedMidtermSchemeIfMissing($term, $subTerm);

        return $subTerm;
    }

    protected function seedMidtermSchemeIfMissing(Term $term, SubTerm $subTerm): void
    {
        if (AssessmentScheme::where('sub_term_id', $subTerm->id)->exists()) {
            return;
        }

        $scaleId = GradingScale::where('tenant_id', $term->tenant_id)
            ->where('is_default', true)
            ->value('id');

        $scheme = AssessmentScheme::create([
            'tenant_id' => $term->tenant_id,
            'name' => 'Mid-term Assessment',
            'description' => 'CA1 + CA2 for mid-term progress report.',
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
                'tenant_id' => $term->tenant_id,
                'assessment_scheme_id' => $scheme->id,
                'code' => $c['code'],
                'label' => $c['label'],
                'max_score' => $c['max'],
                'weight' => 1,
                'is_exam' => false,
                'sort_order' => $i,
            ]);
        }
    }
}

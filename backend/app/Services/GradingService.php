<?php

namespace App\Services;

use App\Models\AssessmentScheme;
use App\Models\GradingBand;
use App\Models\GradingScale;

/**
 * Computes total + grade for a result given its dynamic component scores.
 *
 * Resolution order:
 *  1. Use the explicitly stamped scheme/scale on the result row.
 *  2. Fall back to the tenant's default scheme/scale.
 *  3. Final fallback to the hardcoded Nigerian scale below — only fires when
 *     a tenant has been wiped of all settings (shouldn't happen in normal
 *     operation thanks to the seed migration).
 */
class GradingService
{
    /** Hardcoded WAEC fallback used only when no scale is configured. */
    public const FALLBACK_SCALE = [
        ['min' => 70, 'grade' => 'A', 'remark' => 'Excellent'],
        ['min' => 60, 'grade' => 'B', 'remark' => 'Very Good'],
        ['min' => 50, 'grade' => 'C', 'remark' => 'Good'],
        ['min' => 45, 'grade' => 'D', 'remark' => 'Pass'],
        ['min' => 40, 'grade' => 'E', 'remark' => 'Fair'],
        ['min' => 0,  'grade' => 'F', 'remark' => 'Fail'],
    ];

    /**
     * @param  array<string, float|int|null>  $scores  Component code → score
     * @return array{total: float, grade: string, remark: string, scheme_id: ?int, scale_id: ?int}
     */
    public function compute(
        array $scores,
        ?int $schemeId = null,
        ?int $scaleId = null,
        ?int $tenantId = null,
    ): array {
        $scheme = $this->resolveScheme($schemeId, $tenantId);
        $total = $this->computeTotal($scores, $scheme);

        $scale = $this->resolveScale($scaleId, $scheme, $tenantId);
        $band = $this->bandFor($total, $scale);

        return [
            'total' => $total,
            'grade' => $band['grade'],
            'remark' => $band['remark'],
            'scheme_id' => $scheme?->id,
            'scale_id' => $scale?->id,
        ];
    }

    /**
     * Sum components, applying weights from the scheme. If no scheme is given
     * (e.g. tenant has none yet), fall back to plain sum of legacy columns.
     */
    public function computeTotal(array $scores, ?AssessmentScheme $scheme = null): float
    {
        if ($scheme && $scheme->relationLoaded('components') === false) {
            $scheme->load('components');
        }

        if (! $scheme) {
            return round((float) array_sum(array_map(
                fn ($v) => (float) ($v ?? 0),
                array_values($scores),
            )), 2);
        }

        $sum = 0.0;
        foreach ($scheme->components as $component) {
            $value = $scores[$component->code] ?? null;
            if ($value === null) {
                continue;
            }
            $sum += ((float) $value) * (float) ($component->weight ?: 1);
        }

        return round($sum, 2);
    }

    public function bandFor(float $total, ?GradingScale $scale): array
    {
        $value = max(0.0, $total);

        if ($scale) {
            if ($scale->relationLoaded('bands') === false) {
                $scale->load('bands');
            }
            $band = $scale->bands
                ->first(fn (GradingBand $b) => $value >= (float) $b->min_score && $value <= (float) $b->max_score);
            if ($band) {
                return ['grade' => $band->grade, 'remark' => $band->remark ?: ''];
            }
        }

        foreach (self::FALLBACK_SCALE as $row) {
            if ($value >= $row['min']) {
                return ['grade' => $row['grade'], 'remark' => $row['remark']];
            }
        }
        return ['grade' => 'F', 'remark' => 'Fail'];
    }

    public function resolveScheme(?int $schemeId, ?int $tenantId): ?AssessmentScheme
    {
        if ($schemeId) {
            return AssessmentScheme::with('components')->find($schemeId);
        }
        if (! $tenantId) {
            return null;
        }
        return AssessmentScheme::with('components')
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();
    }

    public function resolveScale(
        ?int $scaleId,
        ?AssessmentScheme $scheme,
        ?int $tenantId,
    ): ?GradingScale {
        if ($scaleId) {
            return GradingScale::with('bands')->find($scaleId);
        }
        if ($scheme?->grading_scale_id) {
            return GradingScale::with('bands')->find($scheme->grading_scale_id);
        }
        if (! $tenantId) {
            return null;
        }
        return GradingScale::with('bands')
            ->where('tenant_id', $tenantId)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Human ordinal for class positions on the report card (1st, 2nd, …).
     */
    public function ordinal(int $n): string
    {
        $mod100 = $n % 100;
        if ($mod100 >= 11 && $mod100 <= 13) {
            return $n.'th';
        }
        return match ($n % 10) {
            1 => $n.'st',
            2 => $n.'nd',
            3 => $n.'rd',
            default => $n.'th',
        };
    }
}

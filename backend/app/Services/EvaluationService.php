<?php

namespace App\Services;

use App\Models\EvaluationItem;
use App\Models\EvaluationRubric;

/**
 * Normalizes heterogeneous rubric answers into a 0–100 weighted score.
 */
class EvaluationService
{
    /**
     * @param  array<string, mixed>  $answers  keyed by item `code`
     * @return array{overall_score: ?float, items: array<string, array{value_numeric: ?float, value_text: ?string}>}
     */
    public function normalizeAnswers(EvaluationRubric $rubric, array $answers): array
    {
        if ($rubric->relationLoaded('items') === false) {
            $rubric->load('items');
        }

        $normalized = [];
        $weightedSum = 0.0;
        $weightTotal = 0.0;

        foreach ($rubric->items as $item) {
            if (! array_key_exists($item->code, $answers)) {
                continue;
            }
            $raw = $answers[$item->code];
            $parsed = $this->parseAnswer($item, $raw);
            $normalized[$item->code] = $parsed;

            if ($parsed['value_numeric'] !== null) {
                $pct = $this->percentForItem($item, (float) $parsed['value_numeric']);
                $w = (float) ($item->weight ?: 1);
                $weightedSum += $pct * $w;
                $weightTotal += $w;
            }
        }

        $overall = $weightTotal > 0
            ? round($weightedSum / $weightTotal, 2)
            : null;

        return [
            'overall_score' => $overall,
            'items' => $normalized,
        ];
    }

    /**
     * @return array{value_numeric: ?float, value_text: ?string}
     */
    public function parseAnswer(EvaluationItem $item, mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return ['value_numeric' => null, 'value_text' => null];
        }

        return match ($item->type) {
            'yes_no' => [
                'value_numeric' => filter_var($raw, FILTER_VALIDATE_BOOLEAN) || $raw === 1 || $raw === '1' ? 1.0 : 0.0,
                'value_text' => null,
            ],
            'scale_1_5', 'scale_1_10' => [
                'value_numeric' => (float) $raw,
                'value_text' => null,
            ],
            'choice' => [
                'value_numeric' => null,
                'value_text' => (string) $raw,
            ],
            default => [
                'value_numeric' => null,
                'value_text' => (string) $raw,
            ],
        };
    }

    protected function percentForItem(EvaluationItem $item, float $value): float
    {
        return match ($item->type) {
            'yes_no' => $value >= 1 ? 100.0 : 0.0,
            'scale_1_5' => min(100, max(0, ($value / 5) * 100)),
            'scale_1_10' => min(100, max(0, ($value / 10) * 100)),
            default => 0.0,
        };
    }
}

<?php

namespace App\Services;

use App\Models\ReportSetting;
use App\Support\TenantContext;

/**
 * Read/write helper for the per-tenant `report_settings.data` JSON blob.
 *
 * Always merges the persisted data over `defaults()` so:
 *   1. the UI never sees `null` for a known field;
 *   2. adding a new setting key in code does not require a backfill migration.
 *
 * Any update goes through `update()` which deep-merges the patch into the
 * existing data and rewrites the row. Top-level keys are replaced wholesale
 * (so e.g. updating `non_assessment.categories` replaces the whole list,
 * never appends).
 */
class ReportSettingsService
{
    public function __construct(protected TenantContext $tenantContext) {}

    public function defaults(): array
    {
        return [
            // Tab 4 — Result default comments
            'result_comments' => [
                ['min' => 70, 'max' => 100, 'comments' => ['Excellent performance — keep it up!', 'Outstanding effort.']],
                ['min' => 60, 'max' => 69,  'comments' => ['Very good result.', 'Strong showing this term.']],
                ['min' => 50, 'max' => 59,  'comments' => ['Good — but there is room to push higher.']],
                ['min' => 45, 'max' => 49,  'comments' => ['A pass; aim for higher next term.']],
                ['min' => 40, 'max' => 44,  'comments' => ['Fair effort. Needs more focus.']],
                ['min' => 0,  'max' => 39,  'comments' => ['Below expectations. Extra study and parental support required.']],
            ],

            // Tab 5 — Non-assessment rating categories + scale
            'non_assessment' => [
                'categories' => [
                    ['code' => 'conduct', 'label' => 'Conduct'],
                    ['code' => 'neatness', 'label' => 'Neatness'],
                    ['code' => 'punctuality', 'label' => 'Punctuality'],
                    ['code' => 'leadership', 'label' => 'Leadership'],
                    ['code' => 'attentiveness', 'label' => 'Attentiveness'],
                    ['code' => 'cooperation', 'label' => 'Cooperation'],
                ],
                'scale' => [
                    ['code' => 'A', 'label' => 'Excellent'],
                    ['code' => 'B', 'label' => 'Very Good'],
                    ['code' => 'C', 'label' => 'Good'],
                    ['code' => 'D', 'label' => 'Fair'],
                    ['code' => 'E', 'label' => 'Poor'],
                ],
            ],

            // Tab 6 — Default comments for the form-teacher and head-teacher
            'non_assessment_comments' => [
                'form_teacher' => [
                    'A diligent and well-behaved student.',
                    'Has shown improvement this term.',
                    'Needs to take studies more seriously.',
                ],
                'head_teacher' => [
                    'Keep up the good work.',
                    'A promising student.',
                    'Effort required in the coming term.',
                ],
            ],

            // Tab 8 — Attendance setup
            'attendance' => [
                'enabled' => true,
                'method' => 'days_present_over_total',
                'show_percentage' => true,
            ],

            // Tab 9 — Branding / motto / sponsor
            'branding' => [
                'motto' => null,
                'seal_url' => null,
                'sponsor_name' => null,
                'proprietor_name' => null,
                'principal_name' => null,
                'signature_url' => null,
            ],

            // Tab 11 — Result presentation
            'presentation' => [
                'layout' => 'classic',
                'show_position' => true,
                'show_class_average' => true,
                'show_class_highest' => true,
                'show_class_lowest' => false,
                'show_grade_legend' => true,
                'show_subject_grouping' => true,
                'show_attendance' => true,
                'show_non_assessment' => true,
                'show_signatures' => true,
            ],

            // Tab 12 — Cumulative rules
            'cumulative' => [
                'mode' => 'per_term',
                'weights' => ['first' => 1, 'second' => 1, 'third' => 1],
                'pass_mark' => 40,
            ],
        ];
    }

    public function get(?int $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return $this->defaults();
        }

        $row = ReportSetting::where('tenant_id', $tenantId)->first();
        $stored = $row?->data ?? [];

        return $this->deepMerge($this->defaults(), $stored);
    }

    /**
     * Patch top-level sections. Each provided key fully replaces the matching
     * top-level entry so callers can manage entire arrays (categories, scales,
     * comment banks) without partial-update ambiguity.
     */
    public function update(array $patch, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        abort_if($tenantId === null, 422, 'No tenant context to update report settings.');

        /** @var ReportSetting $row */
        $row = ReportSetting::firstOrCreate(
            ['tenant_id' => $tenantId],
            ['data' => $this->defaults()],
        );

        $data = $row->data ?? [];
        foreach ($patch as $key => $value) {
            $data[$key] = $value;
        }
        $row->update(['data' => $data]);

        return $this->get($tenantId);
    }

    protected function deepMerge(array $defaults, array $overrides): array
    {
        foreach ($overrides as $key => $value) {
            if (
                is_array($value)
                && isset($defaults[$key])
                && is_array($defaults[$key])
                && ! array_is_list($defaults[$key])
                && ! array_is_list($value)
            ) {
                $defaults[$key] = $this->deepMerge($defaults[$key], $value);
            } else {
                $defaults[$key] = $value;
            }
        }
        return $defaults;
    }
}

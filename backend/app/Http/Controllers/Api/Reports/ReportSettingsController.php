<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Services\ReportSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read/write the per-tenant report-card settings JSON. The validator only
 * shape-checks each section; the service merges patches into the singleton.
 */
class ReportSettingsController extends Controller
{
    public function __construct(protected ReportSettingsService $service) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->service->get()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'result_comments' => ['sometimes', 'array'],
            'result_comments.*.min' => ['required', 'numeric', 'min:0', 'max:1000'],
            'result_comments.*.max' => ['required', 'numeric', 'gte:result_comments.*.min', 'max:1000'],
            'result_comments.*.comments' => ['required', 'array'],
            'result_comments.*.comments.*' => ['string', 'max:500'],

            'non_assessment' => ['sometimes', 'array'],
            'non_assessment.categories' => ['sometimes', 'array'],
            'non_assessment.categories.*.code' => ['required', 'string', 'max:32', 'regex:/^[a-z0-9_]+$/'],
            'non_assessment.categories.*.label' => ['required', 'string', 'max:100'],
            'non_assessment.scale' => ['sometimes', 'array'],
            'non_assessment.scale.*.code' => ['required', 'string', 'max:8'],
            'non_assessment.scale.*.label' => ['required', 'string', 'max:50'],

            'non_assessment_comments' => ['sometimes', 'array'],
            'non_assessment_comments.form_teacher' => ['sometimes', 'array'],
            'non_assessment_comments.form_teacher.*' => ['string', 'max:500'],
            'non_assessment_comments.head_teacher' => ['sometimes', 'array'],
            'non_assessment_comments.head_teacher.*' => ['string', 'max:500'],

            'attendance' => ['sometimes', 'array'],
            'attendance.enabled' => ['sometimes', 'boolean'],
            'attendance.method' => ['sometimes', 'string', 'in:days_present_over_total,manual'],
            'attendance.show_percentage' => ['sometimes', 'boolean'],

            'branding' => ['sometimes', 'array'],
            'branding.motto' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branding.seal_url' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'branding.sponsor_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branding.proprietor_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branding.principal_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'branding.signature_url' => ['sometimes', 'nullable', 'string', 'max:1000'],

            'presentation' => ['sometimes', 'array'],
            'presentation.layout' => ['sometimes', 'string', 'in:classic,modern,compact'],
            'presentation.show_position' => ['sometimes', 'boolean'],
            'presentation.show_class_average' => ['sometimes', 'boolean'],
            'presentation.show_class_highest' => ['sometimes', 'boolean'],
            'presentation.show_class_lowest' => ['sometimes', 'boolean'],
            'presentation.show_grade_legend' => ['sometimes', 'boolean'],
            'presentation.show_subject_grouping' => ['sometimes', 'boolean'],
            'presentation.show_attendance' => ['sometimes', 'boolean'],
            'presentation.show_non_assessment' => ['sometimes', 'boolean'],
            'presentation.show_signatures' => ['sometimes', 'boolean'],

            'cumulative' => ['sometimes', 'array'],
            'cumulative.mode' => ['sometimes', 'string', 'in:per_term,cumulative_average,weighted_average'],
            'cumulative.weights' => ['sometimes', 'array'],
            'cumulative.weights.first' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'cumulative.weights.second' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'cumulative.weights.third' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'cumulative.pass_mark' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        return response()->json(['data' => $this->service->update($data)]);
    }

    /**
     * Upload a branding asset (seal or signature). Returns the stored URL so
     * the caller can persist it via `update()` in the relevant `branding.*` key.
     */
    public function uploadBrandingAsset(Request $request): JsonResponse
    {
        $request->validate([
            'kind' => ['required', 'in:seal,signature'],
            'file' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'],
        ]);

        $tenantId = $request->user()->tenant_id ?? app(\App\Support\TenantContext::class)->id();
        $path = $request->file('file')->store(
            "tenants/{$tenantId}/report/branding",
            'public',
        );
        $url = asset("storage/{$path}");

        $key = $request->input('kind') === 'seal' ? 'seal_url' : 'signature_url';
        $current = $this->service->get();
        $branding = array_merge($current['branding'] ?? [], [$key => $url]);
        $this->service->update(['branding' => $branding]);

        return response()->json([
            'url' => $url,
            'data' => $this->service->get(),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\AssessmentComponent;
use App\Models\AssessmentScheme;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AssessmentSchemeController extends Controller
{
    public function index(): JsonResponse
    {
        $schemes = AssessmentScheme::with(['components', 'gradingScale:id,name', 'academicSession:id,name', 'term:id,name'])
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $schemes]);
    }

    public function show(AssessmentScheme $scheme): JsonResponse
    {
        return response()->json([
            'data' => $scheme->load(['components', 'gradingScale.bands']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, null, true);

        return DB::transaction(function () use ($data) {
            if (! empty($data['is_default'])) {
                AssessmentScheme::query()->update(['is_default' => false]);
            }

            $scheme = AssessmentScheme::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'academic_session_id' => $data['academic_session_id'] ?? null,
                'term_id' => $data['term_id'] ?? null,
                'applies_to' => $data['applies_to'] ?? 'term',
                'sub_term_id' => $data['sub_term_id'] ?? null,
                'grading_scale_id' => $data['grading_scale_id'] ?? null,
                'total_max' => 0,
                'is_default' => $data['is_default'] ?? false,
                'is_active' => $data['is_active'] ?? true,
            ]);

            $this->syncComponents($scheme, $data['components'] ?? []);

            return response()->json([
                'data' => $scheme->fresh(['components', 'gradingScale']),
            ], 201);
        });
    }

    public function update(Request $request, AssessmentScheme $scheme): JsonResponse
    {
        $data = $this->validatePayload($request, $scheme->id, false);

        DB::transaction(function () use ($data, $scheme) {
            if (! empty($data['is_default'])) {
                AssessmentScheme::where('id', '!=', $scheme->id)
                    ->update(['is_default' => false]);
            }

            $scheme->update([
                'name' => $data['name'] ?? $scheme->name,
                'description' => $data['description'] ?? $scheme->description,
                'academic_session_id' => array_key_exists('academic_session_id', $data)
                    ? $data['academic_session_id']
                    : $scheme->academic_session_id,
                'term_id' => array_key_exists('term_id', $data)
                    ? $data['term_id']
                    : $scheme->term_id,
                'applies_to' => $data['applies_to'] ?? $scheme->applies_to,
                'sub_term_id' => array_key_exists('sub_term_id', $data)
                    ? $data['sub_term_id']
                    : $scheme->sub_term_id,
                'grading_scale_id' => array_key_exists('grading_scale_id', $data)
                    ? $data['grading_scale_id']
                    : $scheme->grading_scale_id,
                'is_default' => $data['is_default'] ?? $scheme->is_default,
                'is_active' => $data['is_active'] ?? $scheme->is_active,
            ]);

            if (array_key_exists('components', $data)) {
                $this->syncComponents($scheme, $data['components']);
            }
        });

        return response()->json([
            'data' => $scheme->fresh(['components', 'gradingScale']),
        ]);
    }

    public function destroy(AssessmentScheme $scheme): JsonResponse
    {
        if ($scheme->is_default) {
            return response()->json([
                'message' => 'Mark another scheme as default before deleting this one.',
            ], 422);
        }
        $scheme->delete();
        return response()->json(['message' => 'Assessment scheme deleted.']);
    }

    public function setDefault(AssessmentScheme $scheme): JsonResponse
    {
        DB::transaction(function () use ($scheme) {
            AssessmentScheme::query()->update(['is_default' => false]);
            $scheme->update(['is_default' => true, 'is_active' => true]);
        });
        return response()->json(['data' => $scheme->fresh(['components'])]);
    }

    protected function validatePayload(Request $request, ?int $ignoreId = null, bool $creating = false): array
    {
        $tenantId = app(TenantContext::class)->id() ?? $request->user()->tenant_id;

        return $request->validate([
            'name' => [
                $creating ? 'required' : 'sometimes',
                'string',
                'max:100',
                Rule::unique('assessment_schemes', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($ignoreId),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'academic_session_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('academic_sessions', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'term_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('terms', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'applies_to' => ['sometimes', Rule::in(['term', 'sub_term'])],
            'sub_term_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('sub_terms', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'grading_scale_id' => ['sometimes', 'nullable', 'integer',
                Rule::exists('grading_scales', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],

            'components' => ['sometimes', 'array', 'min:1'],
            'components.*.code' => ['required_with:components', 'string', 'max:32', 'regex:/^[a-z0-9_]+$/'],
            'components.*.label' => ['required_with:components', 'string', 'max:100'],
            'components.*.max_score' => ['required_with:components', 'numeric', 'min:0.01', 'max:1000'],
            'components.*.weight' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'components.*.is_exam' => ['nullable', 'boolean'],
        ]);
    }

    protected function syncComponents(AssessmentScheme $scheme, array $components): void
    {
        // Bail if duplicate codes within payload
        $codes = collect($components)->pluck('code');
        abort_if(
            $codes->count() !== $codes->unique()->count(),
            422,
            'Component codes must be unique within a scheme.',
        );

        $scheme->components()->delete();
        foreach (array_values($components) as $i => $c) {
            AssessmentComponent::create([
                'tenant_id' => $scheme->tenant_id,
                'assessment_scheme_id' => $scheme->id,
                'code' => $c['code'],
                'label' => $c['label'],
                'max_score' => $c['max_score'],
                'weight' => $c['weight'] ?? 1,
                'is_exam' => $c['is_exam'] ?? false,
                'sort_order' => $i,
            ]);
        }

        $scheme->refresh()->recalculateTotalMax();
    }
}

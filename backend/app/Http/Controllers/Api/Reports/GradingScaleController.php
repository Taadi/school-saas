<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\GradingBand;
use App\Models\GradingScale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GradingScaleController extends Controller
{
    public function index(): JsonResponse
    {
        $scales = GradingScale::with('bands')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $scales]);
    }

    public function show(GradingScale $scale): JsonResponse
    {
        return response()->json(['data' => $scale->load('bands')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, null, true);

        return DB::transaction(function () use ($data) {
            if (! empty($data['is_default'])) {
                GradingScale::query()->update(['is_default' => false]);
            }

            $scale = GradingScale::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_default' => $data['is_default'] ?? false,
            ]);

            $this->syncBands($scale, $data['bands'] ?? []);

            return response()->json(['data' => $scale->load('bands')], 201);
        });
    }

    public function update(Request $request, GradingScale $scale): JsonResponse
    {
        $data = $this->validatePayload($request, $scale->id, false);

        DB::transaction(function () use ($data, $scale) {
            if (! empty($data['is_default'])) {
                GradingScale::where('id', '!=', $scale->id)
                    ->update(['is_default' => false]);
            }
            $scale->update([
                'name' => $data['name'] ?? $scale->name,
                'description' => $data['description'] ?? $scale->description,
                'is_default' => $data['is_default'] ?? $scale->is_default,
            ]);

            if (array_key_exists('bands', $data)) {
                $this->syncBands($scale, $data['bands']);
            }
        });

        return response()->json(['data' => $scale->fresh('bands')]);
    }

    public function destroy(GradingScale $scale): JsonResponse
    {
        if ($scale->is_default) {
            return response()->json([
                'message' => 'Mark another scale as default before deleting this one.',
            ], 422);
        }
        $scale->delete();
        return response()->json(['message' => 'Grading scale deleted.']);
    }

    public function setDefault(GradingScale $scale): JsonResponse
    {
        DB::transaction(function () use ($scale) {
            GradingScale::query()->update(['is_default' => false]);
            $scale->update(['is_default' => true]);
        });
        return response()->json(['data' => $scale->fresh('bands')]);
    }

    protected function validatePayload(Request $request, ?int $ignoreId = null, bool $creating = false): array
    {
        $tenantId = $request->user()->tenant_id ?? app(\App\Support\TenantContext::class)->id();

        return $request->validate([
            'name' => [
                $creating ? 'required' : 'sometimes',
                'string',
                'max:100',
                Rule::unique('grading_scales', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($ignoreId),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],

            'bands' => ['sometimes', 'array', 'min:1'],
            'bands.*.min_score' => ['required_with:bands', 'numeric', 'min:0', 'max:1000'],
            'bands.*.max_score' => ['required_with:bands', 'numeric', 'max:1000'],
            'bands.*.grade' => ['required_with:bands', 'string', 'max:4'],
            'bands.*.grade_point' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'bands.*.remark' => ['nullable', 'string', 'max:100'],
        ]);
    }

    protected function syncBands(GradingScale $scale, array $bands): void
    {
        $scale->bands()->delete();
        foreach (array_values($bands) as $i => $b) {
            GradingBand::create([
                'tenant_id' => $scale->tenant_id,
                'grading_scale_id' => $scale->id,
                'min_score' => $b['min_score'],
                'max_score' => $b['max_score'],
                'grade' => $b['grade'],
                'grade_point' => $b['grade_point'] ?? null,
                'remark' => $b['remark'] ?? null,
                'sort_order' => $i,
            ]);
        }
    }
}

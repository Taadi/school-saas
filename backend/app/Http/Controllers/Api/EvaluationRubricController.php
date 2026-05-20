<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationItem;
use App\Models\EvaluationRubric;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EvaluationRubricController extends Controller
{
    public function index(): JsonResponse
    {
        $rubrics = EvaluationRubric::with('items')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rubrics]);
    }

    public function show(EvaluationRubric $rubric): JsonResponse
    {
        return response()->json(['data' => $rubric->load('items')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, null, true);

        return DB::transaction(function () use ($data) {
            if (! empty($data['is_default'])) {
                EvaluationRubric::query()->update(['is_default' => false]);
            }

            $rubric = EvaluationRubric::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'cadence' => $data['cadence'] ?? 'weekly',
                'scope' => $data['scope'] ?? 'per_student',
                'target_role' => $data['target_role'] ?? 'form_teacher',
                'is_active' => $data['is_active'] ?? true,
                'is_default' => $data['is_default'] ?? false,
            ]);

            $this->syncItems($rubric, $data['items'] ?? []);

            return response()->json(['data' => $rubric->fresh('items')], 201);
        });
    }

    public function update(Request $request, EvaluationRubric $rubric): JsonResponse
    {
        $data = $this->validatePayload($request, $rubric->id, false);

        DB::transaction(function () use ($data, $rubric) {
            if (! empty($data['is_default'])) {
                EvaluationRubric::where('id', '!=', $rubric->id)->update(['is_default' => false]);
            }

            $rubric->update([
                'name' => $data['name'] ?? $rubric->name,
                'description' => $data['description'] ?? $rubric->description,
                'cadence' => $data['cadence'] ?? $rubric->cadence,
                'scope' => $data['scope'] ?? $rubric->scope,
                'target_role' => $data['target_role'] ?? $rubric->target_role,
                'is_active' => $data['is_active'] ?? $rubric->is_active,
                'is_default' => $data['is_default'] ?? $rubric->is_default,
            ]);

            if (array_key_exists('items', $data)) {
                $this->syncItems($rubric, $data['items']);
            }
        });

        return response()->json(['data' => $rubric->fresh('items')]);
    }

    public function destroy(EvaluationRubric $rubric): JsonResponse
    {
        $rubric->delete();

        return response()->json(['message' => 'Rubric deleted.']);
    }

    protected function validatePayload(Request $request, ?int $ignoreId, bool $creating): array
    {
        $tenantId = app(TenantContext::class)->id() ?? $request->user()->tenant_id;

        return $request->validate([
            'name' => [
                $creating ? 'required' : 'sometimes',
                'string',
                'max:120',
                Rule::unique('evaluation_rubrics', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($ignoreId),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cadence' => ['sometimes', Rule::in(['weekly', 'biweekly', 'monthly', 'adhoc', 'term'])],
            'scope' => ['sometimes', 'string', 'max:20'],
            'target_role' => ['sometimes', 'string', 'max:32'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'items' => ['sometimes', 'array'],
            'items.*.code' => ['required_with:items', 'string', 'max:48', 'regex:/^[a-z0-9_]+$/'],
            'items.*.label' => ['required_with:items', 'string', 'max:150'],
            'items.*.type' => ['required_with:items', Rule::in(['yes_no', 'scale_1_5', 'scale_1_10', 'choice', 'text'])],
            'items.*.choices' => ['nullable', 'array'],
            'items.*.weight' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

    protected function syncItems(EvaluationRubric $rubric, array $items): void
    {
        $rubric->items()->delete();
        foreach (array_values($items) as $i => $item) {
            EvaluationItem::create([
                'tenant_id' => $rubric->tenant_id,
                'evaluation_rubric_id' => $rubric->id,
                'code' => $item['code'],
                'label' => $item['label'],
                'type' => $item['type'],
                'choices' => $item['choices'] ?? null,
                'weight' => $item['weight'] ?? 1,
                'sort_order' => $i,
            ]);
        }
    }
}

<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\SubjectGroup;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SubjectGroupController extends Controller
{
    public function index(): JsonResponse
    {
        $groups = SubjectGroup::with(['subjects:id,code,name'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, null, true);

        return DB::transaction(function () use ($data) {
            $group = SubjectGroup::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'sort_order' => $data['sort_order'] ?? 0,
            ]);
            if (! empty($data['subject_ids'])) {
                $group->subjects()->sync($this->buildPivot($group, $data['subject_ids']));
            }
            return response()->json([
                'data' => $group->fresh(['subjects:id,code,name']),
            ], 201);
        });
    }

    public function update(Request $request, SubjectGroup $group): JsonResponse
    {
        $data = $this->validatePayload($request, $group->id, false);

        DB::transaction(function () use ($data, $group) {
            $group->update([
                'name' => $data['name'] ?? $group->name,
                'description' => $data['description'] ?? $group->description,
                'sort_order' => $data['sort_order'] ?? $group->sort_order,
            ]);
            if (array_key_exists('subject_ids', $data)) {
                $group->subjects()->sync($this->buildPivot($group, $data['subject_ids']));
            }
        });

        return response()->json([
            'data' => $group->fresh(['subjects:id,code,name']),
        ]);
    }

    public function destroy(SubjectGroup $group): JsonResponse
    {
        $group->delete();
        return response()->json(['message' => 'Subject group deleted.']);
    }

    protected function validatePayload(Request $request, ?int $ignoreId = null, bool $creating = false): array
    {
        $tenantId = app(TenantContext::class)->id() ?? $request->user()->tenant_id;

        return $request->validate([
            'name' => [
                $creating ? 'required' : 'sometimes',
                'string',
                'max:100',
                Rule::unique('subject_groups', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId))
                    ->ignore($ignoreId),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'subject_ids' => ['sometimes', 'array'],
            'subject_ids.*' => ['integer',
                Rule::exists('subjects', 'id')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
        ]);
    }

    protected function buildPivot(SubjectGroup $group, array $subjectIds): array
    {
        $payload = [];
        foreach ($subjectIds as $id) {
            $payload[$id] = ['tenant_id' => $group->tenant_id];
        }
        return $payload;
    }
}

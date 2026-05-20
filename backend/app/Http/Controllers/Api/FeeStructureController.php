<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeStructureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FeeStructure::query()
            ->with(['category', 'schoolClass', 'arm', 'term']);

        if ($id = $request->integer('academic_session_id')) {
            $query->where('academic_session_id', $id);
        }
        if ($id = $request->integer('school_class_id')) {
            $query->where('school_class_id', $id);
        }
        if ($id = $request->integer('term_id')) {
            $query->where('term_id', $id);
        }
        if ($id = $request->integer('arm_id')) {
            $query->where('arm_id', $id);
        }
        if ($id = $request->integer('fee_category_id')) {
            $query->where('fee_category_id', $id);
        }

        return response()->json([
            'data' => $query->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $data = $this->validatedPayload($request, $tenantId);

        $existing = FeeStructure::query()
            ->where('fee_category_id', $data['fee_category_id'])
            ->where('school_class_id', $data['school_class_id'])
            ->where('arm_id', $data['arm_id'] ?? null)
            ->where('academic_session_id', $data['academic_session_id'])
            ->where('term_id', $data['term_id'] ?? null)
            ->first();

        if ($existing) {
            $existing->update([
                'amount' => $data['amount'],
                'is_optional' => $data['is_optional'] ?? false,
            ]);
            return response()->json(['data' => $existing->fresh(['category', 'schoolClass', 'arm', 'term'])]);
        }

        $structure = FeeStructure::create($data);

        return response()->json([
            'data' => $structure->fresh(['category', 'schoolClass', 'arm', 'term']),
        ], 201);
    }

    public function update(Request $request, FeeStructure $structure): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'is_optional' => ['sometimes', 'boolean'],
        ]);

        $structure->update($data);

        return response()->json([
            'data' => $structure->fresh(['category', 'schoolClass', 'arm', 'term']),
        ]);
    }

    public function destroy(FeeStructure $structure): JsonResponse
    {
        $structure->delete();
        return response()->json(['message' => 'Fee structure deleted.']);
    }

    /**
     * Replace the entire fee matrix for a class/arm/term in one shot.
     * Payload: { school_class_id, arm_id?, academic_session_id, term_id?, items: [{ fee_category_id, amount, is_optional? }] }
     */
    public function bulkSet(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $data = $request->validate([
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'exists:arms,id'],
            'academic_session_id' => ['required', 'exists:academic_sessions,id'],
            'term_id' => ['nullable', 'exists:terms,id'],
            'items' => ['required', 'array'],
            'items.*.fee_category_id' => ['required', 'exists:fee_categories,id'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.is_optional' => ['sometimes', 'boolean'],
        ]);

        $existingQuery = FeeStructure::query()
            ->where('school_class_id', $data['school_class_id'])
            ->where('academic_session_id', $data['academic_session_id'])
            ->where('arm_id', $data['arm_id'] ?? null)
            ->where('term_id', $data['term_id'] ?? null);

        $keepCategoryIds = collect($data['items'])->pluck('fee_category_id')->all();

        // Drop categories that were removed from the matrix.
        (clone $existingQuery)
            ->whereNotIn('fee_category_id', $keepCategoryIds ?: [0])
            ->delete();

        foreach ($data['items'] as $item) {
            FeeStructure::updateOrCreate(
                [
                    'fee_category_id' => $item['fee_category_id'],
                    'school_class_id' => $data['school_class_id'],
                    'arm_id' => $data['arm_id'] ?? null,
                    'academic_session_id' => $data['academic_session_id'],
                    'term_id' => $data['term_id'] ?? null,
                ],
                [
                    'tenant_id' => $tenantId,
                    'amount' => $item['amount'],
                    'is_optional' => $item['is_optional'] ?? false,
                ],
            );
        }

        return response()->json([
            'data' => (clone $existingQuery)
                ->with(['category', 'schoolClass', 'arm', 'term'])
                ->get(),
        ]);
    }

    protected function validatedPayload(Request $request, int $tenantId): array
    {
        return $request->validate([
            'fee_category_id' => ['required', 'exists:fee_categories,id'],
            'school_class_id' => ['required', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'exists:arms,id'],
            'academic_session_id' => ['required', 'exists:academic_sessions,id'],
            'term_id' => ['nullable', 'exists:terms,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'is_optional' => ['sometimes', 'boolean'],
        ]);
    }
}

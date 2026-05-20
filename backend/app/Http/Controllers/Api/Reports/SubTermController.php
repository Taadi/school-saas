<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\SubTerm;
use App\Models\Term;
use App\Services\SubTermService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubTermController extends Controller
{
    public function __construct(protected SubTermService $subTermService) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'term_id' => ['required', 'integer', 'exists:terms,id'],
        ]);

        $rows = SubTerm::where('term_id', $data['term_id'])
            ->orderBy('ordinal')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'name' => ['required', 'string', 'max:100'],
            'kind' => ['nullable', Rule::in(['midterm', 'window', 'weekly', 'custom'])],
            'ordinal' => ['nullable', 'integer', 'min:1'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $term = Term::findOrFail($data['term_id']);

        $subTerm = SubTerm::create([
            'tenant_id' => $term->tenant_id,
            'term_id' => $term->id,
            'name' => $data['name'],
            'kind' => $data['kind'] ?? SubTerm::KIND_CUSTOM,
            'ordinal' => $data['ordinal'] ?? (SubTerm::where('term_id', $term->id)->max('ordinal') + 1),
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $subTerm], 201);
    }

    public function update(Request $request, SubTerm $subTerm): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'kind' => ['sometimes', Rule::in(['midterm', 'window', 'weekly', 'custom'])],
            'ordinal' => ['sometimes', 'integer', 'min:1'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $subTerm->update($data);

        return response()->json(['data' => $subTerm->fresh()]);
    }

    public function destroy(SubTerm $subTerm): JsonResponse
    {
        $subTerm->delete();

        return response()->json(['message' => 'Sub-term deleted.']);
    }

    public function seedDefaults(Term $term): JsonResponse
    {
        $subTerm = $this->subTermService->seedForTerm($term);

        return response()->json([
            'message' => 'Default mid-term period ensured.',
            'data' => $subTerm,
        ]);
    }
}

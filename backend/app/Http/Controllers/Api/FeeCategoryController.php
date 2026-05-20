<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FeeCategory::query()->orderBy('name');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('only_active')) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $data = $request->validate([
            'code' => [
                'required', 'string', 'max:30',
                Rule::unique('fee_categories', 'code')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category = FeeCategory::create($data);

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, FeeCategory $category): JsonResponse
    {
        $data = $request->validate([
            'code' => [
                'sometimes', 'string', 'max:30',
                Rule::unique('fee_categories', 'code')
                    ->where(fn ($q) => $q->where('tenant_id', $category->tenant_id))
                    ->ignore($category->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category->update($data);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(FeeCategory $category): JsonResponse
    {
        $category->delete();
        return response()->json(['message' => 'Fee category deleted.']);
    }
}

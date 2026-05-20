<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Arm;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SchoolClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $with = [
            'arms:id,school_class_id,name,capacity,class_teacher_id',
            'arms.classTeacher:id,name,email',
        ];

        if ($request->boolean('with_subjects')) {
            $with[] = 'subjects:id,code,name';
        }

        $classes = SchoolClass::query()
            ->orderBy('order')
            ->orderBy('name')
            ->with($with)
            ->withCount(['enrollments', 'subjects'])
            ->get();

        return response()->json(['data' => $classes]);
    }

    public function show(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->load([
            'arms:id,school_class_id,name,capacity,class_teacher_id',
            'arms.classTeacher:id,name,email',
            'subjects:id,code,name',
        ]);

        return response()->json(['data' => $schoolClass]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('school_classes', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'level' => ['required', Rule::in(['nursery', 'primary', 'junior_secondary', 'senior_secondary'])],
            'order' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $class = SchoolClass::create($data);

        return response()->json(['data' => $class], 201);
    }

    public function update(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('school_classes', 'name')
                    ->where(fn ($q) => $q->where('tenant_id', $schoolClass->tenant_id))
                    ->ignore($schoolClass->id),
            ],
            'level' => ['sometimes', Rule::in(['nursery', 'primary', 'junior_secondary', 'senior_secondary'])],
            'order' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ]);

        $schoolClass->update($data);

        return response()->json(['data' => $schoolClass->fresh()]);
    }

    public function destroy(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->delete();
        return response()->json(['message' => 'Class deleted.']);
    }

    /*
    |--------------------------------------------------------------------------
    | Arms
    |--------------------------------------------------------------------------
    */

    public function arms(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $arms = Arm::query()
            ->where('school_class_id', $schoolClass->id)
            ->with('classTeacher:id,name,email')
            ->orderBy('name')
            ->get(['id', 'school_class_id', 'name', 'capacity', 'class_teacher_id']);

        return response()->json(['data' => $arms]);
    }

    public function storeArm(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('arms', 'name')
                    ->where(fn ($q) => $q->where('school_class_id', $schoolClass->id)),
            ],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:200'],
            'class_teacher_id' => $this->classTeacherRules($schoolClass->tenant_id),
        ]);

        $arm = Arm::create([
            'tenant_id' => $schoolClass->tenant_id,
            'school_class_id' => $schoolClass->id,
            'name' => $data['name'],
            'capacity' => $data['capacity'] ?? 40,
            'class_teacher_id' => $data['class_teacher_id'] ?? null,
        ]);

        $arm->load('classTeacher:id,name,email');

        return response()->json(['data' => $arm], 201);
    }

    public function updateArm(Request $request, SchoolClass $schoolClass, Arm $arm): JsonResponse
    {
        abort_if($arm->school_class_id !== $schoolClass->id, 404);

        $data = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('arms', 'name')
                    ->where(fn ($q) => $q->where('school_class_id', $schoolClass->id))
                    ->ignore($arm->id),
            ],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:200'],
            'class_teacher_id' => array_merge(
                ['sometimes'],
                $this->classTeacherRules($schoolClass->tenant_id),
            ),
        ]);

        $arm->update($data);

        return response()->json([
            'data' => $arm->fresh(['classTeacher:id,name,email']),
        ]);
    }

    /**
     * Validation rules for `class_teacher_id`: must reference a user with
     * `role = teacher` belonging to the same tenant. Returns the rule array
     * so callers can prepend `sometimes` for partial updates.
     *
     * @return array<int, mixed>
     */
    protected function classTeacherRules(int $tenantId): array
    {
        return [
            'nullable',
            'integer',
            Rule::exists('users', 'id')->where(function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId)
                    ->where('role', User::ROLE_TEACHER)
                    ->where('is_active', true);
            }),
        ];
    }

    public function destroyArm(SchoolClass $schoolClass, Arm $arm): JsonResponse
    {
        abort_if($arm->school_class_id !== $schoolClass->id, 404);

        $arm->delete();
        return response()->json(['message' => 'Arm deleted.']);
    }

    /*
    |--------------------------------------------------------------------------
    | Subjects per class
    |--------------------------------------------------------------------------
    */

    public function subjects(SchoolClass $schoolClass): JsonResponse
    {
        $subjects = $schoolClass->subjects()
            ->orderBy('subjects.name')
            ->get(['subjects.id', 'subjects.code', 'subjects.name']);

        return response()->json(['data' => $subjects]);
    }

    /**
     * Replace the full subject list for the given class. Pass an empty
     * `subject_ids` array to clear all subjects from this class.
     */
    public function syncSubjects(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'subject_ids' => ['present', 'array'],
            'subject_ids.*' => ['integer', 'exists:subjects,id'],
            'compulsory_ids' => ['nullable', 'array'],
            'compulsory_ids.*' => ['integer'],
        ]);

        $compulsorySet = collect($data['compulsory_ids'] ?? $data['subject_ids'])->flip();

        $sync = collect($data['subject_ids'])
            ->mapWithKeys(fn ($id) => [
                $id => [
                    'tenant_id' => $schoolClass->tenant_id,
                    'is_compulsory' => $compulsorySet->has($id),
                ],
            ])
            ->all();

        $schoolClass->subjects()->sync($sync);

        $schoolClass->load('subjects:id,code,name');

        return response()->json(['data' => $schoolClass->subjects]);
    }
}

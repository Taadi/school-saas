<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Arm;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\SubjectTeacher;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SubjectTeacherController extends Controller
{
    /**
     * GET /subject-teachers
     * Filters: subject_id, school_class_id, arm_id, teacher_user_id, academic_session_id.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_id' => ['nullable', 'integer'],
            'school_class_id' => ['nullable', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'teacher_user_id' => ['nullable', 'integer'],
            'academic_session_id' => ['nullable', 'integer'],
        ]);

        $query = SubjectTeacher::query()
            ->with([
                'subject:id,name,code',
                'schoolClass:id,name,level',
                'arm:id,school_class_id,name',
                'teacher:id,name,email',
                'academicSession:id,name',
            ])
            ->orderByDesc('id');

        foreach (['subject_id', 'school_class_id', 'arm_id', 'teacher_user_id', 'academic_session_id'] as $key) {
            if (! empty($data[$key])) {
                $query->where($key, $data[$key]);
            }
        }

        // If the requesting user is a teacher (not admin), only show their own
        // assignments. Admin/super-admin see everything.
        $user = $request->user();
        if ($user && $user->hasRole(User::ROLE_TEACHER)) {
            $query->where('teacher_user_id', $user->id);
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * POST /subject-teachers
     * Create a single assignment.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId($request);
        $data = $this->validatedAssignment($request, $tenantId);

        // Application-level dedup. MySQL treats NULLs as distinct in unique
        // indexes, so two assignments with academic_session_id = NULL would
        // otherwise be allowed to coexist.
        $existing = SubjectTeacher::where('subject_id', $data['subject_id'])
            ->where('arm_id', $data['arm_id'])
            ->where('teacher_user_id', $data['teacher_user_id'])
            ->where(function ($q) use ($data) {
                $data['academic_session_id'] === null
                    ? $q->whereNull('academic_session_id')
                    : $q->where('academic_session_id', $data['academic_session_id']);
            })
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'This teacher is already assigned to that subject for the selected arm.',
                'errors' => [
                    'teacher_user_id' => ['Duplicate assignment.'],
                ],
            ], 422);
        }

        $assignment = SubjectTeacher::create($data);
        $assignment->load([
            'subject:id,name,code',
            'schoolClass:id,name,level',
            'arm:id,school_class_id,name',
            'teacher:id,name,email',
            'academicSession:id,name',
        ]);

        return response()->json(['data' => $assignment], 201);
    }

    /**
     * PUT /subjects/{subject}/teachers
     * Sync the full set of teacher assignments for a subject. The payload is a
     * list of {arm_id, teacher_user_id, academic_session_id?, is_lead?}. Anything
     * not in the list is removed (within the optional academic_session scope).
     */
    public function syncForSubject(Request $request, Subject $subject): JsonResponse
    {
        $tenantId = $this->resolveTenantId($request);

        $data = $request->validate([
            'academic_session_id' => ['nullable', 'integer', $this->sessionExistsRule($tenantId)],
            'assignments' => ['present', 'array'],
            'assignments.*.arm_id' => ['required', 'integer'],
            'assignments.*.teacher_user_id' => ['required', 'integer'],
            'assignments.*.is_lead' => ['nullable', 'boolean'],
        ]);

        $sessionId = $data['academic_session_id'] ?? null;

        $assignments = collect($data['assignments'])->map(function ($row) use ($subject, $tenantId, $sessionId, $request) {
            // Ensure each row is fully validated (arm/teacher belong to this tenant).
            $this->validateRow($subject, $row, $tenantId);

            return [
                'tenant_id' => $tenantId,
                'subject_id' => $subject->id,
                'school_class_id' => Arm::where('id', $row['arm_id'])->value('school_class_id'),
                'arm_id' => (int) $row['arm_id'],
                'teacher_user_id' => (int) $row['teacher_user_id'],
                'academic_session_id' => $sessionId,
                'is_lead' => (bool) ($row['is_lead'] ?? true),
            ];
        });

        DB::transaction(function () use ($subject, $sessionId, $assignments) {
            $existing = SubjectTeacher::where('subject_id', $subject->id)
                ->where(function ($q) use ($sessionId) {
                    $sessionId === null
                        ? $q->whereNull('academic_session_id')
                        : $q->where('academic_session_id', $sessionId);
                })
                ->get();

            $keep = [];
            foreach ($assignments as $row) {
                $key = "{$row['arm_id']}:{$row['teacher_user_id']}";
                $match = $existing->first(fn ($e) => $e->arm_id === $row['arm_id']
                    && $e->teacher_user_id === $row['teacher_user_id']);

                if ($match) {
                    $match->update(['is_lead' => $row['is_lead']]);
                    $keep[] = $match->id;
                } else {
                    $created = SubjectTeacher::create($row);
                    $keep[] = $created->id;
                }
            }

            $existing->whereNotIn('id', $keep)->each->delete();
        });

        return $this->forSubject($request, $subject);
    }

    /**
     * GET /subjects/{subject}/teachers
     */
    public function forSubject(Request $request, Subject $subject): JsonResponse
    {
        $sessionId = $request->integer('academic_session_id') ?: null;

        $query = $subject->teacherAssignments()
            ->with([
                'schoolClass:id,name,level',
                'arm:id,school_class_id,name',
                'teacher:id,name,email',
                'academicSession:id,name',
            ])
            ->orderBy('school_class_id')
            ->orderBy('arm_id');

        if ($sessionId) {
            $query->where('academic_session_id', $sessionId);
        }

        return response()->json([
            'data' => $query->get(),
            'subject' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ],
        ]);
    }

    /**
     * DELETE /subject-teachers/{assignment}
     */
    public function destroy(SubjectTeacher $assignment): JsonResponse
    {
        $assignment->delete();
        return response()->json(['message' => 'Assignment removed.']);
    }

    /* ------------------------------------------------------------------ */
    /*  Validation helpers                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Resolve the tenant id the request is operating against.
     *
     * Order of preference:
     *   1. TenantContext (set by EnsureTenant middleware — respects the
     *      `X-Tenant-Id` header for super admins).
     *   2. The authenticated user's own tenant_id.
     *   3. Infer from the subject_id payload if present (last-resort fallback
     *      for super admins who didn't send the header).
     */
    protected function resolveTenantId(Request $request): int
    {
        $context = app(TenantContext::class)->id();
        if ($context) {
            return (int) $context;
        }

        $userTenant = $request->user()?->tenant_id;
        if ($userTenant) {
            return (int) $userTenant;
        }

        $subjectId = $request->integer('subject_id');
        if ($subjectId) {
            $tenantFromSubject = Subject::withoutGlobalScopes()
                ->where('id', $subjectId)
                ->value('tenant_id');
            if ($tenantFromSubject) {
                app(TenantContext::class)->set((int) $tenantFromSubject);
                return (int) $tenantFromSubject;
            }
        }

        abort(400, 'No tenant context for this request. Send X-Tenant-Id header.');
    }

    protected function validatedAssignment(Request $request, int $tenantId): array
    {
        $data = $request->validate([
            'subject_id' => ['required', 'integer', $this->subjectExistsRule($tenantId)],
            'arm_id' => ['required', 'integer', $this->armExistsRule($tenantId)],
            'teacher_user_id' => ['required', 'integer', $this->teacherExistsRule($tenantId)],
            'academic_session_id' => ['nullable', 'integer', $this->sessionExistsRule($tenantId)],
            'is_lead' => ['nullable', 'boolean'],
        ]);

        $arm = Arm::where('tenant_id', $tenantId)->where('id', $data['arm_id'])->firstOrFail();

        return [
            'tenant_id' => $tenantId,
            'subject_id' => (int) $data['subject_id'],
            'school_class_id' => $arm->school_class_id,
            'arm_id' => (int) $data['arm_id'],
            'teacher_user_id' => (int) $data['teacher_user_id'],
            'academic_session_id' => $data['academic_session_id'] ?? null,
            'is_lead' => (bool) ($data['is_lead'] ?? true),
        ];
    }

    protected function validateRow(Subject $subject, array $row, int $tenantId): void
    {
        validator($row, [
            'arm_id' => ['required', 'integer', $this->armExistsRule($tenantId)],
            'teacher_user_id' => ['required', 'integer', $this->teacherExistsRule($tenantId)],
        ])->validate();
    }

    protected function subjectExistsRule(int $tenantId)
    {
        return Rule::exists('subjects', 'id')
            ->where(fn ($q) => $q->where('tenant_id', $tenantId));
    }

    protected function armExistsRule(int $tenantId)
    {
        return Rule::exists('arms', 'id')
            ->where(fn ($q) => $q->where('tenant_id', $tenantId));
    }

    protected function sessionExistsRule(int $tenantId)
    {
        return Rule::exists('academic_sessions', 'id')
            ->where(fn ($q) => $q->where('tenant_id', $tenantId));
    }

    protected function teacherExistsRule(int $tenantId)
    {
        return Rule::exists('users', 'id')->where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)
                ->where('role', User::ROLE_TEACHER)
                ->where('is_active', true);
        });
    }
}

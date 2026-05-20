<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Arm;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentClass;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Promotion Manager.
 *
 * Lets a School Admin move students from one academic session into the next,
 * either keeping them in the same class (carry forward) or promoting them
 * up the ladder (JSS1 → JSS2, SSS3 → graduated, etc.).
 *
 * Endpoints:
 *  - GET  /promotions/preview   — list current (class, arm) groups in the source
 *                                  session along with their student count and a
 *                                  suggested target class by name pattern.
 *  - POST /promotions/apply     — execute promotion using a rule per
 *                                  (source_class_id, source_arm_id):
 *                                      action: promote | repeat | graduate
 *                                      target_class_id / target_arm_id
 *                                      exclude_student_ids[]
 */
class PromotionController extends Controller
{
    public function __construct(protected TenantContext $context) {}

    /**
     * Preview promotion: groups of current enrollments in the source session
     * and a recommended target class for each (e.g. JSS1 → JSS2).
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_session_id' => ['required', 'integer', 'exists:academic_sessions,id'],
            'target_session_id' => ['required', 'integer', 'exists:academic_sessions,id', 'different:source_session_id'],
        ]);

        $source = AcademicSession::findOrFail($data['source_session_id']);
        $target = AcademicSession::findOrFail($data['target_session_id']);

        $classes = SchoolClass::with('arms')->orderBy('order')->get();
        $classesById = $classes->keyBy('id');

        $groups = StudentClass::query()
            ->where('session_year', $source->name)
            ->where('status', 'active')
            ->select('school_class_id', 'arm_id', DB::raw('COUNT(DISTINCT student_id) as student_count'))
            ->groupBy('school_class_id', 'arm_id')
            ->get();

        $alreadyEnrolledStudentIds = StudentClass::query()
            ->where('session_year', $target->name)
            ->where('status', 'active')
            ->pluck('student_id')
            ->unique()
            ->flip();

        $rows = $groups->map(function ($g) use ($classesById, $alreadyEnrolledStudentIds, $source) {
            $class = $classesById[$g->school_class_id] ?? null;
            $arm = $class?->arms->firstWhere('id', $g->arm_id);

            $students = StudentClass::query()
                ->where('student_class.session_year', $source->name)
                ->where('student_class.school_class_id', $g->school_class_id)
                ->where('student_class.arm_id', $g->arm_id)
                ->where('student_class.status', 'active')
                ->join('students', 'students.id', '=', 'student_class.student_id')
                ->join('users', 'users.id', '=', 'students.user_id')
                ->orderBy('students.admission_number')
                ->get([
                    'students.id as id',
                    'students.admission_number as admission_number',
                    'users.name as name',
                ]);

            $suggested = $this->suggestNextClass($class, $classesById);

            return [
                'source_class_id' => $g->school_class_id,
                'source_class_name' => $class?->name,
                'source_arm_id' => $g->arm_id,
                'source_arm_name' => $arm?->name,
                'student_count' => (int) $g->student_count,
                'suggested_target_class_id' => $suggested?->id,
                'suggested_target_class_name' => $suggested?->name,
                'suggested_action' => $suggested ? 'promote' : 'graduate',
                'students' => $students->map(fn ($s) => [
                    'id' => $s->id,
                    'admission_number' => $s->admission_number,
                    'name' => $s->name,
                    'already_enrolled_in_target' => $alreadyEnrolledStudentIds->has($s->id),
                ])->values(),
            ];
        });

        return response()->json([
            'data' => $rows->values(),
            'context' => [
                'source_session' => $source->only(['id', 'name']),
                'target_session' => $target->only(['id', 'name']),
                'classes' => $classes->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'level' => $c->level,
                    'arms' => $c->arms->map(fn ($a) => ['id' => $a->id, 'name' => $a->name]),
                ])->values(),
            ],
        ]);
    }

    /**
     * Apply the promotion rules.
     */
    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_session_id' => ['required', 'integer', 'exists:academic_sessions,id'],
            'target_session_id' => ['required', 'integer', 'exists:academic_sessions,id', 'different:source_session_id'],
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.source_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'rules.*.source_arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'rules.*.action' => ['required', 'in:promote,repeat,graduate'],
            'rules.*.target_class_id' => ['nullable', 'integer', 'exists:school_classes,id'],
            'rules.*.target_arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'rules.*.exclude_student_ids' => ['nullable', 'array'],
            'rules.*.exclude_student_ids.*' => ['integer'],
        ]);

        $tenantId = $this->context->id();
        abort_if(! $tenantId, 422, 'Tenant context is not set.');

        $source = AcademicSession::findOrFail($data['source_session_id']);
        $target = AcademicSession::findOrFail($data['target_session_id']);

        $summary = [
            'promoted' => 0,
            'repeated' => 0,
            'graduated' => 0,
            'skipped_already_enrolled' => 0,
            'errors' => [],
        ];

        DB::transaction(function () use ($data, $source, $target, $tenantId, &$summary) {
            foreach ($data['rules'] as $rule) {
                $action = $rule['action'];
                $excluded = collect($rule['exclude_student_ids'] ?? [])->flip();

                if ($action === 'promote' && empty($rule['target_class_id'])) {
                    $summary['errors'][] = "Missing target class for source class #{$rule['source_class_id']}.";
                    continue;
                }

                $students = StudentClass::query()
                    ->where('session_year', $source->name)
                    ->where('school_class_id', $rule['source_class_id'])
                    ->when($rule['source_arm_id'] ?? null, fn ($q, $armId) => $q->where('arm_id', $armId))
                    ->where('status', 'active')
                    ->pluck('student_id')
                    ->unique();

                foreach ($students as $studentId) {
                    if ($excluded->has($studentId)) {
                        continue;
                    }

                    if ($action === 'graduate') {
                        Student::where('id', $studentId)
                            ->update(['status' => Student::STATUS_GRADUATED]);
                        $summary['graduated']++;
                        continue;
                    }

                    // For promote: move to target class; for repeat: keep source class.
                    $targetClassId = $action === 'repeat'
                        ? $rule['source_class_id']
                        : $rule['target_class_id'];
                    $targetArmId = $action === 'repeat'
                        ? $rule['source_arm_id']
                        : ($rule['target_arm_id'] ?? $rule['source_arm_id'] ?? null);

                    $alreadyExists = StudentClass::query()
                        ->where('session_year', $target->name)
                        ->where('student_id', $studentId)
                        ->exists();

                    if ($alreadyExists) {
                        $summary['skipped_already_enrolled']++;
                        continue;
                    }

                    StudentClass::create([
                        'tenant_id' => $tenantId,
                        'student_id' => $studentId,
                        'school_class_id' => $targetClassId,
                        'arm_id' => $targetArmId,
                        'session_year' => $target->name,
                        'term' => 'first',
                        'status' => 'active',
                    ]);

                    if ($action === 'repeat') {
                        $summary['repeated']++;
                    } else {
                        $summary['promoted']++;
                    }
                }
            }
        });

        return response()->json([
            'message' => "Promoted: {$summary['promoted']}, Repeated: {$summary['repeated']}, Graduated: {$summary['graduated']}, Skipped: {$summary['skipped_already_enrolled']}.",
            'summary' => $summary,
        ]);
    }

    /**
     * Suggest the next class based on `order`, then fall back to name pattern.
     *
     * Strategy:
     *  1. Pick the next class by `order` ascending if one exists.
     *  2. Otherwise try a name pattern (JSS1 → JSS2, SSS2 → SSS3, etc.).
     *  3. SSS3 → null (graduate). Same for any class with no successor.
     */
    private function suggestNextClass(?SchoolClass $current, $classesById): ?SchoolClass
    {
        if (! $current) {
            return null;
        }

        $byOrder = $classesById->values()
            ->sortBy('order')
            ->values();

        $idx = $byOrder->search(fn ($c) => $c->id === $current->id);
        if ($idx !== false && isset($byOrder[$idx + 1])) {
            return $byOrder[$idx + 1];
        }

        // SSS3 / Primary 6 → typically graduate.
        if (preg_match('/(SSS\s*3|SS\s*3|Primary\s*6|P\s*6|Grade\s*12)/i', $current->name)) {
            return null;
        }

        if (preg_match('/^(.*?)(\d+)$/', $current->name, $m)) {
            $prefix = trim($m[1]);
            $next = (int) $m[2] + 1;
            return $classesById->first(function ($c) use ($prefix, $next) {
                return preg_match('/^'.preg_quote($prefix, '/').'\s*'.$next.'$/i', $c->name);
            });
        }

        return null;
    }
}

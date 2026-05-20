<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssessmentScheme;
use App\Models\Result;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\SubjectTeacher;
use App\Models\Term;
use App\Models\User;
use App\Services\GradingService;
use App\Services\ReportSettingsService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ResultController extends Controller
{
    public function __construct(
        protected GradingService $grader,
        protected ReportSettingsService $settings,
        protected TenantContext $tenantContext,
    ) {}

    /**
     * List results with rich filters. Used by the admin "All Results" page.
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['nullable', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
            'student_id' => ['nullable', 'integer'],
            'term_id' => ['nullable', 'integer'],
            'sub_term_id' => ['nullable', 'integer'],
            'academic_session_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['draft', 'submitted', 'approved'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Result::query()
            ->with([
                'student:id,user_id,admission_number',
                'student.user:id,name',
                'subject:id,code,name',
                'schoolClass:id,name',
                'arm:id,name',
                'term:id,name,academic_session_id',
                'subTerm:id,name,kind',
                'approvedBy:id,name',
                'assessmentScheme:id,name,total_max',
            ])
            ->latest('updated_at');

        foreach (['school_class_id', 'arm_id', 'subject_id', 'student_id', 'term_id', 'academic_session_id', 'status'] as $col) {
            if (! empty($data[$col])) {
                $query->where($col, $data[$col]);
            }
        }

        if (array_key_exists('sub_term_id', $data) && $data['sub_term_id'] !== null && $data['sub_term_id'] !== '') {
            $query->where('sub_term_id', $data['sub_term_id']);
        } elseif ($request->has('sub_term_id') && ($data['sub_term_id'] ?? null) === null) {
            $query->whereNull('sub_term_id');
        }

        $perPage = (int) ($data['per_page'] ?? 25);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
        ]);
    }

    /**
     * Score sheet: every active student in the chosen class/arm + their scores
     * for the chosen subject/term. Includes the **active assessment scheme**
     * so the UI can render dynamic columns.
     */
    public function scoreSheet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'sub_term_id' => ['nullable', 'integer', 'exists:sub_terms,id'],
        ]);

        $this->ensureCanTeach($request, $data['subject_id'], $data['arm_id'] ?? null);

        $term = Term::with('academicSession')->findOrFail($data['term_id']);
        $tenantId = $this->resolveTenantId($request);
        $subTermId = $data['sub_term_id'] ?? null;

        $scheme = $this->resolveSchemeForTerm($term, $tenantId, $subTermId);
        abort_if(! $scheme, 422, 'No active assessment scheme is configured. Set one up in College Report → Assessment.');

        // Resolve who is currently in this class+arm. We try the term's session
        // year first; if no enrollments match (common right after a new session
        // starts, before anyone has been re-enrolled), we fall back to the
        // student's latest active enrollment in this class+arm. This keeps
        // score entry working even when admins haven't formally promoted
        // students into the new session yet.
        $sessionYear = $term->academicSession?->name;
        $baseQuery = StudentClass::query()
            ->where('school_class_id', $data['school_class_id'])
            ->when($data['arm_id'] ?? null, fn ($q, $armId) => $q->where('arm_id', $armId))
            ->where('status', 'active');

        $studentIds = (clone $baseQuery)
            ->when($sessionYear, fn ($q) => $q->where('session_year', $sessionYear))
            ->pluck('student_id')
            ->unique()
            ->values();

        if ($studentIds->isEmpty()) {
            $studentIds = (clone $baseQuery)
                ->pluck('student_id')
                ->unique()
                ->values();
        }

        $students = Student::query()
            ->with('user:id,name')
            ->whereIn('id', $studentIds)
            ->orderBy('admission_number')
            ->get(['id', 'user_id', 'admission_number']);

        $existing = $this->scopeResultsForPeriod(
            Result::query()
                ->whereIn('student_id', $studentIds)
                ->where('subject_id', $data['subject_id'])
                ->where('term_id', $data['term_id']),
            $subTermId,
        )->get()->keyBy('student_id');

        $rows = $students->map(function (Student $student) use ($existing, $scheme) {
            /** @var Result|null $r */
            $r = $existing[$student->id] ?? null;
            $scores = $this->extractScoresMap($r, $scheme);

            return [
                'student_id' => $student->id,
                'admission_number' => $student->admission_number,
                'name' => $student->user?->name,
                'result_id' => $r?->id,
                'scores' => $scores,
                'total' => $r?->total,
                'grade' => $r?->grade,
                'remark' => $r?->remark,
                'status' => $r?->status ?? Result::STATUS_DRAFT,
            ];
        });

        return response()->json([
            'data' => $rows,
            'context' => [
                'school_class_id' => $data['school_class_id'],
                'arm_id' => $data['arm_id'] ?? null,
                'subject_id' => $data['subject_id'],
                'term_id' => $data['term_id'],
                'sub_term_id' => $subTermId,
                'session' => $term->academicSession?->only(['id', 'name']),
                'term' => $term->only(['id', 'name', 'result_entry_deadline']),
                'scheme' => [
                    'id' => $scheme->id,
                    'name' => $scheme->name,
                    'total_max' => (float) $scheme->total_max,
                    'grading_scale_id' => $scheme->grading_scale_id,
                    'components' => $scheme->components->map(fn ($c) => [
                        'code' => $c->code,
                        'label' => $c->label,
                        'max_score' => (float) $c->max_score,
                        'weight' => (float) $c->weight,
                        'is_exam' => (bool) $c->is_exam,
                    ])->values(),
                ],
            ],
        ]);
    }

    /**
     * Bulk insert/update scores. Accepts dynamic component scores keyed by
     * `code` (e.g. `{ ca1: 9, exam: 65 }`). Validation maxima come from the
     * resolved scheme — no more hardcoded `max:10` / `max:70`.
     */
    public function bulkUpsert(Request $request): JsonResponse
    {
        $base = $request->validate([
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'sub_term_id' => ['nullable', 'integer', 'exists:sub_terms,id'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'rows.*.scores' => ['nullable', 'array'],
            // Legacy keys still accepted; will be merged into `scores`.
            'rows.*.ca1' => ['nullable', 'numeric', 'min:0'],
            'rows.*.ca2' => ['nullable', 'numeric', 'min:0'],
            'rows.*.midterm' => ['nullable', 'numeric', 'min:0'],
            'rows.*.exam' => ['nullable', 'numeric', 'min:0'],
        ]);

        $this->ensureCanTeach($request, $base['subject_id'], $base['arm_id'] ?? null);

        $term = Term::with('academicSession')->findOrFail($base['term_id']);
        $tenantId = $this->resolveTenantId($request);
        $subTermId = $base['sub_term_id'] ?? null;
        $scheme = $this->resolveSchemeForTerm($term, $tenantId, $subTermId);
        abort_if(! $scheme, 422, 'No active assessment scheme is configured.');

        $this->ensureEntryWindowOpen($request, $term);

        $componentMax = $scheme->components->mapWithKeys(
            fn ($c) => [$c->code => (float) $c->max_score],
        )->all();

        // Validate per-component maxima dynamically.
        foreach ($base['rows'] as $i => $row) {
            $scores = $this->mergeLegacyScores($row);
            foreach ($scores as $code => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                if (! isset($componentMax[$code])) {
                    abort(422, "Unknown assessment component '{$code}' for the active scheme.");
                }
                if ((float) $value < 0 || (float) $value > $componentMax[$code]) {
                    abort(422, "Score for '{$code}' on row ".($i + 1)." must be between 0 and {$componentMax[$code]}.");
                }
            }
        }

        $userId = $request->user()->id;
        $saved = 0;
        $skipped = 0;

        DB::transaction(function () use ($base, $term, $scheme, $userId, $tenantId, $subTermId, &$saved, &$skipped) {
            foreach ($base['rows'] as $row) {
                $existing = $this->scopeResultsForPeriod(
                    Result::where('student_id', $row['student_id'])
                        ->where('subject_id', $base['subject_id'])
                        ->where('term_id', $base['term_id']),
                    $subTermId,
                )->first();

                if ($existing && $existing->status === Result::STATUS_APPROVED) {
                    $skipped++;
                    continue;
                }

                $scores = $this->mergeLegacyScores($row);

                $payload = [
                    'tenant_id' => $tenantId,
                    'student_id' => $row['student_id'],
                    'subject_id' => $base['subject_id'],
                    'school_class_id' => $base['school_class_id'],
                    'arm_id' => $base['arm_id'] ?? null,
                    'academic_session_id' => $term->academic_session_id,
                    'term_id' => $term->id,
                    'sub_term_id' => $subTermId,
                    'assessment_scheme_id' => $scheme->id,
                    'grading_scale_id' => $scheme->grading_scale_id,
                    'scores' => $scores,
                    'entered_by' => $userId,
                    'status' => Result::STATUS_DRAFT,
                ];

                if ($existing) {
                    $existing->fill($payload)->save();
                } else {
                    Result::create($payload);
                }
                $saved++;
            }
        });

        return response()->json([
            'message' => "Saved {$saved} score(s)".($skipped ? ", skipped {$skipped} approved record(s)." : '.'),
            'saved' => $saved,
            'skipped' => $skipped,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_class_id' => ['required', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'subject_id' => ['required', 'integer'],
            'term_id' => ['required', 'integer'],
            'sub_term_id' => ['nullable', 'integer'],
        ]);

        $this->ensureCanTeach($request, $data['subject_id'], $data['arm_id'] ?? null);

        $count = $this->scopeResultsForPeriod(
            Result::query()
                ->where('school_class_id', $data['school_class_id'])
                ->when($data['arm_id'] ?? null, fn ($q, $armId) => $q->where('arm_id', $armId))
                ->where('subject_id', $data['subject_id'])
                ->where('term_id', $data['term_id'])
                ->where('status', Result::STATUS_DRAFT),
            $data['sub_term_id'] ?? null,
        )->update(['status' => Result::STATUS_SUBMITTED]);

        return response()->json(['submitted' => $count]);
    }

    public function approve(Request $request): JsonResponse
    {
        $data = $request->validate([
            'result_ids' => ['nullable', 'array'],
            'result_ids.*' => ['integer'],
            'school_class_id' => ['nullable', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
            'term_id' => ['nullable', 'integer'],
            'sub_term_id' => ['nullable', 'integer'],
        ]);

        $query = Result::query();
        if (! empty($data['result_ids'])) {
            $query->whereIn('id', $data['result_ids']);
        } else {
            foreach (['school_class_id', 'arm_id', 'subject_id', 'term_id'] as $col) {
                if (! empty($data[$col])) {
                    $query->where($col, $data[$col]);
                }
            }
            if (array_key_exists('sub_term_id', $data)) {
                $data['sub_term_id']
                    ? $query->where('sub_term_id', $data['sub_term_id'])
                    : $query->whereNull('sub_term_id');
            }
            $query->whereIn('status', [Result::STATUS_DRAFT, Result::STATUS_SUBMITTED]);
        }

        $count = $query->update([
            'status' => Result::STATUS_APPROVED,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['approved' => $count]);
    }

    /**
     * Report card. Now scheme-aware: subjects render their per-component
     * breakdown according to the scheme stamped on each result row.
     */
    public function reportCard(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'sub_term_id' => ['nullable', 'integer', 'exists:sub_terms,id'],
        ]);

        $user = $request->user();
        if ($user->role === User::ROLE_STUDENT && $student->user_id !== $user->id) {
            abort(403, 'You can only view your own report card.');
        }
        if ($user->role === User::ROLE_PARENT && $student->parent_user_id !== $user->id) {
            abort(403, 'You can only view your child\'s report card.');
        }

        $term = Term::with('academicSession')->findOrFail($data['term_id']);
        $subTermId = $data['sub_term_id'] ?? null;
        $tenantId = $student->tenant_id;

        $subTerm = $subTermId
            ? \App\Models\SubTerm::find($subTermId)
            : null;

        $results = $this->scopeResultsForPeriod(
            Result::query()
                ->with(['subject:id,code,name', 'assessmentScheme.components'])
                ->where('student_id', $student->id)
                ->where('term_id', $term->id),
            $subTermId,
        )->orderBy('subject_id')->get();

        $classId = $results->first()?->school_class_id;
        $position = null;
        $classSize = null;
        $classHighest = null;
        $classLowest = null;
        $classAverage = null;

        if ($classId) {
            $classAverages = $this->scopeResultsForPeriod(
                Result::query()
                    ->where('school_class_id', $classId)
                    ->where('term_id', $term->id),
                $subTermId,
            )->select('student_id', DB::raw('AVG(total) AS avg_total'))
                ->groupBy('student_id')
                ->orderByDesc('avg_total')
                ->get();

            $classSize = $classAverages->count();
            $rank = $classAverages->search(fn ($r) => (int) $r->student_id === $student->id);
            if ($rank !== false) {
                $position = $this->grader->ordinal($rank + 1);
            }
            $classHighest = (float) ($classAverages->max('avg_total') ?? 0);
            $classLowest = (float) ($classAverages->min('avg_total') ?? 0);
            $classAverage = $classAverages->count() > 0
                ? round((float) $classAverages->avg('avg_total'), 2)
                : 0;
        }

        $totalSum = $results->sum('total');
        $average = $results->count() > 0 ? round($totalSum / $results->count(), 2) : 0;

        // Use the scheme/scale stamped on the first result, if any, so the
        // report card legend matches what graded these scores.
        $stampedScheme = $results->first()?->assessmentScheme;
        $scale = $this->grader->resolveScale(
            $stampedScheme?->grading_scale_id,
            $stampedScheme,
            $tenantId,
        );
        $overallGrade = $this->grader->bandFor($average, $scale);

        $student->loadMissing('user:id,name', 'enrollments.schoolClass:id,name', 'enrollments.arm:id,name');
        $currentEnrollment = $student->enrollments
            ->where('session_year', $term->academicSession?->name)
            ->first();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'name' => $student->user?->name,
                'gender' => $student->gender,
                'class' => $currentEnrollment?->schoolClass?->name,
                'arm' => $currentEnrollment?->arm?->name,
            ],
            'session' => $term->academicSession?->only(['id', 'name']),
            'term' => $term->only(['id', 'name']),
            'sub_term' => $subTerm?->only(['id', 'name', 'kind']),
            'report_type' => $subTermId ? 'sub_term' : 'term',
            'subjects' => $results->map(fn (Result $r) => [
                'subject_id' => $r->subject_id,
                'subject_code' => $r->subject?->code,
                'subject_name' => $r->subject?->name,
                'scores' => $r->scores ?? [],
                'total' => $r->total,
                'grade' => $r->grade,
                'remark' => $r->remark,
                'status' => $r->status,
                'scheme' => $r->assessmentScheme ? [
                    'id' => $r->assessmentScheme->id,
                    'name' => $r->assessmentScheme->name,
                    'components' => $r->assessmentScheme->components->map(fn ($c) => [
                        'code' => $c->code,
                        'label' => $c->label,
                        'max_score' => (float) $c->max_score,
                    ])->values(),
                ] : null,
            ]),
            'summary' => [
                'subjects_offered' => $results->count(),
                'total_score' => round($totalSum, 2),
                'average' => $average,
                'overall_grade' => $overallGrade['grade'],
                'overall_remark' => $overallGrade['remark'],
                'class_size' => $classSize,
                'class_average' => $classAverage,
                'class_highest' => $classHighest !== null ? round($classHighest, 2) : null,
                'class_lowest' => $classLowest !== null ? round($classLowest, 2) : null,
                'position' => $position,
                'all_approved' => $results->isNotEmpty()
                    && $results->every(fn ($r) => $r->status === Result::STATUS_APPROVED),
            ],
            'grading_scale' => $scale ? $scale->bands->map(fn ($b) => [
                'min' => (float) $b->min_score,
                'max' => (float) $b->max_score,
                'grade' => $b->grade,
                'remark' => $b->remark,
            ]) : GradingService::FALLBACK_SCALE,
            'settings' => $this->settings->get($tenantId),
        ]);
    }

    /* ---------- helpers ---------- */

    /**
     * Pick the active scheme for the given term: term-specific override → 
     * session-specific → tenant default. Always returns components eager-loaded.
     */
    protected function resolveSchemeForTerm(Term $term, ?int $tenantId, ?int $subTermId = null): ?AssessmentScheme
    {
        $base = AssessmentScheme::with('components')
            ->where('is_active', true)
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId));

        if ($subTermId) {
            $subScheme = (clone $base)
                ->where('applies_to', 'sub_term')
                ->where('sub_term_id', $subTermId)
                ->first();
            if ($subScheme) {
                return $subScheme;
            }
        }

        $termLevel = (clone $base)
            ->where(function ($q) {
                $q->where('applies_to', 'term')->orWhereNull('applies_to');
            })
            ->whereNull('sub_term_id');

        $perTerm = (clone $termLevel)->where('term_id', $term->id)->first();
        if ($perTerm) {
            return $perTerm;
        }

        $perSession = (clone $termLevel)
            ->whereNull('term_id')
            ->where('academic_session_id', $term->academic_session_id)
            ->first();
        if ($perSession) {
            return $perSession;
        }

        return (clone $termLevel)
            ->whereNull('term_id')
            ->whereNull('academic_session_id')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Result>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Result>
     */
    protected function scopeResultsForPeriod($query, ?int $subTermId)
    {
        if ($subTermId) {
            return $query->where('sub_term_id', $subTermId);
        }

        return $query->whereNull('sub_term_id');
    }

    /**
     * Tenant-id resolution mirrors how `SubjectTeacherController` does it:
     * impersonating super-admin sends `X-Tenant-Id`; everyone else carries
     * `tenant_id` on their user row.
     */
    protected function resolveTenantId(Request $request): ?int
    {
        return $this->tenantContext->id() ?? $request->user()->tenant_id ?? null;
    }

    /**
     * Combine the legacy `ca1/ca2/midterm/exam` keys (if present) into the
     * canonical `scores` map so backward-compat callers keep working.
     */
    protected function mergeLegacyScores(array $row): array
    {
        $scores = $row['scores'] ?? [];
        foreach (Result::LEGACY_FIXED_COMPONENTS as $code) {
            if (array_key_exists($code, $row) && $row[$code] !== null) {
                $scores[$code] = (float) $row[$code];
            }
        }
        // Strip nulls to keep the JSON tidy.
        return collect($scores)
            ->filter(fn ($v) => $v !== null && $v !== '')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    /**
     * Compose the scoresheet's per-row scores map from a stored result. Falls
     * back to the legacy fixed columns when `scores` JSON is empty (i.e. row
     * was written before the migration).
     */
    protected function extractScoresMap(?Result $r, AssessmentScheme $scheme): array
    {
        $out = [];
        $stored = $r?->scores ?? [];

        foreach ($scheme->components as $c) {
            if (array_key_exists($c->code, $stored)) {
                $out[$c->code] = $stored[$c->code];
                continue;
            }
            // Legacy fall-through (only meaningful for ca1/ca2/midterm/exam).
            if ($r && in_array($c->code, Result::LEGACY_FIXED_COMPONENTS, true)) {
                $out[$c->code] = $r->{$c->code};
                continue;
            }
            $out[$c->code] = null;
        }
        return $out;
    }

    /**
     * Block teachers from entering scores for a subject/arm they aren't assigned
     * to. Admin/super-admin always pass through.
     */
    protected function ensureCanTeach(Request $request, int $subjectId, ?int $armId): void
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole(User::ROLE_TEACHER)) {
            return;
        }

        $hasAnyAssignment = SubjectTeacher::where('subject_id', $subjectId)->exists();
        if (! $hasAnyAssignment) {
            return;
        }

        $allowed = SubjectTeacher::where('subject_id', $subjectId)
            ->where('teacher_user_id', $user->id)
            ->when($armId, fn ($q) => $q->where('arm_id', $armId))
            ->exists();

        abort_unless($allowed, 403, 'You are not assigned to teach this subject for this class.');
    }

    /**
     * Honor the term's `result_entry_deadline`. Admins (and super-admins)
     * can still enter past the deadline so they can correct mistakes.
     */
    protected function ensureEntryWindowOpen(Request $request, Term $term): void
    {
        if (! $term->result_entry_deadline) {
            return;
        }
        $user = $request->user();
        if ($user && in_array($user->role, [User::ROLE_SCHOOL_ADMIN, User::ROLE_SUPER_ADMIN], true)) {
            return;
        }
        if (now()->startOfDay()->gt($term->result_entry_deadline)) {
            abort(422, 'The score entry deadline for this term has passed. Contact your school admin.');
        }
    }
}

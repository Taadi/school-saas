<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationPeriod;
use App\Models\EvaluationResponse;
use App\Models\EvaluationResponseItem;
use App\Models\EvaluationRubric;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Term;
use App\Models\User;
use App\Services\EvaluationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluationResponseController extends Controller
{
    public function __construct(
        protected EvaluationService $evaluationService,
        protected TenantContext $tenantContext,
    ) {}

    public function periods(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rubric_id' => ['required', 'integer', 'exists:evaluation_rubrics,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
        ]);

        $periods = EvaluationPeriod::where('evaluation_rubric_id', $data['rubric_id'])
            ->where('term_id', $data['term_id'])
            ->orderBy('ordinal')
            ->get();

        return response()->json(['data' => $periods]);
    }

    /**
     * Create weekly (or N) evaluation periods for a rubric + term.
     */
    public function generatePeriods(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rubric_id' => ['required', 'integer', 'exists:evaluation_rubrics,id'],
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'count' => ['nullable', 'integer', 'min:1', 'max:52'],
        ]);

        $count = (int) ($data['count'] ?? 12);
        $rubricId = (int) $data['rubric_id'];
        $termId = (int) $data['term_id'];
        $tenantId = $this->tenantContext->id();

        $created = 0;
        $existing = EvaluationPeriod::where('evaluation_rubric_id', $rubricId)
            ->where('term_id', $termId)
            ->max('ordinal') ?? 0;

        DB::transaction(function () use ($count, $rubricId, $termId, $tenantId, $existing, &$created) {
            for ($i = 1; $i <= $count; $i++) {
                $ordinal = $existing + $i;
                if (EvaluationPeriod::where('evaluation_rubric_id', $rubricId)
                    ->where('term_id', $termId)
                    ->where('ordinal', $ordinal)
                    ->exists()) {
                    continue;
                }
                EvaluationPeriod::create([
                    'tenant_id' => $tenantId,
                    'evaluation_rubric_id' => $rubricId,
                    'term_id' => $termId,
                    'label' => "Week {$ordinal}",
                    'ordinal' => $ordinal,
                    'locked' => false,
                ]);
                $created++;
            }
        });

        return response()->json([
            'message' => "Created {$created} period(s).",
            'created' => $created,
        ]);
    }

    /**
     * Evaluation entry sheet: students in arm + existing responses for a period.
     */
    public function sheet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
            'school_class_id' => ['required', 'integer', 'exists:school_classes,id'],
            'arm_id' => ['nullable', 'integer', 'exists:arms,id'],
        ]);

        $period = EvaluationPeriod::with(['rubric.items', 'term.academicSession'])->findOrFail($data['period_id']);
        $sessionYear = $period->term->academicSession?->name;

        $studentIds = StudentClass::query()
            ->where('school_class_id', $data['school_class_id'])
            ->when($data['arm_id'] ?? null, fn ($q, $armId) => $q->where('arm_id', $armId))
            ->when($sessionYear, fn ($q) => $q->where('session_year', $sessionYear))
            ->where('status', 'active')
            ->pluck('student_id')
            ->unique();

        if ($studentIds->isEmpty()) {
            $studentIds = StudentClass::query()
                ->where('school_class_id', $data['school_class_id'])
                ->when($data['arm_id'] ?? null, fn ($q, $armId) => $q->where('arm_id', $armId))
                ->where('status', 'active')
                ->pluck('student_id')
                ->unique();
        }

        $students = Student::with('user:id,name')
            ->whereIn('id', $studentIds)
            ->orderBy('admission_number')
            ->get(['id', 'user_id', 'admission_number']);

        $responses = EvaluationResponse::with('items.item')
            ->where('evaluation_period_id', $period->id)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy('student_id');

        $rows = $students->map(function (Student $student) use ($responses, $period) {
            $resp = $responses[$student->id] ?? null;
            $answers = [];
            if ($resp) {
                foreach ($resp->items as $ri) {
                    $code = $ri->item?->code;
                    if (! $code) {
                        continue;
                    }
                    $answers[$code] = $ri->value_numeric !== null
                        ? $ri->value_numeric
                        : $ri->value_text;
                }
            }

            return [
                'student_id' => $student->id,
                'admission_number' => $student->admission_number,
                'name' => $student->user?->name,
                'response_id' => $resp?->id,
                'answers' => $answers,
                'overall_score' => $resp?->overall_score,
                'status' => $resp?->status ?? EvaluationResponse::STATUS_DRAFT,
            ];
        });

        return response()->json([
            'data' => $rows,
            'context' => [
                'period' => $period->only(['id', 'label', 'ordinal', 'locked']),
                'rubric' => [
                    'id' => $period->rubric->id,
                    'name' => $period->rubric->name,
                    'items' => $period->rubric->items->map(fn ($i) => [
                        'id' => $i->id,
                        'code' => $i->code,
                        'label' => $i->label,
                        'type' => $i->type,
                        'choices' => $i->choices,
                        'weight' => (float) $i->weight,
                    ])->values(),
                ],
                'term' => $period->term?->only(['id', 'name']),
                'session' => $period->term?->academicSession?->only(['id', 'name']),
            ],
        ]);
    }

    public function bulkUpsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
            'school_class_id' => ['required', 'integer'],
            'arm_id' => ['nullable', 'integer'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'rows.*.answers' => ['nullable', 'array'],
            'rows.*.overall_remark' => ['nullable', 'string', 'max:255'],
        ]);

        $period = EvaluationPeriod::with('rubric.items')->findOrFail($data['period_id']);
        abort_if($period->locked, 422, 'This evaluation period is locked.');

        $tenantId = $this->tenantContext->id();
        $userId = $request->user()->id;
        $saved = 0;

        DB::transaction(function () use ($data, $period, $tenantId, $userId, &$saved) {
            foreach ($data['rows'] as $row) {
                $normalized = $this->evaluationService->normalizeAnswers(
                    $period->rubric,
                    $row['answers'] ?? [],
                );

                $response = EvaluationResponse::firstOrNew([
                    'evaluation_period_id' => $period->id,
                    'student_id' => $row['student_id'],
                ]);

                $response->fill([
                    'tenant_id' => $tenantId,
                    'evaluation_rubric_id' => $period->evaluation_rubric_id,
                    'arm_id' => $data['arm_id'] ?? null,
                    'submitted_by' => $userId,
                    'submitted_at' => now(),
                    'overall_score' => $normalized['overall_score'],
                    'overall_remark' => $row['overall_remark'] ?? $response->overall_remark,
                    'status' => EvaluationResponse::STATUS_DRAFT,
                ]);
                $response->save();

                $response->items()->delete();
                foreach ($period->rubric->items as $item) {
                    if (! isset($normalized['items'][$item->code])) {
                        continue;
                    }
                    $parsed = $normalized['items'][$item->code];
                    EvaluationResponseItem::create([
                        'tenant_id' => $tenantId,
                        'evaluation_response_id' => $response->id,
                        'evaluation_item_id' => $item->id,
                        'value_numeric' => $parsed['value_numeric'],
                        'value_text' => $parsed['value_text'],
                    ]);
                }
                $saved++;
            }
        });

        return response()->json(['message' => "Saved {$saved} evaluation(s).", 'saved' => $saved]);
    }

    /**
     * Weekly timeline for a student (parent / student / admin view).
     */
    public function studentTimeline(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'term_id' => ['required', 'integer', 'exists:terms,id'],
            'rubric_id' => ['nullable', 'integer', 'exists:evaluation_rubrics,id'],
        ]);

        $user = $request->user();
        if ($user->role === User::ROLE_STUDENT && $student->user_id !== $user->id) {
            abort(403);
        }
        if ($user->role === User::ROLE_PARENT && $student->parent_user_id !== $user->id) {
            abort(403);
        }

        $query = EvaluationResponse::with(['period:id,label,ordinal', 'rubric:id,name'])
            ->where('student_id', $student->id)
            ->whereHas('period', fn ($q) => $q->where('term_id', $data['term_id']));

        if (! empty($data['rubric_id'])) {
            $query->where('evaluation_rubric_id', $data['rubric_id']);
        }

        $rows = $query->get()->sortBy(fn ($r) => $r->period?->ordinal ?? 0)->values();

        return response()->json([
            'student' => [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'name' => $student->user?->name,
            ],
            'data' => $rows->map(fn ($r) => [
                'period_id' => $r->evaluation_period_id,
                'period_label' => $r->period?->label,
                'rubric_name' => $r->rubric?->name,
                'overall_score' => $r->overall_score,
                'overall_remark' => $r->overall_remark,
                'status' => $r->status,
                'submitted_at' => $r->submitted_at,
            ]),
        ]);
    }
}

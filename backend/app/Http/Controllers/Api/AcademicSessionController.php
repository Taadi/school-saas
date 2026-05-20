<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\StudentClass;
use App\Models\Term;
use App\Services\SubTermService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AcademicSessionController extends Controller
{
    public function __construct(protected SubTermService $subTermService) {}

    public function index(): JsonResponse
    {
        $sessions = AcademicSession::query()
            ->with('terms')
            ->orderByDesc('is_current')
            ->orderByDesc('name')
            ->get();

        return response()->json(['data' => $sessions]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'regex:/^\d{4}\/\d{4}$/'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_current' => ['nullable', 'boolean'],
            'status' => ['nullable', Rule::in(['upcoming', 'active', 'completed'])],
        ]);

        return DB::transaction(function () use ($data) {
            if (! empty($data['is_current'])) {
                AcademicSession::query()->update(['is_current' => false]);
            }

            $session = AcademicSession::create([
                'name' => $data['name'],
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'is_current' => $data['is_current'] ?? false,
                'status' => $data['status'] ?? 'upcoming',
            ]);

            foreach (['first', 'second', 'third'] as $i => $name) {
                $term = Term::create([
                    'academic_session_id' => $session->id,
                    'name' => $name,
                    'is_current' => false,
                ]);
                $this->subTermService->seedForTerm($term);
            }

            $session->load('terms.subTerms');

            return response()->json(['data' => $session], 201);
        });
    }

    public function update(Request $request, AcademicSession $session): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'regex:/^\d{4}\/\d{4}$/'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date'],
            'is_current' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['upcoming', 'active', 'completed'])],
        ]);

        DB::transaction(function () use ($data, $session) {
            if (! empty($data['is_current'])) {
                AcademicSession::where('id', '!=', $session->id)
                    ->update(['is_current' => false]);
            }

            $session->update($data);
        });

        return response()->json(['data' => $session->fresh('terms')]);
    }

    public function destroy(AcademicSession $session): JsonResponse
    {
        $session->delete();
        return response()->json(['message' => 'Session deleted.']);
    }

    public function setCurrent(AcademicSession $session): JsonResponse
    {
        DB::transaction(function () use ($session) {
            AcademicSession::query()->update(['is_current' => false]);
            $session->update(['is_current' => true, 'status' => 'active']);
        });

        return response()->json(['data' => $session->fresh('terms')]);
    }

    /**
     * Carry every active enrollment forward into the given session.
     *
     * For each (student, class, arm) that was active in the most recent prior
     * session and *doesn't already* have an enrollment row in the target
     * session, create one. Returns a summary so the UI can confirm before
     * the admin walks away.
     *
     * Idempotent: re-running it on an already-promoted session is a no-op.
     */
    public function promoteEnrollments(AcademicSession $session): JsonResponse
    {
        $tenantId = $session->tenant_id;

        $existingPairs = StudentClass::query()
            ->where('tenant_id', $tenantId)
            ->where('session_year', $session->name)
            ->get(['student_id', 'school_class_id', 'arm_id'])
            ->map(fn ($r) => $r->student_id.':'.$r->school_class_id.':'.($r->arm_id ?? 'null'))
            ->all();
        $existingSet = array_flip($existingPairs);

        $sourceCandidates = StudentClass::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('session_year', '!=', $session->name)
            ->orderByDesc('id')
            ->get();

        $seenStudents = [];
        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($sourceCandidates, $existingSet, $session, &$created, &$skipped, &$seenStudents) {
            foreach ($sourceCandidates as $row) {
                // One row per student — pick the most recent (already ordered DESC by id).
                if (isset($seenStudents[$row->student_id])) {
                    continue;
                }
                $seenStudents[$row->student_id] = true;

                $key = $row->student_id.':'.$row->school_class_id.':'.($row->arm_id ?? 'null');
                if (isset($existingSet[$key])) {
                    $skipped++;
                    continue;
                }

                StudentClass::create([
                    'tenant_id' => $row->tenant_id,
                    'student_id' => $row->student_id,
                    'school_class_id' => $row->school_class_id,
                    'arm_id' => $row->arm_id,
                    'session_year' => $session->name,
                    'term' => 'first',
                    'status' => 'active',
                ]);
                $created++;
            }
        });

        return response()->json([
            'message' => "Promoted {$created} student(s) into {$session->name}"
                .($skipped ? ", skipped {$skipped} already-enrolled." : '.'),
            'created' => $created,
            'skipped' => $skipped,
        ]);
    }

    /**
     * Update or create a term inside a given session, and optionally mark current.
     */
    public function updateTerm(Request $request, AcademicSession $session, Term $term): JsonResponse
    {
        abort_if($term->academic_session_id !== $session->id, 404);

        $data = $request->validate([
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date'],
            'is_current' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($data, $term) {
            if (! empty($data['is_current'])) {
                Term::query()->update(['is_current' => false]);
            }
            $term->update($data);
        });

        return response()->json(['data' => $term->fresh()]);
    }
}

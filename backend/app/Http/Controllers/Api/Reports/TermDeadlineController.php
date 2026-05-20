<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lightweight endpoint to manage Tab 7 (Term Begins/Ends + Deadlines) without
 * forcing every UI to round-trip through the AcademicSession controller.
 * Updates only the date fields; everything else (name, current flag) stays
 * with `AcademicSessionController::updateTerm`.
 */
class TermDeadlineController extends Controller
{
    public function update(Request $request, Term $term): JsonResponse
    {
        $data = $request->validate([
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'result_entry_deadline' => ['sometimes', 'nullable', 'date'],
            'result_approval_deadline' => ['sometimes', 'nullable', 'date'],
        ]);

        $term->update($data);

        return response()->json(['data' => $term->fresh()]);
    }
}

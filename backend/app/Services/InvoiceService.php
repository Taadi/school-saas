<?php

namespace App\Services;

use App\Models\AcademicSession;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\Term;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceService
{
    /**
     * Generate an invoice number unique per tenant.
     * Format: INV-{YEAR}-{SEQ}
     */
    public function generateInvoiceNumber(School $school, ?int $year = null): string
    {
        $year ??= (int) now()->year;
        $base = "INV-{$year}-";

        $last = Invoice::query()
            ->withoutTenant()
            ->where('tenant_id', $school->id)
            ->where('invoice_number', 'like', $base.'%')
            ->orderByDesc('id')
            ->value('invoice_number');

        $next = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }

        return $base.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Create or refresh an invoice for a single student in a given term.
     * Returns null when there is no fee structure to apply.
     */
    public function generateForStudent(
        School $school,
        Student $student,
        Term $term,
        ?int $schoolClassId = null,
        ?int $armId = null,
        bool $includeOptional = false,
    ): ?Invoice {
        $schoolClassId = $schoolClassId ?: $this->latestEnrollmentClass($student)?->school_class_id;
        $armId = $armId ?: $this->latestEnrollmentClass($student)?->arm_id;

        if (! $schoolClassId) {
            return null;
        }

        $structures = $this->resolveStructures(
            $school->id,
            $term,
            $schoolClassId,
            $armId,
            $includeOptional,
        );

        if ($structures->isEmpty()) {
            return null;
        }

        return DB::transaction(function () use ($school, $student, $term, $schoolClassId, $armId, $structures) {
            $invoice = Invoice::firstOrNew([
                'student_id' => $student->id,
                'term_id' => $term->id,
            ]);

            if (! $invoice->exists) {
                $invoice->fill([
                    'tenant_id' => $school->id,
                    'school_class_id' => $schoolClassId,
                    'arm_id' => $armId,
                    'academic_session_id' => $term->academic_session_id,
                    'invoice_number' => $this->generateInvoiceNumber($school),
                    'issued_on' => now()->toDateString(),
                    'due_date' => $term->end_date ?: null,
                ])->save();
            }

            // Replace items so that updated structures reflect on regeneration.
            // Existing payments are preserved; recalculate at the end.
            $invoice->items()->delete();

            foreach ($structures as $structure) {
                InvoiceItem::create([
                    'tenant_id' => $school->id,
                    'invoice_id' => $invoice->id,
                    'fee_category_id' => $structure->fee_category_id,
                    'fee_structure_id' => $structure->id,
                    'description' => $structure->category?->name
                        ?? "Fee #{$structure->fee_category_id}",
                    'amount' => $structure->amount,
                ]);
            }

            $invoice->refresh()->recalculate();

            return $invoice->fresh(['items.category', 'payments']);
        });
    }

    /**
     * Bulk-generate invoices for every active student enrolled in a class
     * (and arm, if specified) for the given term.
     *
     * @return array{created:int, refreshed:int, skipped:int}
     */
    public function generateForClass(
        School $school,
        int $schoolClassId,
        Term $term,
        ?int $armId = null,
        bool $includeOptional = false,
        bool $regenerate = false,
    ): array {
        $sessionYear = $term->academicSession?->name;

        $query = StudentClass::query()
            ->where('school_class_id', $schoolClassId);

        if ($armId) {
            $query->where('arm_id', $armId);
        }
        if ($sessionYear) {
            $query->where('session_year', $sessionYear);
        }

        $studentIds = $query->pluck('student_id')->unique()->values();

        $created = 0;
        $refreshed = 0;
        $skipped = 0;

        Student::query()
            ->whereIn('id', $studentIds)
            ->active()
            ->chunk(100, function ($students) use (
                $school, $term, $schoolClassId, $armId, $includeOptional, $regenerate,
                &$created, &$refreshed, &$skipped,
            ) {
                foreach ($students as $student) {
                    $existing = Invoice::query()
                        ->where('student_id', $student->id)
                        ->where('term_id', $term->id)
                        ->first();

                    if ($existing && ! $regenerate) {
                        $skipped++;
                        continue;
                    }

                    $invoice = $this->generateForStudent(
                        $school,
                        $student,
                        $term,
                        $schoolClassId,
                        $armId,
                        $includeOptional,
                    );

                    if (! $invoice) {
                        $skipped++;
                        continue;
                    }

                    if ($existing) {
                        $refreshed++;
                    } else {
                        $created++;
                    }
                }
            });

        return compact('created', 'refreshed', 'skipped');
    }

    /**
     * Resolve fee structures that apply to a given class+arm+term,
     * including session-wide structures (term_id null) and
     * arm-agnostic structures (arm_id null).
     */
    protected function resolveStructures(
        int $tenantId,
        Term $term,
        int $schoolClassId,
        ?int $armId,
        bool $includeOptional,
    ): Collection {
        $query = FeeStructure::query()
            ->with('category')
            ->where('tenant_id', $tenantId)
            ->where('school_class_id', $schoolClassId)
            ->where('academic_session_id', $term->academic_session_id)
            ->where(function ($q) use ($term) {
                $q->whereNull('term_id')->orWhere('term_id', $term->id);
            })
            ->where(function ($q) use ($armId) {
                $q->whereNull('arm_id');
                if ($armId) {
                    $q->orWhere('arm_id', $armId);
                }
            });

        if (! $includeOptional) {
            $query->where('is_optional', false);
        }

        // Prefer the most specific structure (arm + term) over generic ones
        // when the same category appears more than once.
        return $query->get()->groupBy('fee_category_id')->map(function (Collection $group) {
            return $group->sortByDesc(fn (FeeStructure $s) => ($s->arm_id ? 2 : 0) + ($s->term_id ? 1 : 0))->first();
        })->values();
    }

    protected function latestEnrollmentClass(Student $student): ?StudentClass
    {
        return StudentClass::query()
            ->where('student_id', $student->id)
            ->orderByDesc('id')
            ->first();
    }
}

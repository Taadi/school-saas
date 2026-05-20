<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Services\GradingService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Result extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED = 'approved';

    /** @deprecated Kept for migration backward-compat; new code uses `scores`. */
    public const LEGACY_FIXED_COMPONENTS = ['ca1', 'ca2', 'midterm', 'exam'];

    protected $fillable = [
        'tenant_id',
        'student_id',
        'subject_id',
        'school_class_id',
        'arm_id',
        'academic_session_id',
        'term_id',
        'sub_term_id',
        'assessment_scheme_id',
        'grading_scale_id',
        'scores',
        'ca1',
        'ca2',
        'midterm',
        'exam',
        'total',
        'grade',
        'remark',
        'status',
        'entered_by',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'scores' => 'array',
            'ca1' => 'float',
            'ca2' => 'float',
            'midterm' => 'float',
            'exam' => 'float',
            'total' => 'float',
            'approved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Result $result) {
            // Backward-compat: if a caller wrote into the legacy fixed columns
            // but didn't populate `scores`, hydrate the JSON from them so
            // `GradingService` can compute the total uniformly.
            if (! $result->scores) {
                $legacy = collect(self::LEGACY_FIXED_COMPONENTS)
                    ->mapWithKeys(fn ($k) => [$k => $result->{$k}])
                    ->filter(fn ($v) => $v !== null)
                    ->toArray();
                if (! empty($legacy)) {
                    $result->scores = $legacy;
                }
            }

            $grader = app(GradingService::class);
            $payload = $grader->compute(
                $result->scores ?? [],
                $result->assessment_scheme_id,
                $result->grading_scale_id,
                $result->tenant_id,
            );

            $result->total = $payload['total'];
            $result->grade = $payload['grade'];
            // Preserve a teacher-edited remark; otherwise use the band's.
            $result->remark = $result->remark ?: $payload['remark'];

            // Mirror back into the legacy columns when the canonical names are
            // present, so the existing UI keeps working through the migration.
            foreach (self::LEGACY_FIXED_COMPONENTS as $code) {
                if (isset($result->scores[$code])) {
                    $result->{$code} = $result->scores[$code];
                }
            }
        });
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function arm(): BelongsTo
    {
        return $this->belongsTo(Arm::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    public function subTerm(): BelongsTo
    {
        return $this->belongsTo(SubTerm::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function assessmentScheme(): BelongsTo
    {
        return $this->belongsTo(AssessmentScheme::class);
    }

    public function gradingScale(): BelongsTo
    {
        return $this->belongsTo(GradingScale::class);
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

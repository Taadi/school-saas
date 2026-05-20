<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationResponse extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED = 'approved';

    protected $fillable = [
        'tenant_id',
        'evaluation_rubric_id',
        'evaluation_period_id',
        'student_id',
        'arm_id',
        'submitted_by',
        'submitted_at',
        'overall_score',
        'overall_remark',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'overall_score' => 'float',
        ];
    }

    public function rubric(): BelongsTo
    {
        return $this->belongsTo(EvaluationRubric::class, 'evaluation_rubric_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriod::class, 'evaluation_period_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(EvaluationResponseItem::class);
    }
}

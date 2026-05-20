<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssessmentScheme extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'academic_session_id',
        'term_id',
        'applies_to',
        'sub_term_id',
        'grading_scale_id',
        'total_max',
        'is_default',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_max' => 'float',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function components(): HasMany
    {
        return $this->hasMany(AssessmentComponent::class)->orderBy('sort_order');
    }

    public function gradingScale(): BelongsTo
    {
        return $this->belongsTo(GradingScale::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    public function subTerm(): BelongsTo
    {
        return $this->belongsTo(SubTerm::class);
    }

    /**
     * Recompute total_max from current components and persist. Called after
     * any component CRUD. Cheap because each scheme has a handful of rows.
     */
    public function recalculateTotalMax(): void
    {
        $sum = (float) $this->components()->sum('max_score');
        if ((float) $this->total_max !== $sum) {
            $this->update(['total_max' => $sum]);
        }
    }
}

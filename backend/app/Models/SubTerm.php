<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubTerm extends Model
{
    use BelongsToTenant, HasFactory;

    public const KIND_MIDTERM = 'midterm';
    public const KIND_WINDOW = 'window';
    public const KIND_WEEKLY = 'weekly';
    public const KIND_CUSTOM = 'custom';

    protected $fillable = [
        'tenant_id',
        'term_id',
        'name',
        'kind',
        'ordinal',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'ordinal' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    public function assessmentSchemes(): HasMany
    {
        return $this->hasMany(AssessmentScheme::class);
    }
}

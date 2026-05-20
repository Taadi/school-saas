<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentComponent extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'assessment_scheme_id',
        'code',
        'label',
        'max_score',
        'weight',
        'is_exam',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'max_score' => 'float',
            'weight' => 'float',
            'is_exam' => 'boolean',
            'sort_order' => 'int',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn (self $c) => $c->scheme?->recalculateTotalMax());
        static::deleted(fn (self $c) => $c->scheme?->recalculateTotalMax());
    }

    public function scheme(): BelongsTo
    {
        return $this->belongsTo(AssessmentScheme::class, 'assessment_scheme_id');
    }
}

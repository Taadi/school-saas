<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'evaluation_rubric_id',
        'code',
        'label',
        'type',
        'choices',
        'weight',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'choices' => 'array',
            'weight' => 'float',
            'sort_order' => 'integer',
        ];
    }

    public function rubric(): BelongsTo
    {
        return $this->belongsTo(EvaluationRubric::class, 'evaluation_rubric_id');
    }
}

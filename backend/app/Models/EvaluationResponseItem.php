<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationResponseItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'evaluation_response_id',
        'evaluation_item_id',
        'value_numeric',
        'value_text',
    ];

    protected function casts(): array
    {
        return [
            'value_numeric' => 'float',
        ];
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(EvaluationResponse::class, 'evaluation_response_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(EvaluationItem::class, 'evaluation_item_id');
    }
}

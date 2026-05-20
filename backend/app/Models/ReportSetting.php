<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ReportSetting extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'data'];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }
}

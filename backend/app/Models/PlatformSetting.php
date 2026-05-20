<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['data'];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public static function singleton(): self
    {
        return static::query()->firstOrCreate([], ['data' => []]);
    }
}

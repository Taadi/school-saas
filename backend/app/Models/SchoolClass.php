<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'school_classes';

    protected $fillable = [
        'tenant_id',
        'name',
        'level',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    public function arms(): HasMany
    {
        return $this->hasMany(Arm::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentClass::class);
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'class_subject')
            ->withPivot(['is_compulsory', 'tenant_id'])
            ->withTimestamps();
    }
}

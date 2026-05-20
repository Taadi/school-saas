<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class School extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'motto',
        'logo_path',
        'subscription_status',
        'subscription_expires_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'subscription_expires_at' => 'date',
            'settings' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function admins(): HasMany
    {
        return $this->users()->where('role', 'school_admin');
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'tenant_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'tenant_id');
    }
}

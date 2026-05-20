<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'description',
    ];

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'class_subject')
            ->withPivot(['is_compulsory', 'tenant_id'])
            ->withTimestamps();
    }

    /**
     * Per-arm teacher assignments for this subject.
     */
    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(SubjectTeacher::class);
    }

    /**
     * Subject groupings used by report card layout (Core, Sciences, …).
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(
            SubjectGroup::class,
            'subject_group_subject',
            'subject_id',
            'subject_group_id',
        )->withTimestamps();
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentClass extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'student_class';

    protected $fillable = [
        'tenant_id',
        'student_id',
        'school_class_id',
        'arm_id',
        'session_year',
        'term',
        'status',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function arm(): BelongsTo
    {
        return $this->belongsTo(Arm::class);
    }
}

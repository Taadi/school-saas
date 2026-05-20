<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Term extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'academic_session_id',
        'name',
        'start_date',
        'end_date',
        'result_entry_deadline',
        'result_approval_deadline',
        'is_current',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'result_entry_deadline' => 'date',
            'result_approval_deadline' => 'date',
            'is_current' => 'boolean',
        ];
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function subTerms(): HasMany
    {
        return $this->hasMany(SubTerm::class)->orderBy('ordinal');
    }
}

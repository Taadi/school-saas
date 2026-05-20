<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_ON_LEAVE = 'on_leave';
    public const STATUS_RESIGNED = 'resigned';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_ON_LEAVE,
        self::STATUS_RESIGNED,
    ];

    protected $fillable = [
        'tenant_id',
        'user_id',
        'staff_id',
        'qualification',
        'years_of_experience',
        'subject_specialization',
        'date_employed',
        'salary_amount',
        'bank_name',
        'account_number',
        'account_name',
        'date_of_birth',
        'gender',
        'marital_status',
        'phone_secondary',
        'address',
        'state_of_origin',
        'lga',
        'next_of_kin_name',
        'next_of_kin_phone',
        'next_of_kin_relationship',
        'passport_photo',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_employed' => 'date',
            'date_of_birth' => 'date',
            'salary_amount' => 'decimal:2',
            'years_of_experience' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);
        if ($term === '') return $query;

        return $query->where(function (Builder $q) use ($term) {
            $q->where('staff_id', 'like', "%{$term}%")
                ->orWhere('subject_specialization', 'like', "%{$term}%")
                ->orWhere('qualification', 'like', "%{$term}%")
                ->orWhereHas('user', function (Builder $uq) use ($term) {
                    $uq->withoutGlobalScopes()
                        ->where(function (Builder $i) use ($term) {
                            $i->where('name', 'like', "%{$term}%")
                                ->orWhere('email', 'like', "%{$term}%")
                                ->orWhere('phone', 'like', "%{$term}%");
                        });
                });
        });
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_GRADUATED = 'graduated';
    public const STATUS_TRANSFERRED = 'transferred';
    public const STATUS_WITHDRAWN = 'withdrawn';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'parent_user_id',
        'admission_number',
        'date_of_birth',
        'gender',
        'religion',
        'state_of_origin',
        'lga',
        'address',
        'guardian_name',
        'guardian_phone',
        'guardian_email',
        'guardian_relationship',
        'blood_group',
        'photo_path',
        'admitted_on',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admitted_on' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentClass::class);
    }

    public function fees(): HasMany
    {
        return $this->hasMany(Fee::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);

        if ($term === '') {
            return $query;
        }

        return $query
            ->where(function (Builder $q) use ($term) {
                $q->where('admission_number', 'like', "%{$term}%")
                    ->orWhere('guardian_name', 'like', "%{$term}%")
                    ->orWhere('guardian_phone', 'like', "%{$term}%")
                    ->orWhereHas('user', function (Builder $uq) use ($term) {
                        $uq->withoutGlobalScopes()
                            ->where(function (Builder $inner) use ($term) {
                                $inner->where('name', 'like', "%{$term}%")
                                    ->orWhere('email', 'like', "%{$term}%");
                            });
                    });
            });
    }

    /**
     * Scope to students currently enrolled in a given class (latest enrollment).
     */
    public function scopeInClass(Builder $query, int $classId): Builder
    {
        return $query->whereHas('enrollments', function (Builder $q) use ($classId) {
            $q->where('school_class_id', $classId);
        });
    }

    public function scopeInArm(Builder $query, int $armId): Builder
    {
        return $query->whereHas('enrollments', function (Builder $q) use ($armId) {
            $q->where('arm_id', $armId);
        });
    }
}

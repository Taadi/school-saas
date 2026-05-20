<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'tenant_id',
        'student_id',
        'school_class_id',
        'arm_id',
        'academic_session_id',
        'term_id',
        'invoice_number',
        'total_amount',
        'amount_paid',
        'balance',
        'status',
        'due_date',
        'issued_on',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'amount_paid' => 'float',
            'balance' => 'float',
            'due_date' => 'date',
            'issued_on' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function arm(): BelongsTo
    {
        return $this->belongsTo(Arm::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Recalculate totals + payment status from items and payments.
     * Call after attaching/removing items or recording payments.
     */
    public function recalculate(): void
    {
        $total = (float) $this->items()->sum('amount');
        $paid = (float) $this->payments()->sum('amount');
        $balance = round($total - $paid, 2);

        $status = match (true) {
            $paid <= 0 => self::STATUS_PENDING,
            $balance <= 0 => self::STATUS_PAID,
            default => self::STATUS_PARTIAL,
        };

        $this->forceFill([
            'total_amount' => round($total, 2),
            'amount_paid' => round($paid, 2),
            'balance' => max(0, $balance),
            'status' => $status,
        ])->save();
    }
}

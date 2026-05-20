<?php

namespace App\Models\Concerns;

use App\Models\School;
use App\Models\Scopes\TenantScope;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        // Stamp tenant_id on creation if not explicitly set.
        static::creating(function ($model) {
            $column = $model->getTenantColumn();

            if (empty($model->{$column})) {
                $tenantId = app(TenantContext::class)->id();

                if ($tenantId !== null) {
                    $model->{$column} = $tenantId;
                }
            }
        });
    }

    public function getTenantColumn(): string
    {
        return defined(static::class.'::TENANT_COLUMN')
            ? static::TENANT_COLUMN
            : 'tenant_id';
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(School::class, $this->getTenantColumn());
    }

    /**
     * Escape hatch — Super Admin / system jobs use this to query across all schools.
     */
    public function scopeWithoutTenant($query)
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }
}

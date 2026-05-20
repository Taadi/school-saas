<?php

namespace App\Models\Scopes;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Constrains every query on a tenant-owned model to the current tenant.
 *
 * Models opt-in via the BelongsToTenant trait. When no tenant is set
 * (e.g. Super Admin context, console, queue worker before context is
 * resolved), the scope is a no-op — callers must apply their own filters.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(TenantContext::class)->id();

        if ($tenantId === null) {
            return;
        }

        $builder->where(
            $model->getTable().'.'.$model->getTenantColumn(),
            $tenantId
        );
    }
}

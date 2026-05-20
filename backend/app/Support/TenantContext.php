<?php

namespace App\Support;

/**
 * Holds the current tenant (school) id for the request lifecycle.
 *
 * Set by the EnsureTenant middleware after authentication, or manually
 * during seeding / queue jobs. When null, queries are unscoped — only
 * Super Admins should ever operate without a tenant.
 */
class TenantContext
{
    protected ?int $tenantId = null;

    public function set(?int $tenantId): void
    {
        $this->tenantId = $tenantId;
    }

    public function id(): ?int
    {
        return $this->tenantId;
    }

    public function has(): bool
    {
        return $this->tenantId !== null;
    }

    public function clear(): void
    {
        $this->tenantId = null;
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenant
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        // 1. Let pre-flight OPTIONS requests pass through unhindered
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        /** @var User|null $user */
        $user = $request->user();

        // 2. Use abort(401) so Laravel's exception handler applies your CORS config
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->isSuperAdmin()) {
            $impersonated = $request->header('X-Tenant-Id');
            $tenantId = $impersonated ? (int) $impersonated : null;
            $this->context->set($tenantId);

            if ($tenantId === null && $this->requiresTenantForSuperAdmin($request)) {
                abort(403, 'Select a school from the platform console (Open as admin) to continue.');
            }

            return $next($request);
        }

        // 3. Use abort(403) so Laravel's exception handler applies your CORS config
        if (! $user->tenant_id) {
            abort(403, 'User is not associated with any school.');
        }

        $this->context->set((int) $user->tenant_id);

        return $next($request);
    }

    /**
     * Platform routes work without a tenant; all other API routes require
     * X-Tenant-Id when the caller is a super admin.
     */
    protected function requiresTenantForSuperAdmin(Request $request): bool
    {
        $path = $request->path();

        foreach ([
            'api/admin',
            'api/auth',
            'api/account',
            'api/branding',
        ] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return false;
            }
        }

        return true;
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the tenant for the current request from the authenticated user
 * and binds it to the TenantContext singleton, which the global TenantScope
 * uses to filter every tenant-owned query.
 *
 * Super Admins (landlord) bypass tenant scoping by default. They can target
 * a specific school by sending an `X-Tenant-Id` header.
 */
class EnsureTenant
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            $impersonated = $request->header('X-Tenant-Id');
            $this->context->set($impersonated ? (int) $impersonated : null);

            return $next($request);
        }

        if (! $user->tenant_id) {
            return response()->json([
                'message' => 'User is not associated with any school.',
            ], 403);
        }

        $this->context->set((int) $user->tenant_id);

        return $next($request);
    }
}

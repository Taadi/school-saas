import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { impersonation } from '@/auth/impersonation';

/**
 * School-scoped pages require a tenant context. Super admins must impersonate
 * a school (X-Tenant-Id) before using tenant routes; other roles always have
 * tenant_id on their user record.
 */
export function RequireTenantAccess() {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role === 'super_admin' && !impersonation.get()) {
    return (
      <Navigate
        to="/admin"
        replace
        state={{ from: location.pathname, reason: 'tenant_required' }}
      />
    );
  }

  return <Outlet />;
}

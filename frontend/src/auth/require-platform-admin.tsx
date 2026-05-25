import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';

/** Platform console routes are only for super_admin. */
export function RequirePlatformAdmin() {
  const { user } = useAuth();

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

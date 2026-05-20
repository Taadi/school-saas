import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { impersonation } from '@/auth/impersonation';
import { SchoolDashboardPage } from '@/pages/dashboards/school';

/**
 * Sends super admins to the platform overview unless they are impersonating
 * a school — in which case they see the standard school dashboard for that
 * tenant. Every other role lands on the school dashboard directly.
 */
export function RootRedirect() {
  const { user } = useAuth();
  const impersonating = impersonation.get();

  if (user?.role === 'super_admin' && !impersonating) {
    return <Navigate to="/admin" replace />;
  }

  return <SchoolDashboardPage />;
}

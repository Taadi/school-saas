import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { impersonation } from '@/auth/impersonation';
import { Button } from '@/components/ui/button';

/**
 * Persistent banner that shows when a super-admin is impersonating a school.
 * Clicking "Exit" stops impersonation and returns to the platform overview.
 */
export function ImpersonationBanner() {
  const [state, setState] = useState(impersonation.get());
  const navigate = useNavigate();

  useEffect(() => impersonation.subscribe(setState), []);

  if (!state) return null;

  const exit = () => {
    impersonation.stop();
    navigate('/admin', { replace: true });
    // Force a soft reload so dashboards & menus refetch with the new context.
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4" />
          <span>
            Viewing as{' '}
            <strong className="font-semibold">{state.school_name}</strong>
            {state.school_slug ? (
              <span className="opacity-70"> · {state.school_slug}</span>
            ) : null}
            . All actions affect this school's data.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-500/40 hover:bg-amber-500/15"
          onClick={exit}
        >
          <X className="size-3.5" />
          Exit impersonation
        </Button>
      </div>
    </div>
  );
}

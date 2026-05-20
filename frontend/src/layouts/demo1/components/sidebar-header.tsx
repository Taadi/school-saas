import { ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/branding/app-logo';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';

export function SidebarHeader() {
  const { settings, storeOption } = useSettings();

  const handleToggleClick = () => {
    storeOption(
      'layouts.demo1.sidebarCollapse',
      !settings.layouts.demo1.sidebarCollapse,
    );
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      <Link to="/">
        <div className="dark:hidden">
          <AppLogo
            variant="default"
            className="default-logo h-[22px] max-w-none"
            alt="Logo"
          />
          <AppLogo
            variant="mini"
            className="small-logo h-[22px] max-w-none"
            alt="Logo"
          />
        </div>
        <div className="hidden dark:block">
          <AppLogo
            variant="dark"
            className="default-logo h-[22px] max-w-none"
            alt="Logo"
          />
          <AppLogo
            variant="mini"
            className="small-logo h-[22px] max-w-none"
            alt="Logo"
          />
        </div>
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          settings.layouts.demo1.sidebarCollapse
            ? 'ltr:rotate-180'
            : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}

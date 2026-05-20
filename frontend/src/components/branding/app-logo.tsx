import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/branding-provider';

const DEFAULT_LOGO = toAbsoluteUrl('/media/app/default-logo.svg');
const DEFAULT_LOGO_DARK = toAbsoluteUrl('/media/app/default-logo-dark.svg');
const DEFAULT_MINI = toAbsoluteUrl('/media/app/mini-logo.svg');

type AppLogoProps = {
  className?: string;
  variant?: 'default' | 'mini' | 'dark';
  alt?: string;
};

export function AppLogo({
  className,
  variant = 'default',
  alt = 'Logo',
}: AppLogoProps) {
  const { effective_logo_url } = useBranding();

  const fallback =
    variant === 'mini'
      ? DEFAULT_MINI
      : variant === 'dark'
        ? DEFAULT_LOGO_DARK
        : DEFAULT_LOGO;

  const src = effective_logo_url ?? fallback;

  return (
    <img
      src={src}
      className={cn(className)}
      alt={alt}
    />
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { impersonation } from '@/auth/impersonation';
import { useAuth } from '@/auth/context/auth-context';
import { brandingApi, BrandingState } from '@/services/branding';

type BrandingContextValue = BrandingState & {
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY: BrandingState = {
  platform_logo_url: null,
  school_logo_url: null,
  effective_logo_url: null,
  can_edit_platform: false,
  can_edit_school: false,
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const [state, setState] = useState<BrandingState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!auth?.access_token) {
      setState(EMPTY);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await brandingApi.get();
      setState(data);
    } catch {
      setState(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [auth?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return impersonation.subscribe(() => {
      void refresh();
    });
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...state,
      loading,
      refresh,
    }),
    [state, loading, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}

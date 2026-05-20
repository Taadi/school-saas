import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/**
 * Supabase client.
 *
 * When the project runs against the Laravel backend (`VITE_APP_AUTH_PROVIDER=laravel`)
 * we don't need Supabase at all. To prevent `createClient` from throwing at
 * module-import time when the env vars are missing, we expose a lazy proxy:
 * - if env is configured, the real client is created on first access
 * - if not, any call surfaces a clear error instead of crashing the whole bundle
 */
function createLazyClient(): SupabaseClient {
  let client: SupabaseClient | null = null;

  const get = (): SupabaseClient => {
    if (client) return client;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use VITE_APP_AUTH_PROVIDER=laravel.',
      );
    }

    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    return client;
  };

  return new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
      const real = get();
      const value = Reflect.get(real, prop, receiver);
      return typeof value === 'function' ? value.bind(real) : value;
    },
  });
}

export const supabase: SupabaseClient = createLazyClient();

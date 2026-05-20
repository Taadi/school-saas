/**
 * Tracks which tenant a super-admin is currently impersonating.
 * Persisted to localStorage so the choice survives reloads.
 *
 * The `api` client reads `getImpersonatedTenantId()` on every request and
 * injects an `X-Tenant-Id` header — `EnsureTenant` middleware on the backend
 * uses that to scope global queries while keeping the same Sanctum token.
 */

const STORAGE_KEY = 'platform.impersonating';

type Stored = {
  tenant_id: number;
  school_name: string;
  school_slug?: string | null;
};

type Listener = (state: Stored | null) => void;

const listeners = new Set<Listener>();

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (typeof parsed?.tenant_id !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(state: Stored | null): void {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l(state));
}

export const impersonation = {
  get(): Stored | null {
    return read();
  },

  getTenantId(): number | null {
    return read()?.tenant_id ?? null;
  },

  start(school: { id: number; name: string; slug?: string | null }): void {
    write({
      tenant_id: school.id,
      school_name: school.name,
      school_slug: school.slug ?? null,
    });
  },

  stop(): void {
    write(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Bare helper used by the API client; avoids a React dependency. */
export function getImpersonatedTenantId(): number | null {
  return impersonation.getTenantId();
}

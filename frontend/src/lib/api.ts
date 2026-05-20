import * as authHelper from '@/auth/lib/helpers';
import { getImpersonatedTenantId } from '@/auth/impersonation';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function baseUrl(): string {
  const raw = import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:8000/api';
  return raw.replace(/\/$/, '');
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(
    path.startsWith('http') ? path : `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`,
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

function authHeader(): Record<string, string> {
  const auth = authHelper.getAuth();
  const headers: Record<string, string> = {};
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
  const tenantId = getImpersonatedTenantId();
  if (tenantId) {
    headers['X-Tenant-Id'] = String(tenantId);
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json');

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    let errors: Record<string, string[]> | undefined;

    if (isJson) {
      const data = (await res.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null;
      if (data?.message) message = data.message;
      if (data?.errors) errors = data.errors;
    }

    throw new ApiError(message, res.status, errors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    // Used by file downloads — caller should handle blobs separately.
    return (await res.blob()) as unknown as T;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    fetch(buildUrl(path, params), {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeader() },
    }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, body?: unknown) =>
    fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body?: unknown) =>
    fetch(buildUrl(path), {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body?: unknown) =>
    fetch(buildUrl(path), {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  delete: <T>(path: string) =>
    fetch(buildUrl(path), {
      method: 'DELETE',
      headers: { Accept: 'application/json', ...authHeader() },
    }).then((r) => handleResponse<T>(r)),

  upload: <T>(path: string, formData: FormData) =>
    fetch(buildUrl(path), {
      method: 'POST',
      headers: { Accept: 'application/json', ...authHeader() },
      body: formData,
    }).then((r) => handleResponse<T>(r)),

  download: async (path: string, filename: string) => {
    const res = await fetch(buildUrl(path), {
      method: 'GET',
      headers: { ...authHeader() },
    });
    if (!res.ok) {
      throw new ApiError(`Download failed (${res.status})`, res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

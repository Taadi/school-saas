import { AuthModel, SchoolRole, UserModel } from '@/auth/lib/models';
import * as authHelper from '@/auth/lib/helpers';

function apiBase(): string {
  const raw =
    import.meta.env.VITE_APP_API_URL ||
    'http://localhost:8000/api';
  return raw.replace(/\/$/, '');
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function mapLaravelUser(payload: {
  id: number;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
}): UserModel {
  const name = payload.name ?? '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.slice(1).join(' ') || '';

  const role = payload.role ?? '';
  const isSuperOrSchoolAdmin =
    role === 'super_admin' || role === 'school_admin';

  return {
    username: payload.email?.split('@')[0] ?? '',
    email: payload.email ?? '',
    first_name: first,
    last_name: last,
    fullname: name,
    phone: payload.phone ?? undefined,
    is_admin: isSuperOrSchoolAdmin,
    role: (role || undefined) as SchoolRole | undefined,
  };
}

export const LaravelAdapter = {
  async login(
    email: string,
    password: string,
    schoolSlug?: string,
  ): Promise<AuthModel> {
    const body: Record<string, string> = { email, password };
    if (schoolSlug?.trim()) {
      body.school_slug = schoolSlug.trim();
    }

    const res = await fetch(`${apiBase()}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };

    if (!res.ok) {
      const msg =
        data.message ||
        (data.errors && Object.values(data.errors).flat().join(' ')) ||
        'Login failed';
      throw new Error(msg);
    }

    if (!data.token) {
      throw new Error('Invalid response from server.');
    }

    return { access_token: data.token };
  },

  async getCurrentUser(): Promise<UserModel | null> {
    const auth = authHelper.getAuth();
    if (!auth?.access_token) {
      return null;
    }

    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: authHeaders(auth.access_token),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      user?: {
        id: number;
        name: string;
        email: string;
        phone?: string | null;
        role: string;
      };
    };

    if (!data.user) {
      return null;
    }

    return mapLaravelUser(data.user);
  },

  async logout(): Promise<void> {
    const auth = authHelper.getAuth();
    if (!auth?.access_token) {
      return;
    }

    await fetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(auth.access_token),
    }).catch(() => undefined);
  },

  async register(): Promise<AuthModel> {
    throw new Error(
      'Registration from the app UI is not wired yet. Use the school registration API or Supabase mode.',
    );
  },

  async requestPasswordReset(): Promise<void> {
    throw new Error('Password reset is not configured for Laravel auth yet.');
  },

  async resetPassword(): Promise<void> {
    throw new Error('Password reset is not configured for Laravel auth yet.');
  },

  async resendVerificationEmail(): Promise<void> {
    throw new Error('Email verification is not used with Laravel token auth.');
  },

  async updateUserProfile(): Promise<UserModel> {
    throw new Error('Profile update API not implemented yet.');
  },
};

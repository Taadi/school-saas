import { api } from '@/lib/api';

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface School {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  motto: string | null;
  logo_path: string | null;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at?: string;
  users_count?: number;
  students_count?: number;
  classes_count?: number;
}

export interface SchoolAdmin {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlatformOverview {
  totals: {
    schools: number;
    schools_active: number;
    schools_trial: number;
    schools_suspended: number;
    students: number;
    teachers: number;
    payments_last_30_days: number;
  };
  school_signups_by_month: { label: string; schools: number }[];
  recent_schools: School[];
}

export interface SchoolDetail {
  data: School;
  admins: SchoolAdmin[];
  stats: {
    students: number;
    teachers: number;
    classes: number;
    admins: number;
    total_billed: number;
    total_collected: number;
  };
}

export interface SchoolsListResponse {
  data: School[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface SchoolFilters {
  search?: string;
  status?: SubscriptionStatus;
  expiring_soon?: boolean;
  per_page?: number;
  page?: number;
}

export interface SchoolPayload {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  motto?: string | null;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: string | null;
}

export interface PlatformSettings {
  platform_name?: string | null;
  support_email?: string | null;
  default_trial_days?: number | null;
  maintenance_message?: string | null;
  logo_url?: string | null;
}

export const saasAdminApi = {
  overview(): Promise<PlatformOverview> {
    return api.get('/admin/overview');
  },

  listSchools(filters: SchoolFilters = {}): Promise<SchoolsListResponse> {
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    );
    return api.get('/admin/schools', cleaned);
  },

  showSchool(id: number): Promise<SchoolDetail> {
    return api.get(`/admin/schools/${id}`);
  },

  updateSchool(id: number, payload: SchoolPayload): Promise<{ data: School }> {
    return api.put(`/admin/schools/${id}`, payload);
  },

  setStatus(
    id: number,
    status: SubscriptionStatus,
  ): Promise<{ data: School }> {
    return api.post(`/admin/schools/${id}/status`, {
      subscription_status: status,
    });
  },

  createAdmin(
    schoolId: number,
    payload: { name: string; email: string; phone?: string | null },
  ): Promise<{ data: SchoolAdmin; temporary_password: string }> {
    return api.post(`/admin/schools/${schoolId}/admins`, payload);
  },

  resetAdminPassword(
    schoolId: number,
    userId: number,
  ): Promise<{ data: SchoolAdmin; temporary_password: string }> {
    return api.post(
      `/admin/schools/${schoolId}/admins/${userId}/reset-password`,
    );
  },

  deleteSchool(id: number): Promise<{ message: string }> {
    return api.delete(`/admin/schools/${id}`);
  },

  getSettings(): Promise<{ data: PlatformSettings }> {
    return api.get('/admin/platform-settings');
  },

  updateSettings(payload: PlatformSettings): Promise<{ data: PlatformSettings }> {
    return api.put('/admin/platform-settings', payload);
  },

  uploadPlatformLogo(file: File): Promise<{ logo_url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload('/admin/platform-settings/logo', fd);
  },

  removePlatformLogo(): Promise<void> {
    return api.delete('/admin/platform-settings/logo');
  },
};

export const SUBSCRIPTION_BADGE: Record<
  SubscriptionStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className:
      'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400',
  },
  trial: {
    label: 'Trial',
    className:
      'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400',
  },
  suspended: {
    label: 'Suspended',
    className:
      'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400',
  },
};

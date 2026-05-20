import { api } from '@/lib/api';

export interface BrandingState {
  platform_logo_url: string | null;
  school_logo_url: string | null;
  effective_logo_url: string | null;
  can_edit_platform: boolean;
  can_edit_school: boolean;
}

export const brandingApi = {
  get(): Promise<BrandingState> {
    return api.get('/branding');
  },

  uploadPlatformLogo(file: File): Promise<{ logo_url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload('/admin/platform-settings/logo', fd);
  },

  removePlatformLogo(): Promise<void> {
    return api.delete('/admin/platform-settings/logo');
  },

  uploadSchoolLogo(file: File): Promise<{ logo_url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload('/school/logo', fd);
  },

  removeSchoolLogo(): Promise<void> {
    return api.delete('/school/logo');
  },
};

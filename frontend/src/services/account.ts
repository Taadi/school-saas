import { api } from '@/lib/api';
import { SchoolRole } from '@/auth/lib/models';

export interface AccountUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: SchoolRole;
  tenant_id: number | null;
  is_active: boolean;
  school?: { id: number; name: string; slug: string } | null;
}

export const accountApi = {
  show(): Promise<{ user: AccountUser }> {
    return api.get('/account');
  },

  update(payload: {
    name?: string;
    email?: string;
    phone?: string | null;
  }): Promise<{ user: AccountUser }> {
    return api.put('/account', payload);
  },

  changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return api.post('/account/password', payload);
  },
};

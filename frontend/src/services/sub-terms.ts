import { api } from '@/lib/api';
import { SubTerm } from '@/types/school';

export interface SubTermPayload {
  term_id: number;
  name: string;
  kind?: 'midterm' | 'window' | 'weekly' | 'custom';
  ordinal?: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export const subTermsApi = {
  list(termId: number): Promise<{ data: SubTerm[] }> {
    return api.get('/college-report/sub-terms', { term_id: termId });
  },

  create(payload: SubTermPayload): Promise<{ data: SubTerm }> {
    return api.post('/college-report/sub-terms', payload);
  },

  update(id: number, payload: Partial<SubTermPayload>): Promise<{ data: SubTerm }> {
    return api.put(`/college-report/sub-terms/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/college-report/sub-terms/${id}`);
  },

  seedForTerm(termId: number): Promise<{ message: string; data: SubTerm }> {
    return api.post(`/college-report/terms/${termId}/seed-sub-terms`);
  },
};

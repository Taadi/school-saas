import { api } from '@/lib/api';
import {
  AssessmentComponent,
  AssessmentScheme,
  GradingBand,
  GradingScale,
  ReportSettings,
  SubjectGroup,
  Term,
} from '@/types/school';

export interface GradingScalePayload {
  name?: string;
  description?: string | null;
  is_default?: boolean;
  bands?: GradingBand[];
}

export interface AssessmentSchemePayload {
  name?: string;
  description?: string | null;
  academic_session_id?: number | null;
  term_id?: number | null;
  grading_scale_id?: number | null;
  is_default?: boolean;
  is_active?: boolean;
  components?: Omit<AssessmentComponent, 'id' | 'sort_order'>[];
}

export interface SubjectGroupPayload {
  name?: string;
  description?: string | null;
  sort_order?: number;
  subject_ids?: number[];
}

export interface TermDeadlinePayload {
  start_date?: string | null;
  end_date?: string | null;
  result_entry_deadline?: string | null;
  result_approval_deadline?: string | null;
}

const base = '/college-report';

export const collegeReportApi = {
  /* ---------- Grading scales ---------- */
  listScales: (): Promise<{ data: GradingScale[] }> =>
    api.get(`${base}/grading-scales`),
  getScale: (id: number): Promise<{ data: GradingScale }> =>
    api.get(`${base}/grading-scales/${id}`),
  createScale: (
    payload: GradingScalePayload,
  ): Promise<{ data: GradingScale }> =>
    api.post(`${base}/grading-scales`, payload),
  updateScale: (
    id: number,
    payload: GradingScalePayload,
  ): Promise<{ data: GradingScale }> =>
    api.put(`${base}/grading-scales/${id}`, payload),
  deleteScale: (id: number): Promise<{ message: string }> =>
    api.delete(`${base}/grading-scales/${id}`),
  setDefaultScale: (id: number): Promise<{ data: GradingScale }> =>
    api.post(`${base}/grading-scales/${id}/set-default`),

  /* ---------- Assessment schemes ---------- */
  listSchemes: (): Promise<{ data: AssessmentScheme[] }> =>
    api.get(`${base}/assessment-schemes`),
  getScheme: (id: number): Promise<{ data: AssessmentScheme }> =>
    api.get(`${base}/assessment-schemes/${id}`),
  createScheme: (
    payload: AssessmentSchemePayload,
  ): Promise<{ data: AssessmentScheme }> =>
    api.post(`${base}/assessment-schemes`, payload),
  updateScheme: (
    id: number,
    payload: AssessmentSchemePayload,
  ): Promise<{ data: AssessmentScheme }> =>
    api.put(`${base}/assessment-schemes/${id}`, payload),
  deleteScheme: (id: number): Promise<{ message: string }> =>
    api.delete(`${base}/assessment-schemes/${id}`),
  setDefaultScheme: (id: number): Promise<{ data: AssessmentScheme }> =>
    api.post(`${base}/assessment-schemes/${id}/set-default`),

  /* ---------- Subject groups ---------- */
  listGroups: (): Promise<{ data: SubjectGroup[] }> =>
    api.get(`${base}/subject-groups`),
  createGroup: (
    payload: SubjectGroupPayload,
  ): Promise<{ data: SubjectGroup }> =>
    api.post(`${base}/subject-groups`, payload),
  updateGroup: (
    id: number,
    payload: SubjectGroupPayload,
  ): Promise<{ data: SubjectGroup }> =>
    api.put(`${base}/subject-groups/${id}`, payload),
  deleteGroup: (id: number): Promise<{ message: string }> =>
    api.delete(`${base}/subject-groups/${id}`),

  /* ---------- Settings ---------- */
  getSettings: (): Promise<{ data: ReportSettings }> => api.get(`${base}/settings`),
  updateSettings: (
    patch: Partial<ReportSettings>,
  ): Promise<{ data: ReportSettings }> =>
    api.put(`${base}/settings`, patch),
  uploadBrandingAsset: (
    kind: 'seal' | 'signature',
    file: File,
  ): Promise<{ url: string; data: ReportSettings }> => {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    return api.upload(`${base}/settings/branding-asset`, fd);
  },

  /* ---------- Term deadlines (Tab 7) ---------- */
  updateTerm: (
    termId: number,
    payload: TermDeadlinePayload,
  ): Promise<{ data: Term }> => api.patch(`${base}/terms/${termId}`, payload),
};

import { api } from '@/lib/api';
import {
  EvaluationPeriod,
  EvaluationRubric,
  EvaluationSheetResponse,
  EvaluationTimelineEntry,
} from '@/types/school';

export interface EvaluationItemPayload {
  code: string;
  label: string;
  type: 'yes_no' | 'scale_1_5' | 'scale_1_10' | 'choice' | 'text';
  choices?: string[] | null;
  weight?: number;
}

export interface RubricPayload {
  name: string;
  description?: string | null;
  cadence?: 'weekly' | 'biweekly' | 'monthly' | 'adhoc' | 'term';
  target_role?: string;
  is_active?: boolean;
  is_default?: boolean;
  items?: EvaluationItemPayload[];
}

export const evaluationsApi = {
  listRubrics(): Promise<{ data: EvaluationRubric[] }> {
    return api.get('/evaluations/rubrics');
  },

  showRubric(id: number): Promise<{ data: EvaluationRubric }> {
    return api.get(`/evaluations/rubrics/${id}`);
  },

  createRubric(payload: RubricPayload): Promise<{ data: EvaluationRubric }> {
    return api.post('/evaluations/rubrics', payload);
  },

  updateRubric(id: number, payload: Partial<RubricPayload>): Promise<{ data: EvaluationRubric }> {
    return api.put(`/evaluations/rubrics/${id}`, payload);
  },

  removeRubric(id: number): Promise<{ message: string }> {
    return api.delete(`/evaluations/rubrics/${id}`);
  },

  listPeriods(rubricId: number, termId: number): Promise<{ data: EvaluationPeriod[] }> {
    return api.get('/evaluations/periods', { rubric_id: rubricId, term_id: termId });
  },

  generatePeriods(
    rubricId: number,
    termId: number,
    count = 12,
  ): Promise<{ message: string; created: number }> {
    return api.post('/evaluations/periods/generate', {
      rubric_id: rubricId,
      term_id: termId,
      count,
    });
  },

  sheet(params: {
    period_id: number;
    school_class_id: number;
    arm_id?: number | null;
  }): Promise<EvaluationSheetResponse> {
    return api.get('/evaluations/sheet', params as Record<string, unknown>);
  },

  bulkUpsert(payload: {
    period_id: number;
    school_class_id: number;
    arm_id?: number | null;
    rows: {
      student_id: number;
      answers: Record<string, string | number | boolean | null>;
      overall_remark?: string | null;
    }[];
  }): Promise<{ message: string; saved: number }> {
    return api.post('/evaluations/responses/bulk', payload);
  },

  studentTimeline(
    studentId: number,
    termId: number,
    rubricId?: number,
  ): Promise<{ student: { id: number; name: string | null; admission_number: string }; data: EvaluationTimelineEntry[] }> {
    return api.get(`/students/${studentId}/evaluations`, {
      term_id: termId,
      ...(rubricId ? { rubric_id: rubricId } : {}),
    });
  },
};

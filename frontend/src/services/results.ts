import { api } from '@/lib/api';
import {
  Paginated,
  ReportCard,
  ResultListItem,
  ResultStatus,
  ScoreMap,
  ScoreSheetResponse,
} from '@/types/school';

export interface ResultFilters {
  school_class_id?: number;
  arm_id?: number;
  subject_id?: number;
  student_id?: number;
  term_id?: number;
  /** Omit or null = end-of-term results only */
  sub_term_id?: number | null;
  academic_session_id?: number;
  status?: ResultStatus;
  per_page?: number;
}

export interface ScoreRowPayload {
  student_id: number;
  /** Dynamic per-component scores keyed by `assessment_components.code`. */
  scores?: ScoreMap;
}

export interface BulkUpsertPayload {
  school_class_id: number;
  arm_id?: number | null;
  subject_id: number;
  term_id: number;
  sub_term_id?: number | null;
  rows: ScoreRowPayload[];
}

export interface SubmitPayload {
  school_class_id: number;
  arm_id?: number | null;
  subject_id: number;
  term_id: number;
  sub_term_id?: number | null;
}

export interface ApprovePayload {
  result_ids?: number[];
  school_class_id?: number;
  arm_id?: number;
  subject_id?: number;
  term_id?: number;
  sub_term_id?: number | null;
}

export const resultsApi = {
  list(filters: ResultFilters = {}): Promise<Paginated<ResultListItem>> {
    return api.get('/results', filters as Record<string, unknown>);
  },

  scoreSheet(params: {
    school_class_id: number;
    arm_id?: number | null;
    subject_id: number;
    term_id: number;
    sub_term_id?: number | null;
  }): Promise<ScoreSheetResponse> {
    return api.get('/results/score-sheet', params as Record<string, unknown>);
  },

  bulkUpsert(payload: BulkUpsertPayload): Promise<{
    message: string;
    saved: number;
    skipped: number;
  }> {
    return api.post('/results/bulk', payload);
  },

  submit(payload: SubmitPayload): Promise<{ submitted: number }> {
    return api.post('/results/submit', payload);
  },

  approve(payload: ApprovePayload): Promise<{ approved: number }> {
    return api.post('/results/approve', payload);
  },

  reportCard(studentId: number, termId: number, subTermId?: number | null): Promise<ReportCard> {
    return api.get(`/students/${studentId}/report-card`, {
      term_id: termId,
      ...(subTermId ? { sub_term_id: subTermId } : {}),
    });
  },
};

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
};

export const RESULT_STATUS_COLOR: Record<ResultStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-700',
  submitted: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-green-500/15 text-green-700',
};

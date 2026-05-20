import { api } from '@/lib/api';
import {
  SubjectTeacherAssignment,
  SubjectTeacherPayload,
  SubjectTeacherSyncRow,
} from '@/types/school';

export interface SubjectTeacherFilters {
  subject_id?: number;
  school_class_id?: number;
  arm_id?: number;
  teacher_user_id?: number;
  academic_session_id?: number;
}

export const subjectTeachersApi = {
  /** List assignments with optional filters. */
  list(filters: SubjectTeacherFilters = {}): Promise<{ data: SubjectTeacherAssignment[] }> {
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    );
    return api.get('/subject-teachers', cleaned);
  },

  /** All teachers assigned to a single subject (optionally session-scoped). */
  forSubject(
    subjectId: number,
    academicSessionId?: number | null,
  ): Promise<{
    data: SubjectTeacherAssignment[];
    subject: { id: number; name: string; code: string };
  }> {
    return api.get(
      `/subjects/${subjectId}/teachers`,
      academicSessionId ? { academic_session_id: academicSessionId } : {},
    );
  },

  /** Create a single assignment. */
  create(payload: SubjectTeacherPayload): Promise<{ data: SubjectTeacherAssignment }> {
    return api.post('/subject-teachers', payload);
  },

  /** Replace the entire set of assignments for one subject. */
  syncForSubject(
    subjectId: number,
    assignments: SubjectTeacherSyncRow[],
    academicSessionId: number | null = null,
  ): Promise<{
    data: SubjectTeacherAssignment[];
    subject: { id: number; name: string; code: string };
  }> {
    return api.put(`/subjects/${subjectId}/teachers`, {
      academic_session_id: academicSessionId,
      assignments,
    });
  },

  remove(assignmentId: number): Promise<{ message: string }> {
    return api.delete(`/subject-teachers/${assignmentId}`);
  },
};

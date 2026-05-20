import { api } from '@/lib/api';
import {
  AcademicSession,
  Arm,
  ClassLevel,
  SchoolClass,
  SessionStatus,
  Subject,
  Term,
  TermName,
} from '@/types/school';

/* -------------------------------------------------------------------------- */
/* Classes                                                                    */
/* -------------------------------------------------------------------------- */

export interface ClassPayload {
  name: string;
  level: ClassLevel;
  order?: number;
}

export const classesApi = {
  list(withSubjects = false): Promise<{ data: SchoolClass[] }> {
    return api.get('/classes', withSubjects ? { with_subjects: 1 } : {});
  },

  show(id: number): Promise<{ data: SchoolClass }> {
    return api.get(`/classes/${id}`);
  },

  create(payload: ClassPayload): Promise<{ data: SchoolClass }> {
    return api.post('/classes', payload);
  },

  update(id: number, payload: Partial<ClassPayload>): Promise<{ data: SchoolClass }> {
    return api.put(`/classes/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/classes/${id}`);
  },

  subjects(classId: number): Promise<{ data: Subject[] }> {
    return api.get(`/classes/${classId}/subjects`);
  },

  syncSubjects(
    classId: number,
    subjectIds: number[],
    compulsoryIds?: number[],
  ): Promise<{ data: Subject[] }> {
    return api.put(`/classes/${classId}/subjects`, {
      subject_ids: subjectIds,
      compulsory_ids: compulsoryIds ?? subjectIds,
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Arms                                                                       */
/* -------------------------------------------------------------------------- */

export interface ArmPayload {
  name: string;
  capacity?: number;
  class_teacher_id?: number | null;
}

export const armsApi = {
  list(classId: number): Promise<{ data: Arm[] }> {
    return api.get(`/classes/${classId}/arms`);
  },

  create(classId: number, payload: ArmPayload): Promise<{ data: Arm }> {
    return api.post(`/classes/${classId}/arms`, payload);
  },

  update(classId: number, armId: number, payload: Partial<ArmPayload>): Promise<{ data: Arm }> {
    return api.put(`/classes/${classId}/arms/${armId}`, payload);
  },

  remove(classId: number, armId: number): Promise<{ message: string }> {
    return api.delete(`/classes/${classId}/arms/${armId}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Subjects                                                                   */
/* -------------------------------------------------------------------------- */

export interface SubjectPayload {
  code: string;
  name: string;
  description?: string | null;
}

export const subjectsApi = {
  list(search?: string): Promise<{ data: Subject[] }> {
    return api.get('/subjects', search ? { search } : {});
  },

  create(payload: SubjectPayload): Promise<{ data: Subject }> {
    return api.post('/subjects', payload);
  },

  update(id: number, payload: Partial<SubjectPayload>): Promise<{ data: Subject }> {
    return api.put(`/subjects/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/subjects/${id}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Academic Sessions + Terms                                                  */
/* -------------------------------------------------------------------------- */

export interface SessionPayload {
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  status?: SessionStatus;
}

export interface TermUpdatePayload {
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
}

export const academicSessionsApi = {
  list(): Promise<{ data: AcademicSession[] }> {
    return api.get('/academic-sessions');
  },

  create(payload: SessionPayload): Promise<{ data: AcademicSession }> {
    return api.post('/academic-sessions', payload);
  },

  update(id: number, payload: Partial<SessionPayload>): Promise<{ data: AcademicSession }> {
    return api.put(`/academic-sessions/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/academic-sessions/${id}`);
  },

  setCurrent(id: number): Promise<{ data: AcademicSession }> {
    return api.post(`/academic-sessions/${id}/set-current`);
  },

  promoteEnrollments(id: number): Promise<{
    message: string;
    created: number;
    skipped: number;
  }> {
    return api.post(`/academic-sessions/${id}/promote-enrollments`);
  },

  updateTerm(
    sessionId: number,
    termId: number,
    payload: TermUpdatePayload,
  ): Promise<{ data: Term }> {
    return api.put(`/academic-sessions/${sessionId}/terms/${termId}`, payload);
  },
};

export const TERM_LABELS: Record<TermName, string> = {
  first: 'First Term',
  second: 'Second Term',
  third: 'Third Term',
};

export const CLASS_LEVELS: { value: ClassLevel; label: string }[] = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
  { value: 'junior_secondary', label: 'Junior Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
];

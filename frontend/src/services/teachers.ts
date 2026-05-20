import { api } from '@/lib/api';
import {
  Paginated,
  Teacher,
  TeacherFilters,
  TeacherPayload,
} from '@/types/school';

export interface TeacherImportResult {
  created: number;
  errors: string[];
  credentials: {
    staff_id: string;
    name: string | null;
    email: string | null;
    temporary_password: string;
  }[];
}

export interface PhotoUploadResult {
  passport_photo: string;
  url: string;
}

export interface ResetPasswordResult {
  temporary_password: string;
  email: string;
}

export const teachersApi = {
  list(filters: TeacherFilters = {}): Promise<Paginated<Teacher>> {
    return api.get<Paginated<Teacher>>(
      '/teachers',
      filters as Record<string, unknown>,
    );
  },

  show(id: number): Promise<{ data: Teacher }> {
    return api.get<{ data: Teacher }>(`/teachers/${id}`);
  },

  create(payload: TeacherPayload): Promise<{ data: Teacher }> {
    return api.post<{ data: Teacher }>('/teachers', payload);
  },

  update(
    id: number,
    payload: Partial<TeacherPayload>,
  ): Promise<{ data: Teacher }> {
    return api.put<{ data: Teacher }>(`/teachers/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/teachers/${id}`);
  },

  uploadPhoto(id: number, file: File): Promise<PhotoUploadResult> {
    const fd = new FormData();
    fd.append('photo', file);
    return api.upload<PhotoUploadResult>(`/teachers/${id}/photo`, fd);
  },

  resetPassword(id: number): Promise<ResetPasswordResult> {
    return api.post<ResetPasswordResult>(`/teachers/${id}/reset-password`);
  },

  downloadTemplate() {
    return api.download(
      '/teachers/import-template',
      'teachers-import-template.csv',
    );
  },

  import(file: File): Promise<TeacherImportResult> {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<TeacherImportResult>('/teachers/import', fd);
  },
};

export const TEACHER_STATUS_LABEL: Record<Teacher['status'], string> = {
  active: 'Active',
  on_leave: 'On leave',
  resigned: 'Resigned',
};

export const TEACHER_STATUS_BADGE: Record<
  Teacher['status'],
  { label: string; color: string }
> = {
  active: { label: 'Active', color: 'bg-green-500/15 text-green-700' },
  on_leave: { label: 'On leave', color: 'bg-amber-500/15 text-amber-700' },
  resigned: { label: 'Resigned', color: 'bg-red-500/15 text-red-700' },
};

/**
 * Resolve a `passport_photo` storage path to a fully-qualified URL using the
 * Laravel public disk symlink (`/storage/...`).
 */
export function teacherPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const apiBase =
    import.meta.env.VITE_APP_API_URL ?? 'http://127.0.0.1:8000/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  const cleaned = path.replace(/^\/+/, '');
  return `${origin}/storage/${cleaned}`;
}

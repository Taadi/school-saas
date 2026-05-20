import { api } from '@/lib/api';
import {
  Arm,
  Paginated,
  SchoolClass,
  Student,
  StudentFilters,
  StudentPayload,
} from '@/types/school';

export const studentsApi = {
  list(filters: StudentFilters = {}): Promise<Paginated<Student>> {
    return api.get<Paginated<Student>>('/students', filters as Record<string, unknown>);
  },

  show(id: number): Promise<{ data: Student }> {
    return api.get<{ data: Student }>(`/students/${id}`);
  },

  create(payload: StudentPayload): Promise<{ data: Student }> {
    return api.post<{ data: Student }>('/students', payload);
  },

  update(id: number, payload: Partial<StudentPayload>): Promise<{ data: Student }> {
    return api.put<{ data: Student }>(`/students/${id}`, payload);
  },

  remove(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/students/${id}`);
  },

  downloadTemplate() {
    return api.download('/students/import-template', 'students-import-template.csv');
  },

  import(file: File): Promise<{ created: number; errors: string[] }> {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<{ created: number; errors: string[] }>('/students/import', fd);
  },
};

export const referenceApi = {
  classes(): Promise<{ data: SchoolClass[] }> {
    return api.get<{ data: SchoolClass[] }>('/classes');
  },

  arms(classId: number): Promise<{ data: Arm[] }> {
    return api.get<{ data: Arm[] }>(`/classes/${classId}/arms`);
  },

  states(): Promise<{ states: string[] }> {
    return api.get<{ states: string[] }>('/states');
  },
};

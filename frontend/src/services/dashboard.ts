import { api } from '@/lib/api';
import { SchoolRole } from '@/auth/lib/models';

export interface DashboardContext {
  session: { id: number; name: string } | null;
  term: { id: number; name: string } | null;
}

export interface AdminDashboard {
  role: SchoolRole;
  context: DashboardContext;
  totals: {
    students: number;
    classes: number;
    revenue: number;
    expected: number;
    pending: number;
    collection_rate: number;
    invoices: number;
    defaulters: number;
  };
  monthly_collections: { label: string; amount: number }[];
  class_breakdown: { name: string; students: number }[];
  recent_payments: {
    id: number;
    invoice_id: number;
    amount: number;
    method: string;
    paid_on: string;
    invoice?: {
      id: number;
      invoice_number: string;
      student?: {
        id: number;
        admission_number: string;
        user?: { id: number; name: string };
      };
    };
  }[];
  recent_admissions: {
    id: number;
    admission_number: string;
    admitted_on: string | null;
    gender: string | null;
    status: string;
    user?: { id: number; name: string };
    enrollments?: {
      id: number;
      school_class?: { id: number; name: string };
      arm?: { id: number; name: string };
    }[];
  }[];
}

export interface TeacherDashboard {
  role: SchoolRole;
  context: DashboardContext;
  totals: {
    students: number;
    classes: number;
    my_results_term: number;
    drafts: number;
    submitted: number;
    approved: number;
  };
  recent_results: {
    id: number;
    student_id: number;
    subject_id: number;
    school_class_id: number;
    total: number;
    grade: string | null;
    status: 'draft' | 'submitted' | 'approved';
    updated_at: string;
    student?: {
      id: number;
      admission_number: string;
      user?: { id: number; name: string };
    };
    subject?: { id: number; code: string; name: string };
    school_class?: { id: number; name: string };
  }[];
}

export interface PersonalDashboard {
  role: SchoolRole;
  context: DashboardContext;
  totals: {
    student_id?: number;
    student_name?: string | null;
    admission_number?: string;
    billed: number;
    paid: number;
    outstanding: number;
  };
  current_invoice: {
    id: number;
    invoice_number: string;
    total_amount: number;
    amount_paid: number;
    balance: number;
    status: 'pending' | 'partial' | 'paid';
  } | null;
  recent_payments: {
    id: number;
    invoice_id: number;
    amount: number;
    method: string;
    paid_on: string;
    invoice?: { id: number; invoice_number: string; term?: { name: string } };
  }[];
  recent_results: {
    id: number;
    subject_id: number;
    term_id: number;
    total: number;
    grade: string | null;
    status: 'draft' | 'submitted' | 'approved';
    subject?: { id: number; code: string; name: string };
    term?: { id: number; name: string };
  }[];
  children?: {
    id: number;
    name: string | null;
    admission_number: string;
    class: string | null;
  }[];
  message?: string;
}

export type DashboardSummary =
  | AdminDashboard
  | TeacherDashboard
  | PersonalDashboard;

export const dashboardApi = {
  summary(): Promise<DashboardSummary> {
    return api.get('/dashboard/summary');
  },
};

export function isAdminDashboard(d: DashboardSummary): d is AdminDashboard {
  return d.role === 'super_admin' || d.role === 'school_admin';
}

export function isTeacherDashboard(d: DashboardSummary): d is TeacherDashboard {
  return d.role === 'teacher';
}

export function isPersonalDashboard(
  d: DashboardSummary,
): d is PersonalDashboard {
  return d.role === 'student' || d.role === 'parent';
}

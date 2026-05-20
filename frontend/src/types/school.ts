export type Gender = 'male' | 'female';
export type StudentStatus =
  | 'active'
  | 'graduated'
  | 'transferred'
  | 'withdrawn';
export type ClassLevel =
  | 'nursery'
  | 'primary'
  | 'junior_secondary'
  | 'senior_secondary';

export interface Arm {
  id: number;
  school_class_id: number;
  name: string;
  capacity: number;
  /** Linked `users.id` of the form teacher (a user with `role = teacher`). */
  class_teacher_id?: number | null;
  class_teacher?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
}

export interface SchoolClass {
  id: number;
  name: string;
  level: ClassLevel;
  order: number;
  arms?: Arm[];
  enrollments_count?: number;
  subjects_count?: number;
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  pivot?: {
    is_compulsory?: boolean;
  };
}

export type TermName = 'first' | 'second' | 'third';

export interface Term {
  id: number;
  academic_session_id: number;
  name: TermName;
  start_date: string | null;
  end_date: string | null;
  result_entry_deadline?: string | null;
  result_approval_deadline?: string | null;
  is_current: boolean;
  sub_terms?: SubTerm[];
}

export interface SubTerm {
  id: number;
  term_id: number;
  name: string;
  kind: 'midterm' | 'window' | 'weekly' | 'custom';
  ordinal: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export type SessionStatus = 'upcoming' | 'active' | 'completed';

export interface AcademicSession {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  status: SessionStatus;
  terms?: Term[];
}

/* ----- Results ----- */

export type ResultStatus = 'draft' | 'submitted' | 'approved';

/**
 * Per-component score map keyed by `assessment_components.code`. The score
 * sheet, bulk-upsert payload and stored `results.scores` JSON all use this
 * shape so we can support arbitrary numbers of components without a schema
 * change.
 */
export type ScoreMap = Record<string, number | null>;

export interface AssessmentComponentSummary {
  code: string;
  label: string;
  max_score: number;
  weight: number;
  is_exam: boolean;
}

export interface AssessmentSchemeSummary {
  id: number;
  name: string;
  total_max: number;
  grading_scale_id: number | null;
  components: AssessmentComponentSummary[];
}

export interface ResultRow {
  id?: number;
  student_id: number;
  admission_number: string;
  name: string | null;
  result_id?: number | null;
  scores: ScoreMap;
  total: number | null;
  grade: string | null;
  remark?: string | null;
  status: ResultStatus;
}

export interface ResultListItem {
  id: number;
  student_id: number;
  subject_id: number;
  school_class_id: number;
  arm_id: number | null;
  scores?: ScoreMap | null;
  /** @deprecated Legacy mirrors of `scores.ca1` etc. — kept for backward compat. */
  ca1?: number | null;
  ca2?: number | null;
  midterm?: number | null;
  exam?: number | null;
  total: number;
  grade: string | null;
  remark: string | null;
  status: ResultStatus;
  approved_at: string | null;
  student?: {
    id: number;
    admission_number: string;
    user?: { id: number; name: string };
  };
  subject?: { id: number; code: string; name: string };
  school_class?: { id: number; name: string };
  arm?: { id: number; name: string };
  term?: { id: number; name: string };
  approved_by?: { id: number; name: string } | null;
  assessment_scheme?: { id: number; name: string; total_max: number } | null;
}

export interface ScoreSheetContext {
  school_class_id: number;
  arm_id: number | null;
  subject_id: number;
  term_id: number;
  sub_term_id?: number | null;
  session: { id: number; name: string } | null;
  term: { id: number; name: string; result_entry_deadline?: string | null } | null;
  scheme: AssessmentSchemeSummary;
}

export interface ScoreSheetResponse {
  data: ResultRow[];
  context: ScoreSheetContext;
}

export interface ReportCardSubject {
  subject_id: number;
  subject_code: string | null;
  subject_name: string | null;
  scores: ScoreMap;
  total: number;
  grade: string | null;
  remark: string | null;
  status: ResultStatus;
  scheme: {
    id: number;
    name: string;
    components: AssessmentComponentSummary[];
  } | null;
}

export interface ReportCard {
  student: {
    id: number;
    admission_number: string;
    name: string | null;
    gender: string | null;
    class: string | null;
    arm: string | null;
  };
  session: { id: number; name: string } | null;
  term: { id: number; name: string } | null;
  sub_term?: { id: number; name: string; kind: string } | null;
  report_type?: 'term' | 'sub_term';
  subjects: ReportCardSubject[];
  summary: {
    subjects_offered: number;
    total_score: number;
    average: number;
    overall_grade: string;
    overall_remark: string;
    class_size: number | null;
    class_average: number | null;
    class_highest: number | null;
    class_lowest: number | null;
    position: string | null;
    all_approved: boolean;
  };
  grading_scale: { min: number; max?: number; grade: string; remark: string }[];
  settings?: ReportSettings;
}

export interface CurrentClass {
  school_class_id: number;
  school_class_name: string | null;
  arm_id: number;
  arm_name: string | null;
  session_year: string;
  term: 'first' | 'second' | 'third';
}

export interface Student {
  id: number;
  admission_number: string;
  name: string;
  email: string;
  date_of_birth: string | null;
  gender: Gender | null;
  religion: string | null;
  state_of_origin: string | null;
  lga: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
  blood_group: string | null;
  photo_path: string | null;
  admitted_on: string | null;
  status: StudentStatus;
  created_at: string;
  current_class: CurrentClass | null;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
}

export interface StudentFilters {
  search?: string;
  school_class_id?: number;
  arm_id?: number;
  status?: StudentStatus;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

/* ----- Fees ----- */

export interface FeeCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface FeeStructure {
  id: number;
  fee_category_id: number;
  school_class_id: number;
  arm_id: number | null;
  academic_session_id: number;
  term_id: number | null;
  amount: number;
  is_optional: boolean;
  category?: FeeCategory;
  school_class?: { id: number; name: string };
  arm?: { id: number; name: string } | null;
  term?: { id: number; name: TermName } | null;
}

export type InvoiceStatus = 'pending' | 'partial' | 'paid';

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  fee_category_id: number;
  fee_structure_id: number | null;
  description: string;
  amount: number;
  category?: FeeCategory;
}

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'pos'
  | 'cheque'
  | 'online'
  | 'other';

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paid_on: string;
  notes: string | null;
  recorded_by?: number | null;
  recorder?: { id: number; name: string } | null;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  student_id: number;
  school_class_id: number;
  arm_id: number | null;
  academic_session_id: number;
  term_id: number;
  invoice_number: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: InvoiceStatus;
  due_date: string | null;
  issued_on: string | null;
  notes: string | null;
  created_at?: string;

  student?: {
    id: number;
    admission_number: string;
    user?: { id: number; name: string };
    guardian_name?: string | null;
    guardian_phone?: string | null;
  };
  school_class?: { id: number; name: string };
  arm?: { id: number; name: string } | null;
  term?: { id: number; name: TermName; academic_session_id?: number };
  academic_session?: { id: number; name: string };
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface FeeSummary {
  totals: {
    expected: number;
    collected: number;
    outstanding: number;
    collection_rate: number;
    invoice_count: number;
  };
  by_status: {
    status: InvoiceStatus;
    count: number;
    total: number;
    paid: number;
  }[];
  defaulters: Invoice[];
  recent_payments: (Payment & { invoice?: Invoice })[];
}

/* ----- Teachers ----- */

export type TeacherStatus = 'active' | 'on_leave' | 'resigned';

export interface Teacher {
  id: number;
  /** FK into `users.id` — used when assigning a form teacher to an arm. */
  user_id: number;
  staff_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;

  qualification: string | null;
  years_of_experience: number | null;
  subject_specialization: string | null;

  date_employed: string | null;
  salary_amount: number | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;

  date_of_birth: string | null;
  gender: Gender | null;
  marital_status: string | null;
  phone_secondary: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga: string | null;

  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;

  passport_photo: string | null;
  status: TeacherStatus;

  created_at?: string;

  /** Returned only on create or password reset — never on subsequent reads. */
  temporary_password?: string | null;
}

export interface TeacherFilters {
  search?: string;
  subject?: string;
  status?: TeacherStatus;
  gender?: Gender;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface TeacherPayload {
  name: string;
  email?: string | null;
  phone?: string | null;

  qualification?: string | null;
  years_of_experience?: number | null;
  subject_specialization?: string | null;

  date_employed?: string | null;
  salary_amount?: number | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;

  date_of_birth?: string | null;
  gender?: Gender | null;
  marital_status?: string | null;
  phone_secondary?: string | null;
  address?: string | null;
  state_of_origin?: string | null;
  lga?: string | null;

  next_of_kin_name?: string | null;
  next_of_kin_phone?: string | null;
  next_of_kin_relationship?: string | null;

  passport_photo?: string | null;
  status?: TeacherStatus;
}

/* ----- Subject ↔ Teacher assignments ----- */

export interface SubjectTeacherAssignment {
  id: number;
  subject_id: number;
  school_class_id: number;
  arm_id: number;
  teacher_user_id: number;
  academic_session_id: number | null;
  is_lead: boolean;

  subject?: { id: number; name: string; code: string };
  school_class?: { id: number; name: string; level?: ClassLevel };
  arm?: { id: number; school_class_id: number; name: string };
  teacher?: { id: number; name: string; email?: string | null };
  academic_session?: { id: number; name: string } | null;
}

export interface SubjectTeacherPayload {
  subject_id: number;
  arm_id: number;
  teacher_user_id: number;
  academic_session_id?: number | null;
  is_lead?: boolean;
}

export interface SubjectTeacherSyncRow {
  arm_id: number;
  teacher_user_id: number;
  is_lead?: boolean;
}

/* ----- College Report Setup ----- */

export interface GradingBand {
  id?: number;
  min_score: number;
  max_score: number;
  grade: string;
  grade_point?: number | null;
  remark?: string | null;
  sort_order?: number;
}

export interface GradingScale {
  id: number;
  name: string;
  description?: string | null;
  is_default: boolean;
  bands?: GradingBand[];
}

export interface AssessmentComponent {
  id?: number;
  code: string;
  label: string;
  max_score: number;
  weight: number;
  is_exam: boolean;
  sort_order?: number;
}

export interface AssessmentScheme {
  id: number;
  name: string;
  description?: string | null;
  academic_session_id: number | null;
  term_id: number | null;
  grading_scale_id: number | null;
  total_max: number;
  is_default: boolean;
  is_active: boolean;
  components: AssessmentComponent[];
  grading_scale?: { id: number; name: string };
  academic_session?: { id: number; name: string };
  term?: { id: number; name: string };
}

export interface SubjectGroup {
  id: number;
  name: string;
  description?: string | null;
  sort_order: number;
  subjects?: { id: number; code: string; name: string }[];
}

export interface ReportSettings {
  result_comments: {
    min: number;
    max: number;
    comments: string[];
  }[];
  non_assessment: {
    categories: { code: string; label: string }[];
    scale: { code: string; label: string }[];
  };
  non_assessment_comments: {
    form_teacher: string[];
    head_teacher: string[];
  };
  attendance: {
    enabled: boolean;
    method: 'days_present_over_total' | 'manual';
    show_percentage: boolean;
  };
  branding: {
    motto: string | null;
    seal_url: string | null;
    sponsor_name: string | null;
    proprietor_name: string | null;
    principal_name: string | null;
    signature_url: string | null;
  };
  presentation: {
    layout: 'classic' | 'modern' | 'compact';
    show_position: boolean;
    show_class_average: boolean;
    show_class_highest: boolean;
    show_class_lowest: boolean;
    show_grade_legend: boolean;
    show_subject_grouping: boolean;
    show_attendance: boolean;
    show_non_assessment: boolean;
    show_signatures: boolean;
  };
  cumulative: {
    mode: 'per_term' | 'cumulative_average' | 'weighted_average';
    weights: { first: number; second: number; third: number };
    pass_mark: number;
  };
}

/* ----- Evaluations (weekly rubrics) ----- */

export interface EvaluationItem {
  id: number;
  code: string;
  label: string;
  type: 'yes_no' | 'scale_1_5' | 'scale_1_10' | 'choice' | 'text';
  choices?: string[] | null;
  weight: number;
  sort_order?: number;
}

export interface EvaluationRubric {
  id: number;
  name: string;
  description?: string | null;
  cadence: string;
  scope: string;
  target_role: string;
  is_active: boolean;
  is_default: boolean;
  items?: EvaluationItem[];
}

export interface EvaluationPeriod {
  id: number;
  evaluation_rubric_id: number;
  term_id: number;
  label: string;
  ordinal: number;
  start_date: string | null;
  end_date: string | null;
  locked: boolean;
}

export interface EvaluationSheetRow {
  student_id: number;
  admission_number: string;
  name: string | null;
  response_id?: number | null;
  answers: Record<string, string | number | boolean | null>;
  overall_score: number | null;
  status: ResultStatus;
}

export interface EvaluationSheetResponse {
  data: EvaluationSheetRow[];
  context: {
    period: Pick<EvaluationPeriod, 'id' | 'label' | 'ordinal' | 'locked'>;
    rubric: {
      id: number;
      name: string;
      items: EvaluationItem[];
    };
    term: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
  };
}

export interface EvaluationTimelineEntry {
  period_id: number;
  period_label: string | null;
  rubric_name: string | null;
  overall_score: number | null;
  overall_remark: string | null;
  status: ResultStatus;
  submitted_at: string | null;
}

export interface StudentPayload {
  name: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  religion?: string | null;
  state_of_origin?: string | null;
  lga?: string | null;
  address?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardian_relationship?: string | null;
  blood_group?: string | null;
  admitted_on?: string | null;
  status?: StudentStatus;
  school_class_id?: number | null;
  arm_id?: number | null;
  session_year?: string | null;
  term?: 'first' | 'second' | 'third' | null;
}

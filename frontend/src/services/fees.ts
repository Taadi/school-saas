import { api } from '@/lib/api';
import {
  FeeCategory,
  FeeStructure,
  FeeSummary,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Paginated,
  Payment,
  PaymentMethod,
} from '@/types/school';

/* -------------------------------------------------------------------------- */
/* Fee Categories                                                             */
/* -------------------------------------------------------------------------- */

export interface FeeCategoryPayload {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export const feeCategoriesApi = {
  list(params?: { search?: string; only_active?: boolean }): Promise<{ data: FeeCategory[] }> {
    return api.get('/fee-categories', params);
  },
  create(payload: FeeCategoryPayload): Promise<{ data: FeeCategory }> {
    return api.post('/fee-categories', payload);
  },
  update(id: number, payload: Partial<FeeCategoryPayload>): Promise<{ data: FeeCategory }> {
    return api.put(`/fee-categories/${id}`, payload);
  },
  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/fee-categories/${id}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Fee Structures                                                             */
/* -------------------------------------------------------------------------- */

export interface FeeStructureFilters {
  academic_session_id?: number;
  school_class_id?: number;
  arm_id?: number;
  term_id?: number;
  fee_category_id?: number;
}

export interface FeeStructurePayload {
  fee_category_id: number;
  school_class_id: number;
  arm_id?: number | null;
  academic_session_id: number;
  term_id?: number | null;
  amount: number;
  is_optional?: boolean;
}

export interface FeeStructureBulkPayload {
  school_class_id: number;
  arm_id?: number | null;
  academic_session_id: number;
  term_id?: number | null;
  items: {
    fee_category_id: number;
    amount: number;
    is_optional?: boolean;
  }[];
}

export const feeStructuresApi = {
  list(filters: FeeStructureFilters = {}): Promise<{ data: FeeStructure[] }> {
    return api.get('/fee-structures', filters as Record<string, unknown>);
  },
  create(payload: FeeStructurePayload): Promise<{ data: FeeStructure }> {
    return api.post('/fee-structures', payload);
  },
  update(id: number, payload: { amount?: number; is_optional?: boolean }): Promise<{ data: FeeStructure }> {
    return api.put(`/fee-structures/${id}`, payload);
  },
  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/fee-structures/${id}`);
  },
  bulkSet(payload: FeeStructureBulkPayload): Promise<{ data: FeeStructure[] }> {
    return api.post('/fee-structures/bulk-set', payload);
  },
};

/* -------------------------------------------------------------------------- */
/* Invoices                                                                   */
/* -------------------------------------------------------------------------- */

export interface InvoiceFilters {
  student_id?: number;
  school_class_id?: number;
  arm_id?: number;
  term_id?: number;
  academic_session_id?: number;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface BulkGeneratePayload {
  school_class_id: number;
  arm_id?: number | null;
  term_id: number;
  include_optional?: boolean;
  regenerate?: boolean;
}

export interface SingleGeneratePayload {
  student_id: number;
  term_id: number;
  school_class_id?: number | null;
  arm_id?: number | null;
  include_optional?: boolean;
}

export interface AddItemPayload {
  fee_category_id: number;
  description?: string | null;
  amount: number;
}

export const invoicesApi = {
  list(filters: InvoiceFilters = {}): Promise<Paginated<Invoice>> {
    return api.get('/invoices', filters as Record<string, unknown>);
  },
  show(id: number): Promise<{ data: Invoice }> {
    return api.get(`/invoices/${id}`);
  },
  summary(params?: { academic_session_id?: number; term_id?: number }): Promise<FeeSummary> {
    return api.get('/invoices/summary', params);
  },
  bulkGenerate(payload: BulkGeneratePayload): Promise<{
    message: string;
    created: number;
    refreshed: number;
    skipped: number;
  }> {
    return api.post('/invoices/generate', payload);
  },
  generateForStudent(payload: SingleGeneratePayload): Promise<{ data: Invoice }> {
    return api.post('/invoices/generate-student', payload);
  },
  addItem(invoiceId: number, payload: AddItemPayload): Promise<{ data: Invoice }> {
    return api.post(`/invoices/${invoiceId}/items`, payload);
  },
  removeItem(invoiceId: number, itemId: number): Promise<{ data: Invoice }> {
    return api.delete(`/invoices/${invoiceId}/items/${itemId}`);
  },
  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/invoices/${id}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* -------------------------------------------------------------------------- */

export interface PaymentFilters {
  invoice_id?: number;
  student_id?: number;
  method?: PaymentMethod;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface PaymentPayload {
  invoice_id: number;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  paid_on: string;
  notes?: string | null;
}

export const paymentsApi = {
  list(filters: PaymentFilters = {}): Promise<Paginated<Payment & { invoice?: Invoice }>> {
    return api.get('/payments', filters as Record<string, unknown>);
  },
  create(payload: PaymentPayload): Promise<{ data: Payment; invoice: Invoice }> {
    return api.post('/payments', payload);
  },
  remove(id: number): Promise<{ message: string }> {
    return api.delete(`/payments/${id}`);
  },
};

/* -------------------------------------------------------------------------- */
/* Helpers + labels                                                           */
/* -------------------------------------------------------------------------- */

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
};

export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  pending: 'bg-destructive/15 text-destructive border-destructive/30',
  partial: 'bg-warning/15 text-warning border-warning/30',
  paid: 'bg-success/15 text-success border-success/30',
};

export function formatNaira(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : amount ?? 0;
  if (Number.isNaN(value)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export type FeeInvoice = Invoice;
export type FeeInvoiceItem = InvoiceItem;

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  LoaderCircleIcon,
  Plus,
  Printer,
  Receipt,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { TERM_LABELS } from '@/services/academic';
import {
  feeCategoriesApi,
  invoicesApi,
  paymentsApi,
  PAYMENT_METHODS,
  INVOICE_STATUS_COLOR,
  INVOICE_STATUS_LABEL,
  formatNaira,
} from '@/services/fees';
import {
  FeeCategory,
  Invoice,
  Payment,
  PaymentMethod,
  TermName,
} from '@/types/school';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardHeading,
  CardToolbar,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  const refresh = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await invoicesApi.show(invoiceId);
        setInvoice(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load invoice.',
        );
      } finally {
        setLoading(false);
      }
    },
    [invoiceId],
  );

  useEffect(() => {
    if (invoiceId) refresh();
  }, [invoiceId, refresh]);

  useEffect(() => {
    feeCategoriesApi.list({ only_active: true }).then((r) => setCategories(r.data));
  }, []);

  async function deletePayment(payment: Payment) {
    if (!confirm(`Void payment of ${formatNaira(payment.amount)}?`)) return;
    try {
      await paymentsApi.remove(payment.id);
      toast.success('Payment removed.');
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not remove payment.',
      );
    }
  }

  async function deleteItem(itemId: number) {
    if (!invoice) return;
    if (!confirm('Remove this line item?')) return;
    try {
      await invoicesApi.removeItem(invoice.id, itemId);
      toast.success('Item removed.');
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not remove item.',
      );
    }
  }

  if (loading && !invoice) {
    return (
      <Container>
        <div className="flex items-center justify-center p-10 text-muted-foreground">
          <LoaderCircleIcon className="size-5 animate-spin" />
        </div>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container>
        <p className="text-muted-foreground">Invoice not found.</p>
      </Container>
    );
  }

  const remaining = Number(invoice.balance);
  const isPaid = invoice.status === 'paid';

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title={
              <span className="flex items-center gap-2 font-mono">
                <Receipt className="size-5" />
                {invoice.invoice_number}
              </span>
            }
            description={`${invoice.student?.user?.name ?? '—'} · ${invoice.school_class?.name ?? ''}${invoice.arm ? ' ' + invoice.arm.name : ''}`}
          />
          <ToolbarActions>
            <Button asChild variant="outline">
              <Link to="/fees/invoices">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
            {!isPaid && (
              <Button onClick={() => setPaymentOpen(true)}>
                <CreditCard className="size-4" />
                Record Payment
              </Button>
            )}
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardHeading>
                <h3 className="text-base font-semibold">Line Items</h3>
              </CardHeading>
              <CardToolbar>
                {!isPaid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddItemOpen(true)}
                  >
                    <Plus className="size-4" />
                    Add Item
                  </Button>
                )}
              </CardToolbar>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-start">Category</th>
                      <th className="px-4 py-2 text-start">Description</th>
                      <th className="px-4 py-2 text-end">Amount</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No items on this invoice.
                        </td>
                      </tr>
                    )}
                    {(invoice.items ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-4 py-2">
                          <span className="font-medium">
                            {item.category?.name ?? '—'}
                          </span>
                          {item.category?.code && (
                            <span className="text-xs text-muted-foreground ms-2 font-mono">
                              {item.category.code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {item.description}
                        </td>
                        <td className="px-4 py-2 text-end font-medium">
                          {formatNaira(item.amount)}
                        </td>
                        <td className="px-4 py-2 text-end">
                          {!isPaid && (
                            <Button
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2 text-sm">
              <Row label="Total" value={formatNaira(invoice.total_amount)} />
              <Row
                label="Paid"
                value={formatNaira(invoice.amount_paid)}
                color="text-success"
              />
              <Separator />
              <Row
                label="Balance"
                value={formatNaira(invoice.balance)}
                bold
                color={
                  remaining > 0 ? 'text-destructive' : 'text-muted-foreground'
                }
              />
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardHeading>
                  <h3 className="text-base font-semibold">Summary</h3>
                </CardHeading>
                <CardToolbar />
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={INVOICE_STATUS_COLOR[invoice.status]}
                  >
                    {INVOICE_STATUS_LABEL[invoice.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span>
                    {invoice.term
                      ? TERM_LABELS[invoice.term.name as TermName]
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Session</span>
                  <span>{invoice.academic_session?.name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span>{invoice.issued_on ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span>{invoice.due_date ?? '—'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardHeading>
                  <h3 className="text-base font-semibold">Student</h3>
                </CardHeading>
                <CardToolbar />
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {invoice.student?.user?.name ?? '—'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {invoice.student?.admission_number}
                </div>
                {invoice.student?.guardian_name && (
                  <div className="border-t border-border pt-2">
                    <div className="text-xs text-muted-foreground">
                      Guardian
                    </div>
                    <div>{invoice.student.guardian_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.student.guardian_phone}
                    </div>
                  </div>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  <Link to={`/students/${invoice.student_id}`}>
                    Open student profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardHeading>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">Payment History</h3>
                <Badge variant="secondary" className="ms-2">
                  {invoice.payments?.length ?? 0}
                </Badge>
              </div>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-start">Date</th>
                    <th className="px-4 py-2 text-start">Method</th>
                    <th className="px-4 py-2 text-start">Reference</th>
                    <th className="px-4 py-2 text-start">Recorded by</th>
                    <th className="px-4 py-2 text-end">Amount</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {(invoice.payments ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}
                  {(invoice.payments ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          {p.paid_on}
                        </div>
                      </td>
                      <td className="px-4 py-2 capitalize">
                        {p.method.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.reference ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.recorder?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-end font-medium text-success">
                        {formatNaira(p.amount)}
                      </td>
                      <td className="px-4 py-2 text-end">
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          onClick={() => deletePayment(p)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </Container>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoice={invoice}
        onSaved={refresh}
      />
      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        invoice={invoice}
        categories={categories}
        onSaved={refresh}
      />
    </Fragment>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`${bold ? 'text-base font-semibold' : 'font-medium'} ${color ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSaved,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  invoice: Invoice;
  onSaved(): void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(Number(invoice.balance));
      setMethod('bank_transfer');
      setReference('');
      setPaidOn(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [open, invoice.balance]);

  async function submit() {
    if (amount <= 0) {
      toast.error('Amount must be positive.');
      return;
    }
    if (amount > Number(invoice.balance) + 0.0001) {
      toast.error(
        `Amount exceeds outstanding balance of ${formatNaira(invoice.balance)}.`,
      );
      return;
    }
    try {
      setSubmitting(true);
      await paymentsApi.create({
        invoice_id: invoice.id,
        amount,
        method,
        reference: reference || null,
        paid_on: paidOn,
        notes: notes || null,
      });
      toast.success('Payment recorded.');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not record payment.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Outstanding balance</span>
              <span className="font-semibold text-destructive">
                {formatNaira(invoice.balance)}
              </span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
            />
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAmount(Number(invoice.balance))}
              >
                Pay full balance
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAmount(Math.round(Number(invoice.balance) / 2))}
              >
                Pay half
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="Transfer ID, receipt #, teller no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  invoice,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  invoice: Invoice;
  categories: FeeCategory[];
  onSaved(): void;
}) {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(null);
      setDescription('');
      setAmount(0);
    }
  }, [open]);

  async function submit() {
    if (!categoryId) {
      toast.error('Pick a category.');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be positive.');
      return;
    }
    try {
      setSubmitting(true);
      await invoicesApi.addItem(invoice.id, {
        fee_category_id: categoryId,
        description: description || null,
        amount,
      });
      toast.success('Item added.');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not add item.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Line Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select
              value={categoryId ? String(categoryId) : ''}
              onValueChange={(v) => setCategoryId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Defaults to category name"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

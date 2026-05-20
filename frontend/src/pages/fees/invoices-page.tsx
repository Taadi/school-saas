import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ExternalLink,
  FileText,
  LoaderCircleIcon,
  PlusCircle,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import {
  TERM_LABELS,
  academicSessionsApi,
  classesApi,
} from '@/services/academic';
import {
  INVOICE_STATUS_COLOR,
  INVOICE_STATUS_LABEL,
  invoicesApi,
  formatNaira,
} from '@/services/fees';
import {
  AcademicSession,
  Arm,
  Invoice,
  InvoiceStatus,
  SchoolClass,
  Term,
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
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
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
import { Switch } from '@/components/ui/switch';

export function InvoicesListPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [filters, setFilters] = useState<{
    sessionId: number | 'all';
    termId: number | 'all';
    classId: number | 'all';
    status: InvoiceStatus | 'all';
    search: string;
  }>({
    sessionId: 'all',
    termId: 'all',
    classId: 'all',
    status: 'all',
    search: '',
  });

  const [data, setData] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [generateOpen, setGenerateOpen] = useState(false);

  // Reference data on mount.
  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([
          academicSessionsApi.list(),
          classesApi.list(),
        ]);
        setSessions(s.data);
        setClasses(c.data);
        const current = s.data.find((x) => x.is_current) ?? s.data[0];
        if (current) {
          setFilters((f) => ({
            ...f,
            sessionId: current.id,
            termId:
              current.terms?.find((t) => t.is_current)?.id ?? 'all',
          }));
        }
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : 'Could not load reference data.',
        );
      }
    })();
  }, []);

  const session = useMemo(
    () =>
      filters.sessionId === 'all'
        ? null
        : sessions.find((s) => s.id === filters.sessionId) ?? null,
    [sessions, filters.sessionId],
  );

  const fetchInvoices = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await invoicesApi.list({
          academic_session_id:
            filters.sessionId === 'all' ? undefined : filters.sessionId,
          term_id: filters.termId === 'all' ? undefined : filters.termId,
          school_class_id:
            filters.classId === 'all' ? undefined : filters.classId,
          status: filters.status === 'all' ? undefined : filters.status,
          search: filters.search || undefined,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        });
        setData(r.data);
        setMeta({
          total: r.meta.total,
          current_page: r.meta.current_page,
          last_page: r.meta.last_page,
        });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load invoices.',
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination],
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        id: 'invoice_number',
        accessorFn: (r) => r.invoice_number,
        header: ({ column }) => (
          <DataGridColumnHeader title="Invoice #" column={column} />
        ),
        cell: ({ row }) => (
          <Link
            to={`/fees/invoices/${row.original.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.original.invoice_number}
          </Link>
        ),
        size: 160,
      },
      {
        id: 'student',
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {row.original.student?.user?.name ?? '—'}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {row.original.student?.admission_number}
            </span>
          </div>
        ),
        size: 220,
      },
      {
        id: 'class',
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" column={column} />
        ),
        cell: ({ row }) => (
          <span>
            {row.original.school_class?.name}
            {row.original.arm ? ` ${row.original.arm.name}` : ''}
          </span>
        ),
        size: 120,
      },
      {
        id: 'term',
        header: ({ column }) => (
          <DataGridColumnHeader title="Term" column={column} />
        ),
        cell: ({ row }) => (
          <span>
            {row.original.term
              ? TERM_LABELS[row.original.term.name as TermName]
              : '—'}
          </span>
        ),
        size: 130,
      },
      {
        id: 'total',
        header: ({ column }) => (
          <DataGridColumnHeader title="Total" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{formatNaira(row.original.total_amount)}</span>
        ),
        size: 120,
      },
      {
        id: 'paid',
        header: ({ column }) => (
          <DataGridColumnHeader title="Paid" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-success">
            {formatNaira(row.original.amount_paid)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'balance',
        header: ({ column }) => (
          <DataGridColumnHeader title="Balance" column={column} />
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.balance > 0
                ? 'text-destructive font-medium'
                : 'text-muted-foreground'
            }
          >
            {formatNaira(row.original.balance)}
          </span>
        ),
        size: 130,
      },
      {
        id: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={INVOICE_STATUS_COLOR[row.original.status]}
          >
            {INVOICE_STATUS_LABEL[row.original.status]}
          </Badge>
        ),
        size: 130,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" mode="icon" size="sm">
            <Link to={`/fees/invoices/${row.original.id}`}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        ),
        size: 60,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data,
    getRowId: (row) => String(row.id),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    pageCount: meta.last_page,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Invoices"
            description="Termly invoices for every student. Generate them in bulk by class and record payments as they come in."
          />
          <ToolbarActions>
            <Button onClick={() => setGenerateOpen(true)}>
              <Wand2 className="size-4" />
              Generate Invoices
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={meta.total}
          isLoading={loading}
          tableLayout={{ columnsPinnable: false, columnsMovable: false, cellBorder: true }}
        >
          <Card>
            <CardHeader>
              <CardHeading>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search invoice #, student name…"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, search: e.target.value }))
                      }
                      className="ps-9 w-72"
                    />
                    {filters.search && (
                      <Button
                        mode="icon"
                        variant="ghost"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() =>
                          setFilters((f) => ({ ...f, search: '' }))
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </div>

                  <Select
                    value={String(filters.sessionId)}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        sessionId: v === 'all' ? 'all' : Number(v),
                        termId: 'all',
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sessions</SelectItem>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(filters.termId)}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        termId: v === 'all' ? 'all' : Number(v),
                      }))
                    }
                    disabled={!session}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {(session?.terms ?? []).map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {TERM_LABELS[t.name as TermName]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(filters.classId)}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        classId: v === 'all' ? 'all' : Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.status}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        status: v as InvoiceStatus | 'all',
                      }))
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Unpaid</SelectItem>
                      <SelectItem value="partial">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge variant="secondary" className="ms-1">
                    <FileText className="size-3 me-1" />
                    {meta.total} invoices
                  </Badge>
                </div>
              </CardHeading>
              <CardToolbar />
            </CardHeader>
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </Container>

      <BulkGenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        sessions={sessions}
        classes={classes}
        defaultSessionId={session?.id ?? null}
        defaultTermId={
          session?.terms?.find((t) => t.is_current)?.id ?? null
        }
        onGenerated={fetchInvoices}
      />
    </Fragment>
  );
}

function BulkGenerateDialog({
  open,
  onOpenChange,
  sessions,
  classes,
  defaultSessionId,
  defaultTermId,
  onGenerated,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  sessions: AcademicSession[];
  classes: SchoolClass[];
  defaultSessionId: number | null;
  defaultTermId: number | null;
  onGenerated(): void;
}) {
  const [sessionId, setSessionId] = useState<number | null>(defaultSessionId);
  const [termId, setTermId] = useState<number | null>(defaultTermId);
  const [classId, setClassId] = useState<number | null>(null);
  const [armId, setArmId] = useState<number | null>(null);
  const [arms, setArms] = useState<Arm[]>([]);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [regenerate, setRegenerate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSessionId(defaultSessionId);
      setTermId(defaultTermId);
      setClassId(null);
      setArmId(null);
      setArms([]);
      setIncludeOptional(false);
      setRegenerate(false);
    }
  }, [open, defaultSessionId, defaultTermId]);

  useEffect(() => {
    if (!classId) {
      setArms([]);
      setArmId(null);
      return;
    }
    classesApi.show(classId).then((r) => {
      setArms(r.data.arms ?? []);
      setArmId(null);
    });
  }, [classId]);

  const session = sessions.find((s) => s.id === sessionId) ?? null;

  async function generate() {
    if (!classId || !termId) {
      toast.error('Pick a class and term.');
      return;
    }
    try {
      setSubmitting(true);
      const r = await invoicesApi.bulkGenerate({
        school_class_id: classId,
        arm_id: armId,
        term_id: termId,
        include_optional: includeOptional,
        regenerate,
      });
      toast.success(r.message);
      onOpenChange(false);
      onGenerated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not generate invoices.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Invoices in Bulk</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Session</Label>
            <Select
              value={sessionId ? String(sessionId) : ''}
              onValueChange={(v) => {
                setSessionId(Number(v));
                setTermId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} {s.is_current && '(current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Term</Label>
            <Select
              value={termId ? String(termId) : ''}
              onValueChange={(v) => setTermId(Number(v))}
              disabled={!session}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {(session?.terms ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {TERM_LABELS[t.name as TermName]}
                    {t.is_current && ' (current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Class</Label>
            <Select
              value={classId ? String(classId) : ''}
              onValueChange={(v) => setClassId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Arm (optional)</Label>
            <Select
              value={armId ? String(armId) : 'all'}
              onValueChange={(v) => setArmId(v === 'all' ? null : Number(v))}
              disabled={arms.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="All arms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All arms in class</SelectItem>
                {arms.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    Arm {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-dashed p-3 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">
                Include optional fees in invoice
              </Label>
              <Switch
                checked={includeOptional}
                onCheckedChange={(v) => setIncludeOptional(Boolean(v))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">
                  Regenerate existing invoices
                </Label>
                <p className="text-xs text-muted-foreground">
                  Refresh items from the latest fee structure. Payments are kept.
                </p>
              </div>
              <Switch
                checked={regenerate}
                onCheckedChange={(v) => setRegenerate(Boolean(v))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={submitting}>
            {submitting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <PlusCircle className="size-4" />
            )}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

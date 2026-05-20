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
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { academicSessionsApi, classesApi } from '@/services/academic';
import { subTermsApi } from '@/services/sub-terms';
import {
  RESULT_STATUS_COLOR,
  RESULT_STATUS_LABEL,
  resultsApi,
} from '@/services/results';
import {
  AcademicSession,
  ResultListItem,
  ResultStatus,
  SchoolClass,
  Subject,
  SubTerm,
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
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ResultsListPage() {
  const [items, setItems] = useState<ResultListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [searchAdm, setSearchAdm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [armFilter, setArmFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [periodKey, setPeriodKey] = useState('term');
  const [subTerms, setSubTerms] = useState<SubTerm[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const armsForFilter = useMemo(() => {
    if (!classFilter) return [];
    return classes.find((c) => String(c.id) === classFilter)?.arms ?? [];
  }, [classFilter, classes]);

  const sessionTerms = useMemo(() => {
    return sessions.flatMap((s) => s.terms ?? []);
  }, [sessions]);

  useEffect(() => {
    Promise.all([
      academicSessionsApi.list(),
      classesApi.list(true),
    ])
      .then(([sRes, cRes]) => {
        setSessions(sRes.data);
        setClasses(cRes.data);
        const current = sRes.data.find((s) => s.is_current);
        const t = current?.terms?.find((t) => t.is_current) ?? current?.terms?.[0];
        if (t) setTermFilter(String(t.id));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!classFilter) {
      setSubjects([]);
      setSubjectFilter('');
      return;
    }
    classesApi
      .subjects(Number(classFilter))
      .then((r) => setSubjects(r.data))
      .catch(() => setSubjects([]));
  }, [classFilter]);

  useEffect(() => {
    if (!termFilter) {
      setSubTerms([]);
      setPeriodKey('term');
      return;
    }
    subTermsApi
      .list(Number(termFilter))
      .then((r) => setSubTerms(r.data))
      .catch(() => setSubTerms([]));
  }, [termFilter]);

  const subTermId = periodKey === 'term' ? null : Number(periodKey);

  const fetchResults = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await resultsApi.list({
          school_class_id: classFilter ? Number(classFilter) : undefined,
          arm_id: armFilter ? Number(armFilter) : undefined,
          subject_id: subjectFilter ? Number(subjectFilter) : undefined,
          term_id: termFilter ? Number(termFilter) : undefined,
          sub_term_id: subTermId,
          status: statusFilter ? (statusFilter as ResultStatus) : undefined,
          per_page: pagination.pageSize,
        });
        let data = r.data;
        if (searchAdm.trim()) {
          const q = searchAdm.toLowerCase().trim();
          data = data.filter(
            (it) =>
              it.student?.admission_number.toLowerCase().includes(q) ||
              it.student?.user?.name.toLowerCase().includes(q),
          );
        }
        setItems(data);
        setTotal(r.meta?.total ?? data.length);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load results.',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      classFilter,
      armFilter,
      subjectFilter,
      termFilter,
      subTermId,
      statusFilter,
      pagination.pageSize,
      searchAdm,
    ],
  );

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  async function approveBatch() {
    if (!classFilter || !subjectFilter || !termFilter) {
      toast.error('Pick a class, subject and term to approve a batch.');
      return;
    }
    try {
      const r = await resultsApi.approve({
        school_class_id: Number(classFilter),
        arm_id: armFilter ? Number(armFilter) : undefined,
        subject_id: Number(subjectFilter),
        term_id: Number(termFilter),
        sub_term_id: subTermId,
      });
      toast.success(`${r.approved} result(s) approved.`);
      fetchResults();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not approve.');
    }
  }

  async function approveOne(id: number) {
    try {
      const r = await resultsApi.approve({ result_ids: [id] });
      toast.success(`${r.approved} result approved.`);
      fetchResults();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not approve.');
    }
  }

  /**
   * Build score columns dynamically from the visible result rows. When the
   * filter narrows down to a single scheme/subject, we render one column per
   * component code (matching what Score Entry showed). When there are too
   * many distinct codes (e.g. mixed schemes across multiple subjects), we
   * collapse them into a single "Breakdown" column to keep the table sane.
   */
  const dynamicScoreColumns = useMemo<ColumnDef<ResultListItem>[]>(() => {
    const codes = new Set<string>();
    for (const it of items) {
      const scores = it.scores ?? legacyScores(it);
      Object.keys(scores).forEach((k) => codes.add(k));
    }
    const codeList = Array.from(codes);

    if (codeList.length === 0) {
      return [];
    }

    if (codeList.length > 6) {
      return [
        {
          id: 'breakdown',
          header: 'Breakdown',
          cell: ({ row }) => {
            const scores = row.original.scores ?? legacyScores(row.original);
            return (
              <span className="text-xs text-muted-foreground font-mono">
                {Object.entries(scores)
                  .map(([k, v]) => `${k}:${v ?? '—'}`)
                  .join(' · ')}
              </span>
            );
          },
          size: 240,
        },
      ];
    }

    return codeList.map((code) => ({
      id: `score-${code}`,
      header: code.toUpperCase(),
      cell: ({ row }) => {
        const scores = row.original.scores ?? legacyScores(row.original);
        const v = scores[code];
        return v == null || v === '' ? '—' : v;
      },
      size: 70,
    }));
  }, [items]);

  const columns = useMemo<ColumnDef<ResultListItem>[]>(() => [
    {
      id: 'student',
      header: ({ column }) => <DataGridColumnHeader title="Student" column={column} />,
      cell: ({ row }) => (
        <Link
          to={`/results/students/${row.original.student_id}/report-card?term_id=${termFilter || ''}`}
          className="font-medium text-mono hover:text-primary flex flex-col"
        >
          <span>{row.original.student?.user?.name ?? '—'}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.student?.admission_number}
          </span>
        </Link>
      ),
      size: 220,
    },
    {
      id: 'subject',
      header: ({ column }) => <DataGridColumnHeader title="Subject" column={column} />,
      cell: ({ row }) => (
        <span className="text-foreground">
          {row.original.subject?.name}{' '}
          <span className="text-xs font-mono text-muted-foreground">({row.original.subject?.code})</span>
        </span>
      ),
      size: 200,
    },
    {
      id: 'class',
      header: ({ column }) => <DataGridColumnHeader title="Class" column={column} />,
      cell: ({ row }) => (
        <span>
          {row.original.school_class?.name}
          {row.original.arm?.name ? ` ${row.original.arm.name}` : ''}
        </span>
      ),
      size: 120,
    },
    ...dynamicScoreColumns,
    {
      id: 'total',
      header: ({ column }) => <DataGridColumnHeader title="Total" column={column} />,
      cell: ({ row }) => <span className="font-semibold">{row.original.total}</span>,
      size: 80,
    },
    {
      id: 'grade',
      header: ({ column }) => <DataGridColumnHeader title="Grade" column={column} />,
      cell: ({ row }) =>
        row.original.grade ? (
          <Badge variant="outline">{row.original.grade}</Badge>
        ) : (
          '—'
        ),
      size: 80,
    },
    {
      id: 'status',
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_STATUS_COLOR[row.original.status]}`}>
          {RESULT_STATUS_LABEL[row.original.status]}
        </span>
      ),
      size: 110,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" mode="icon" size="sm" title="Open report card">
            <Link to={`/results/students/${row.original.student_id}/report-card?term_id=${row.original.term?.id ?? termFilter}`}>
              <ExternalLink className="size-4" />
            </Link>
          </Button>
          {row.original.status !== 'approved' && (
            <Button
              variant="ghost"
              mode="icon"
              size="sm"
              title="Approve"
              onClick={() => approveOne(row.original.id)}
            >
              <CheckCircle2 className="size-4 text-green-600" />
            </Button>
          )}
        </div>
      ),
      size: 90,
    },
  ], [termFilter, dynamicScoreColumns]);

  const table = useReactTable({
    columns,
    data: items,
    getRowId: (row) => String(row.id),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
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
            title="All Results"
            description="School-wide view of recorded results. Approve drafts to lock them and unlock report cards."
          />
          <ToolbarActions>
            <Button onClick={approveBatch} disabled={!classFilter || !subjectFilter || !termFilter}>
              <CheckCircle2 className="size-4" />
              Approve filtered batch
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={total}
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
                      placeholder="Search name / adm #"
                      value={searchAdm}
                      onChange={(e) => setSearchAdm(e.target.value)}
                      className="ps-9 w-56"
                    />
                  </div>

                  <Select value={termFilter || undefined} onValueChange={(v) => setTermFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {sessions.map((s) =>
                        (s.terms ?? []).map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {s.name} · {capitalize(t.name)} term
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>

                  <Select value={periodKey} onValueChange={setPeriodKey} disabled={!termFilter || termFilter === 'all'}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="term">End of term</SelectItem>
                      {subTerms.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={classFilter || undefined} onValueChange={(v) => { setClassFilter(v === 'all' ? '' : v); setArmFilter(''); setSubjectFilter(''); }}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={armFilter || undefined} onValueChange={(v) => setArmFilter(v === 'all' ? '' : v)} disabled={!classFilter || armsForFilter.length === 0}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder={classFilter ? (armsForFilter.length ? 'All arms' : 'No arms') : 'Arm'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All arms</SelectItem>
                      {armsForFilter.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={subjectFilter || undefined} onValueChange={(v) => setSubjectFilter(v === 'all' ? '' : v)} disabled={!classFilter || subjects.length === 0}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={classFilter ? (subjects.length ? 'All subjects' : 'No subjects') : 'Subject'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.code} — {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter || undefined} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchAdm || classFilter || armFilter || subjectFilter || statusFilter) && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSearchAdm(''); setClassFilter(''); setArmFilter('');
                      setSubjectFilter(''); setStatusFilter('');
                    }}>
                      <X className="size-3.5" /> Clear
                    </Button>
                  )}

                  <Badge variant="secondary" className="ms-2">
                    <ClipboardList className="size-3 me-1" /> {total} total
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
    </Fragment>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Backward compat: rows written before the scheme migration only have the
 * legacy fixed columns. Reconstruct a `scores` map from them so the dynamic
 * column renderer treats new and old data the same way.
 */
function legacyScores(it: ResultListItem): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  if (it.ca1 != null) out.ca1 = it.ca1;
  if (it.ca2 != null) out.ca2 = it.ca2;
  if (it.midterm != null) out.midterm = it.midterm;
  if (it.exam != null) out.exam = it.exam;
  return out;
}

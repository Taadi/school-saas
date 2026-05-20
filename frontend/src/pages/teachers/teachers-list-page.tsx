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
  Download,
  Edit,
  KeyRound,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { teachersApi, TEACHER_STATUS_BADGE } from '@/services/teachers';
import { ApiError } from '@/lib/api';
import { Teacher, TeacherFilters } from '@/types/school';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Container } from '@/components/common/container';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeacherFormDialog } from './components/teacher-form-dialog';

export function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: true },
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);
  const [resetResult, setResetResult] = useState<
    { email: string; temporary_password: string } | null
  >(null);

  const fetchTeachers = useMemo(
    () =>
      async (overrides: Partial<TeacherFilters> = {}) => {
        try {
          setLoading(true);
          const filters: TeacherFilters = {
            search: searchQuery || undefined,
            subject: subjectFilter || undefined,
            status: statusFilter
              ? (statusFilter as Teacher['status'])
              : undefined,
            gender: genderFilter
              ? (genderFilter as 'male' | 'female')
              : undefined,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            sort: sorting[0]?.id ?? 'id',
            direction: sorting[0]?.desc ? 'desc' : 'asc',
            ...overrides,
          };
          const res = await teachersApi.list(filters);
          setTeachers(res.data);
          setTotal(res.meta?.total ?? res.data.length);
        } catch (err) {
          toast.error(
            err instanceof ApiError ? err.message : 'Could not load teachers.',
          );
        } finally {
          setLoading(false);
        }
      },
    [
      searchQuery,
      subjectFilter,
      statusFilter,
      genderFilter,
      pagination,
      sorting,
    ],
  );

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await teachersApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name ?? 'Teacher'} removed.`);
      setDeleteTarget(null);
      fetchTeachers();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete teacher.',
      );
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    try {
      const res = await teachersApi.resetPassword(resetTarget.id);
      setResetResult(res);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not reset password.',
      );
    }
  }

  function exportCsv() {
    if (!teachers.length) {
      toast.message('Nothing to export on this page.');
      return;
    }
    const cols = [
      'staff_id',
      'name',
      'email',
      'phone',
      'subject_specialization',
      'qualification',
      'years_of_experience',
      'date_employed',
      'gender',
      'state_of_origin',
      'status',
    ];
    const rows = teachers.map((t) => [
      t.staff_id,
      t.name ?? '',
      t.email ?? '',
      t.phone ?? '',
      t.subject_specialization ?? '',
      t.qualification ?? '',
      t.years_of_experience ?? '',
      t.date_employed ?? '',
      t.gender ?? '',
      t.state_of_origin ?? '',
      t.status,
    ]);
    const csv = [
      cols.join(','),
      ...rows.map((r) =>
        r
          .map((v) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<Teacher>[]>(
    () => [
      {
        id: 'staff_id',
        accessorFn: (r) => r.staff_id,
        header: ({ column }) => (
          <DataGridColumnHeader title="Staff ID" column={column} />
        ),
        cell: ({ row }) => (
          <Link
            to={`/teachers/${row.original.id}`}
            className="font-mono text-mono hover:text-primary"
          >
            {row.original.staff_id}
          </Link>
        ),
        size: 130,
      },
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Teacher" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              to={`/teachers/${row.original.id}`}
              className="font-medium text-mono hover:text-primary"
            >
              {row.original.name ?? '—'}
            </Link>
            {row.original.email && (
              <span className="text-xs text-muted-foreground">
                {row.original.email}
              </span>
            )}
          </div>
        ),
        size: 240,
      },
      {
        id: 'subject',
        accessorFn: (r) => r.subject_specialization,
        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} />
        ),
        cell: ({ row }) =>
          row.original.subject_specialization ? (
            <span>{row.original.subject_specialization}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 180,
      },
      {
        id: 'qualification',
        accessorFn: (r) => r.qualification,
        header: ({ column }) => (
          <DataGridColumnHeader title="Qualification" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-foreground/80">
            {row.original.qualification ?? '—'}
          </span>
        ),
        size: 200,
      },
      {
        id: 'years_of_experience',
        accessorFn: (r) => r.years_of_experience,
        header: ({ column }) => (
          <DataGridColumnHeader title="Experience" column={column} />
        ),
        cell: ({ row }) =>
          row.original.years_of_experience !== null ? (
            <span>{row.original.years_of_experience} yr(s)</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 110,
      },
      {
        id: 'phone',
        accessorFn: (r) => r.phone,
        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} />
        ),
        cell: ({ row }) =>
          row.original.phone ? (
            <a
              href={`tel:${row.original.phone}`}
              className="text-foreground hover:text-primary"
            >
              {row.original.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 150,
      },
      {
        id: 'status',
        accessorFn: (r) => r.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const s = TEACHER_STATUS_BADGE[row.original.status];
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}
            >
              {s.label}
            </span>
          );
        },
        size: 110,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/teachers/${row.original.id}`}>View profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
              >
                <Edit className="size-4 me-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setResetTarget(row.original);
                  setResetResult(null);
                }}
              >
                <KeyRound className="size-4 me-2" />
                Reset password
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-4 me-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: teachers,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    getRowId: (row) => String(row.id),
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
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
            title="Teachers"
            description="Manage staff records, qualifications, payroll info, and login access"
          />
          <ToolbarActions>
            <Button
              variant="outline"
              onClick={() => teachersApi.downloadTemplate()}
            >
              <Download className="size-4" />
              Template
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Teacher
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={total}
          isLoading={loading}
          tableLayout={{
            columnsPinnable: false,
            columnsMovable: false,
            cellBorder: true,
          }}
        >
          <Card>
            <CardHeader>
              <CardHeading>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search by name, staff ID, email…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPagination((p) => ({ ...p, pageIndex: 0 }));
                      }}
                      className="ps-9 w-72"
                    />
                    {searchQuery && (
                      <Button
                        mode="icon"
                        variant="ghost"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery('')}
                      >
                        <X />
                      </Button>
                    )}
                  </div>

                  <Input
                    placeholder="Filter by subject"
                    value={subjectFilter}
                    onChange={(e) => {
                      setSubjectFilter(e.target.value);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                    className="w-44"
                  />

                  <Select
                    value={statusFilter || undefined}
                    onValueChange={(v) => {
                      setStatusFilter(v === 'all' ? '' : v);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On leave</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={genderFilter || undefined}
                    onValueChange={(v) => {
                      setGenderFilter(v === 'all' ? '' : v);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchQuery || subjectFilter || statusFilter || genderFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSubjectFilter('');
                        setStatusFilter('');
                        setGenderFilter('');
                      }}
                    >
                      <X className="size-3.5" />
                      Clear
                    </Button>
                  )}

                  <Badge variant="secondary" className="ms-2">
                    {total} total
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

      <TeacherFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editing}
        onSaved={() => fetchTeachers()}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove teacher?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong> (
            {deleteTarget?.staff_id}) will be soft-deleted and their login
            disabled. You can restore them later from the database.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setResetResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset login password?</DialogTitle>
          </DialogHeader>
          {!resetResult ? (
            <p className="text-sm text-muted-foreground">
              Generate a new temporary password for{' '}
              <strong className="text-foreground">{resetTarget?.name}</strong> (
              {resetTarget?.email}). Share it securely — they should change it
              after their first login.
            </p>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="text-sm">
                Email: <strong>{resetResult.email}</strong>
              </div>
              <div className="text-sm">
                New password:{' '}
                <code className="rounded bg-background px-2 py-0.5 font-mono">
                  {resetResult.temporary_password}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            {!resetResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setResetTarget(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>Reset password</Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setResetTarget(null);
                  setResetResult(null);
                }}
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => fetchTeachers()}
      />
    </Fragment>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  onImported(): void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof teachersApi.import>
  > | null>(null);

  async function submit() {
    if (!file) return;
    try {
      setImporting(true);
      setResult(null);
      const res = await teachersApi.import(file);
      setResult(res);
      toast.success(`${res.created} teacher(s) imported.`);
      onImported();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setFile(null);
          setResult(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk import teachers</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with teacher records. Each row is validated
            independently. Need a starting point?{' '}
            <button
              type="button"
              onClick={() => teachersApi.downloadTemplate()}
              className="text-primary underline"
            >
              Download template
            </button>
            .
          </p>
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {result && (
            <div className="rounded-md border p-3 text-sm space-y-3 max-h-72 overflow-auto">
              <div>
                Created:{' '}
                <strong className="text-green-600">{result.created}</strong>
              </div>

              {result.credentials.length > 0 && (
                <div>
                  <div className="font-medium mb-1">
                    Login credentials (share securely):
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-start py-1">Staff ID</th>
                        <th className="text-start py-1">Email</th>
                        <th className="text-start py-1">Temp password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.credentials.map((c) => (
                        <tr key={c.staff_id} className="border-t">
                          <td className="py-1 font-mono">{c.staff_id}</td>
                          <td className="py-1">{c.email}</td>
                          <td className="py-1 font-mono">
                            {c.temporary_password}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.errors.length > 0 && (
                <div>
                  <div className="text-destructive font-medium mb-1">
                    {result.errors.length} error(s):
                  </div>
                  <ul className="list-disc ml-5 text-muted-foreground text-xs space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={submit} disabled={!file || importing}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

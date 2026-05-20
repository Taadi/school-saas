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
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { studentsApi, referenceApi } from '@/services/students';
import { ApiError } from '@/lib/api';
import { SchoolClass, Student, StudentFilters } from '@/types/school';
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
import { StudentFormDialog } from './components/student-form-dialog';

const STATUS_BADGE: Record<Student['status'], { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/15 text-green-700' },
  graduated: { label: 'Graduated', color: 'bg-blue-500/15 text-blue-700' },
  transferred: { label: 'Transferred', color: 'bg-yellow-500/15 text-yellow-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-red-500/15 text-red-700' },
};

export function StudentsListPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [armFilter, setArmFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: true },
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const armsForFilter = useMemo(() => {
    if (!classFilter) return [];
    const cls = classes.find((c) => String(c.id) === classFilter);
    return cls?.arms ?? [];
  }, [classFilter, classes]);

  useEffect(() => {
    referenceApi
      .classes()
      .then((r) => setClasses(r.data))
      .catch(() => undefined);
  }, []);

  const fetchStudents = useMemo(
    () =>
      async (overrides: Partial<StudentFilters> = {}) => {
        try {
          setLoading(true);
          const filters: StudentFilters = {
            search: searchQuery || undefined,
            school_class_id: classFilter ? Number(classFilter) : undefined,
            arm_id: armFilter ? Number(armFilter) : undefined,
            status: statusFilter
              ? (statusFilter as Student['status'])
              : undefined,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            sort: sorting[0]?.id ?? 'id',
            direction: sorting[0]?.desc ? 'desc' : 'asc',
            ...overrides,
          };
          const res = await studentsApi.list(filters);
          setStudents(res.data);
          setTotal(res.meta?.total ?? res.data.length);
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : 'Could not load students.';
          toast.error(message);
        } finally {
          setLoading(false);
        }
      },
    [searchQuery, classFilter, armFilter, statusFilter, pagination, sorting],
  );

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await studentsApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not delete student.';
      toast.error(message);
    }
  }

  function exportCsv() {
    if (!students.length) {
      toast.message('Nothing to export on this page.');
      return;
    }
    const cols = [
      'admission_number',
      'name',
      'gender',
      'date_of_birth',
      'state_of_origin',
      'guardian_name',
      'guardian_phone',
      'class',
      'arm',
      'status',
    ];
    const rows = students.map((s) => [
      s.admission_number,
      s.name,
      s.gender ?? '',
      s.date_of_birth ?? '',
      s.state_of_origin ?? '',
      s.guardian_name ?? '',
      s.guardian_phone ?? '',
      s.current_class?.school_class_name ?? '',
      s.current_class?.arm_name ?? '',
      s.status,
    ]);
    const csv = [
      cols.join(','),
      ...rows.map((r) =>
        r
          .map((v) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'admission_number',
        accessorFn: (r) => r.admission_number,
        header: ({ column }) => (
          <DataGridColumnHeader title="Admission #" column={column} />
        ),
        cell: ({ row }) => (
          <Link
            to={`/students/${row.original.id}`}
            className="font-medium text-mono hover:text-primary"
          >
            {row.original.admission_number}
          </Link>
        ),
        size: 140,
      },
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Student" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              to={`/students/${row.original.id}`}
              className="font-medium text-mono hover:text-primary"
            >
              {row.original.name}
            </Link>
            {row.original.guardian_name && (
              <span className="text-xs text-muted-foreground">
                Guardian: {row.original.guardian_name}
              </span>
            )}
          </div>
        ),
        size: 240,
      },
      {
        id: 'class',
        accessorFn: (r) =>
          `${r.current_class?.school_class_name ?? ''} ${r.current_class?.arm_name ?? ''}`,
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" column={column} />
        ),
        cell: ({ row }) => {
          const cc = row.original.current_class;
          if (!cc?.school_class_name) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span className="text-foreground font-medium">
              {cc.school_class_name}
              {cc.arm_name ? ` ${cc.arm_name}` : ''}
            </span>
          );
        },
        size: 160,
      },
      {
        id: 'gender',
        accessorFn: (r) => r.gender,
        header: ({ column }) => (
          <DataGridColumnHeader title="Gender" column={column} />
        ),
        cell: ({ row }) =>
          row.original.gender ? (
            <span className="capitalize text-foreground">
              {row.original.gender}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 100,
      },
      {
        id: 'guardian_phone',
        accessorFn: (r) => r.guardian_phone,
        header: ({ column }) => (
          <DataGridColumnHeader title="Guardian Phone" column={column} />
        ),
        cell: ({ row }) =>
          row.original.guardian_phone ? (
            <a
              href={`tel:${row.original.guardian_phone}`}
              className="text-foreground hover:text-primary"
            >
              {row.original.guardian_phone}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 160,
      },
      {
        id: 'status',
        accessorFn: (r) => r.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const s = STATUS_BADGE[row.original.status];
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}
            >
              {s.label}
            </span>
          );
        },
        size: 120,
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
                <Link to={`/students/${row.original.id}`}>View profile</Link>
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
    data: students,
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
            title="Students"
            description="Manage student records, classes, guardians, and admissions"
          />
          <ToolbarActions>
            <Button variant="outline" onClick={() => studentsApi.downloadTemplate()}>
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
              Add Student
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
                      placeholder="Search by name, admission #..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPagination((p) => ({ ...p, pageIndex: 0 }));
                      }}
                      className="ps-9 w-64"
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

                  <Select
                    value={classFilter || undefined}
                    onValueChange={(v) => {
                      setClassFilter(v === 'all' ? '' : v);
                      setArmFilter('');
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All classes" />
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
                    value={armFilter || undefined}
                    onValueChange={(v) => {
                      setArmFilter(v === 'all' ? '' : v);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                    disabled={!classFilter || armsForFilter.length === 0}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue
                        placeholder={
                          classFilter
                            ? armsForFilter.length
                              ? 'All arms'
                              : 'No arms'
                            : 'Arm'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All arms</SelectItem>
                      {armsForFilter.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>

                  {(searchQuery || classFilter || armFilter || statusFilter) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setClassFilter('');
                        setArmFilter('');
                        setStatusFilter('');
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

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editing}
        classes={classes}
        onSaved={fetchStudents}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete student?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong> (
            {deleteTarget?.admission_number}) will be soft-deleted. You can
            restore them later from the database.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchStudents}
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
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  async function submit() {
    if (!file) return;
    try {
      setImporting(true);
      setResult(null);
      const res = await studentsApi.import(file);
      setResult(res);
      toast.success(`${res.created} student(s) imported.`);
      if (res.errors.length === 0) {
        onImported();
        setTimeout(() => onOpenChange(false), 800);
      } else {
        onImported();
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Import failed.';
      toast.error(message);
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
          <DialogTitle>Bulk import students</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with student records. Need a starting point?{' '}
            <button
              type="button"
              onClick={() => studentsApi.downloadTemplate()}
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
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div>
                Created:{' '}
                <strong className="text-green-600">{result.created}</strong>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <div className="text-destructive font-medium mb-1">
                    {result.errors.length} error(s):
                  </div>
                  <ul className="list-disc ml-5 text-muted-foreground text-xs space-y-1 max-h-40 overflow-auto">
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

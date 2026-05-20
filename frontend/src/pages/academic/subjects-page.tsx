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
  BookOpen,
  LoaderCircleIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { ApiError } from '@/lib/api';
import { SubjectPayload, subjectsApi } from '@/services/academic';
import { subjectTeachersApi } from '@/services/subject-teachers';
import { Subject } from '@/types/school';
import { SubjectTeachersDialog } from './components/subject-teachers-dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

export function SubjectsPage() {
  const { user } = useAuth();
  const canManageTeachers =
    user?.role === 'school_admin' || user?.role === 'super_admin';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherCounts, setTeacherCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [teachersTarget, setTeachersTarget] = useState<Subject | null>(null);

  // Pull all current assignments once and bucket per subject — keeps the
  // listing snappy without an extra request per row.
  const refreshCounts = useMemo(
    () => async () => {
      try {
        const r = await subjectTeachersApi.list();
        const counts: Record<number, number> = {};
        r.data.forEach((a) => {
          counts[a.subject_id] = (counts[a.subject_id] ?? 0) + 1;
        });
        setTeacherCounts(counts);
      } catch {
        // Non-fatal — column will just show 0.
      }
    },
    [],
  );

  const refresh = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await subjectsApi.list(search || undefined);
        setSubjects(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load subjects.',
        );
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await subjectsApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete subject.',
      );
    }
  }

  const columns = useMemo<ColumnDef<Subject>[]>(
    () => [
      {
        id: 'code',
        accessorFn: (r) => r.code,
        header: ({ column }) => (
          <DataGridColumnHeader title="Code" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
        size: 100,
      },
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
        ),
        size: 240,
      },
      {
        id: 'description',
        accessorFn: (r) => r.description,
        header: ({ column }) => (
          <DataGridColumnHeader title="Description" column={column} />
        ),
        cell: ({ row }) =>
          row.original.description ? (
            <span className="text-muted-foreground">
              {row.original.description}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 260,
      },
      {
        id: 'teachers',
        accessorFn: (r) => teacherCounts[r.id] ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Teachers" column={column} />
        ),
        cell: ({ row }) => {
          const count = teacherCounts[row.original.id] ?? 0;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ms-2"
              onClick={() => setTeachersTarget(row.original)}
              disabled={!canManageTeachers}
            >
              <Users className="size-3.5 me-1.5" />
              {count === 0 ? (
                <span className="text-muted-foreground">Assign</span>
              ) : (
                <span>
                  {count} <span className="text-muted-foreground">assigned</span>
                </span>
              )}
            </Button>
          );
        },
        size: 140,
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
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4 me-2" />
                Edit
              </DropdownMenuItem>
              {canManageTeachers && (
                <DropdownMenuItem
                  onClick={() => setTeachersTarget(row.original)}
                >
                  <Users className="size-4 me-2" />
                  Manage teachers
                </DropdownMenuItem>
              )}
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
    [teacherCounts, canManageTeachers],
  );

  const table = useReactTable({
    columns,
    data: subjects,
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
            title="Subjects"
            description="Master list of subjects taught across the school. Assign them to classes from the Classes page."
          />
          <ToolbarActions>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Subject
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={subjects.length}
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
                      placeholder="Search subjects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="ps-9 w-64"
                    />
                    {search && (
                      <Button
                        mode="icon"
                        variant="ghost"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearch('')}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <Badge variant="secondary" className="ms-2">
                    <BookOpen className="size-3 me-1" />
                    {subjects.length} subjects
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

      <SubjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subject={editing}
        onSaved={refresh}
      />

      <SubjectTeachersDialog
        open={Boolean(teachersTarget)}
        onOpenChange={(o) => !o && setTeachersTarget(null)}
        subject={teachersTarget}
        onChanged={refreshCounts}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete subject?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong> (
            {deleteTarget?.code}) will be removed and unmapped from all classes.
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
    </Fragment>
  );
}

function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  onSaved,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  subject?: Subject | null;
  onSaved(): void;
}) {
  const isEdit = Boolean(subject);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SubjectPayload>({
    code: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        code: subject?.code ?? '',
        name: subject?.name ?? '',
        description: subject?.description ?? '',
      });
    }
  }, [open, subject]);

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEdit && subject) {
        await subjectsApi.update(subject.id, form);
        toast.success(`${form.name} updated.`);
      } else {
        await subjectsApi.create(form);
        toast.success(`${form.name} created.`);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save subject.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subject' : 'New Subject'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input
              placeholder="e.g. ENG, MTH, BIO"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  code: e.target.value.toUpperCase(),
                }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Mathematics"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Short notes about the subject"
              rows={3}
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create subject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

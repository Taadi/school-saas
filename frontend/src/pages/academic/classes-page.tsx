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
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { CLASS_LEVELS, classesApi } from '@/services/academic';
import { ClassLevel, SchoolClass } from '@/types/school';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ClassFormDialog } from './components/class-form-dialog';
import { ClassManagerDialog } from './components/class-manager-dialog';

const LEVEL_COLOR: Record<ClassLevel, string> = {
  nursery: 'bg-pink-500/15 text-pink-700',
  primary: 'bg-amber-500/15 text-amber-700',
  junior_secondary: 'bg-sky-500/15 text-sky-700',
  senior_secondary: 'bg-violet-500/15 text-violet-700',
};

function firstName(full: string): string {
  const trimmed = full.trim().replace(/^(Mr|Mrs|Ms|Miss|Mx|Dr|Prof)\.?\s+/i, '');
  return trimmed.split(/\s+/)[0] ?? full;
}

export function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'order', desc: false },
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [managing, setManaging] = useState<SchoolClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);

  const refresh = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await classesApi.list();
        setClasses(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load classes.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await classesApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete class.',
      );
    }
  }

  const columns = useMemo<ColumnDef<SchoolClass>[]>(
    () => [
      {
        id: 'order',
        accessorFn: (r) => r.order,
        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.order}
          </span>
        ),
        size: 60,
      },
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Class" column={column} />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-foreground hover:text-primary"
            onClick={() => setManaging(row.original)}
          >
            {row.original.name}
          </button>
        ),
        size: 160,
      },
      {
        id: 'level',
        accessorFn: (r) => r.level,
        header: ({ column }) => (
          <DataGridColumnHeader title="Level" column={column} />
        ),
        cell: ({ row }) => {
          const lvl = row.original.level;
          const label =
            CLASS_LEVELS.find((l) => l.value === lvl)?.label ?? lvl;
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLOR[lvl]}`}
            >
              {label}
            </span>
          );
        },
        size: 160,
      },
      {
        id: 'arms',
        accessorFn: (r) => r.arms?.length ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Arms" column={column} />
        ),
        cell: ({ row }) => {
          const arms = row.original.arms ?? [];
          if (!arms.length) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {arms.slice(0, 4).map((a) => (
                <Badge
                  key={a.id}
                  variant="outline"
                  className="text-xs"
                  title={
                    a.class_teacher
                      ? `Form teacher: ${a.class_teacher.name}`
                      : 'No form teacher assigned'
                  }
                >
                  {a.name}
                  {a.class_teacher && (
                    <span className="ms-1 text-muted-foreground">
                      · {firstName(a.class_teacher.name)}
                    </span>
                  )}
                </Badge>
              ))}
              {arms.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{arms.length - 4}
                </Badge>
              )}
            </div>
          );
        },
        size: 280,
      },
      {
        id: 'form_teachers',
        accessorFn: (r) =>
          (r.arms ?? []).filter((a) => a.class_teacher_id).length,
        header: ({ column }) => (
          <DataGridColumnHeader title="Form Teachers" column={column} />
        ),
        cell: ({ row }) => {
          const arms = row.original.arms ?? [];
          const total = arms.length;
          const assigned = arms.filter((a) => a.class_teacher_id).length;
          if (total === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <span
              className={
                assigned === total
                  ? 'text-success font-medium'
                  : 'text-muted-foreground'
              }
            >
              {assigned}/{total}
            </span>
          );
        },
        size: 130,
      },
      {
        id: 'subjects_count',
        accessorFn: (r) => r.subjects_count ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Subjects" column={column} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <BookOpen className="size-3.5 text-muted-foreground" />
            {row.original.subjects_count ?? 0}
          </span>
        ),
        size: 110,
      },
      {
        id: 'enrollments_count',
        accessorFn: (r) => r.enrollments_count ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Students" column={column} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Users className="size-3.5 text-muted-foreground" />
            {row.original.enrollments_count ?? 0}
          </span>
        ),
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
              <DropdownMenuItem onClick={() => setManaging(row.original)}>
                <Settings2 className="size-4 me-2" />
                Manage arms & subjects
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4 me-2" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
    data: classes,
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
            title="Classes & Arms"
            description="Define classes (JSS1, SSS2…), arms (A, B, Gold…) and the subjects taught in each class."
          />
          <ToolbarActions>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Class
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={classes.length}
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
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">All classes</span>
                  <Badge variant="secondary" className="ms-2">
                    {classes.length} total
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

      <ClassFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schoolClass={editing}
        onSaved={refresh}
      />

      <ClassManagerDialog
        open={Boolean(managing)}
        onOpenChange={(o) => !o && setManaging(null)}
        schoolClass={managing}
        onChanged={refresh}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete class?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong> will
            be removed along with its arms and subject mappings. Students
            currently enrolled in this class will lose their class assignment.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

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
  CircleDollarSign,
  LoaderCircleIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { feeCategoriesApi, FeeCategoryPayload } from '@/services/fees';
import { FeeCategory } from '@/types/school';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export function FeeCategoriesPage() {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
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
  const [editing, setEditing] = useState<FeeCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeCategory | null>(null);

  const refresh = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await feeCategoriesApi.list({
          search: search || undefined,
        });
        setCategories(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : 'Could not load fee categories.',
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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await feeCategoriesApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete category.',
      );
    }
  }

  const columns = useMemo<ColumnDef<FeeCategory>[]>(
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
        size: 120,
      },
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Name" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
        ),
        size: 220,
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
        size: 320,
      },
      {
        id: 'status',
        accessorFn: (r) => (r.is_active ? 'active' : 'inactive'),
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success" appearance="light">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" appearance="light">
              Inactive
            </Badge>
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
              <DropdownMenuItem
                onClick={() => {
                  setEditing(row.original);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4 me-2" />
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
    data: categories,
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
            title="Fee Categories"
            description="Group every fee a parent might pay — School Fees, PTA, Uniform, Books, Exam Fees, and any custom levies."
          />
          <ToolbarActions>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <DataGrid
          table={table}
          recordCount={categories.length}
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
                      placeholder="Search categories…"
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
                    <CircleDollarSign className="size-3 me-1" />
                    {categories.length} categories
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

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSaved={refresh}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete fee category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong> (
            {deleteTarget?.code}) will be removed. Any structures or invoice
            items pointing at it will be removed as well.
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

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  category?: FeeCategory | null;
  onSaved(): void;
}) {
  const isEdit = Boolean(category);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FeeCategoryPayload>({
    code: '',
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        code: category?.code ?? '',
        name: category?.name ?? '',
        description: category?.description ?? '',
        is_active: category?.is_active ?? true,
      });
    }
  }, [open, category]);

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEdit && category) {
        await feeCategoriesApi.update(category.id, form);
        toast.success(`${form.name} updated.`);
      } else {
        await feeCategoriesApi.create(form);
        toast.success(`${form.name} created.`);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save category.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Fee Category' : 'New Fee Category'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input
              placeholder="e.g. TUITION, PTA, EXAM"
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
              placeholder="e.g. School Fees"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Short notes describing what this fee covers."
              rows={3}
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, is_active: Boolean(v) }))
              }
            />
            <Label>Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

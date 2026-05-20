import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  ExternalLink,
  KeyRound,
  LogIn,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { impersonation } from '@/auth/impersonation';
import {
  School,
  SchoolFilters,
  SUBSCRIPTION_BADGE,
  SubscriptionStatus,
  saasAdminApi,
} from '@/services/saas-admin';
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
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ANY = '__any__';

export function SchoolsListPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ANY);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: true },
  ]);

  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const filters: SchoolFilters = {
        search: search || undefined,
        status:
          statusFilter !== ANY
            ? (statusFilter as SubscriptionStatus)
            : undefined,
        per_page: pagination.pageSize,
        page: pagination.pageIndex + 1,
      };
      const res = await saasAdminApi.listSchools(filters);
      setSchools(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not load schools.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize]);

  function applyFilters() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    refresh();
  }

  function open(school: School) {
    impersonation.start({
      id: school.id,
      name: school.name,
      slug: school.slug,
    });
    navigate('/');
    window.location.reload();
  }

  async function setStatus(school: School, status: SubscriptionStatus) {
    try {
      await saasAdminApi.setStatus(school.id, status);
      toast.success(`${school.name} marked as ${status}.`);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not update status.',
      );
    }
  }

  async function destroy() {
    if (!deleteTarget) return;
    try {
      await saasAdminApi.deleteSchool(deleteTarget.id);
      toast.success(`${deleteTarget.name} archived.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete school.',
      );
    }
  }

  const columns = useMemo<ColumnDef<School>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (r) => r.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="School" column={column} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={`/admin/schools/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary truncate block"
            >
              {row.original.name}
            </Link>
            <div className="text-xs text-muted-foreground truncate font-mono">
              {row.original.slug}
            </div>
          </div>
        ),
        size: 240,
      },
      {
        id: 'email',
        accessorFn: (r) => r.email,
        header: ({ column }) => (
          <DataGridColumnHeader title="Contact" column={column} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.email}</div>
            <div className="text-xs text-muted-foreground truncate">
              {row.original.phone ?? '—'}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        id: 'status',
        accessorFn: (r) => r.subscription_status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const badge = SUBSCRIPTION_BADGE[row.original.subscription_status];
          return (
            <Badge variant="outline" className={`text-xs ${badge.className}`}>
              {badge.label}
            </Badge>
          );
        },
        size: 110,
      },
      {
        id: 'users',
        accessorFn: (r) => r.users_count ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Users" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.users_count ?? 0}
          </span>
        ),
        size: 80,
      },
      {
        id: 'students',
        accessorFn: (r) => r.students_count ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader title="Students" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.students_count ?? 0}
          </span>
        ),
        size: 100,
      },
      {
        id: 'created_at',
        accessorFn: (r) => r.created_at,
        header: ({ column }) => (
          <DataGridColumnHeader title="Joined" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
        size: 110,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original;
          const isActive = s.subscription_status === 'active';
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => open(s)}
                title="Open this school"
              >
                <LogIn className="size-3.5" />
                Open
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" mode="icon" size="sm">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/admin/schools/${s.id}`}>
                      <Settings2 className="size-4 me-2" />
                      Manage
                    </Link>
                  </DropdownMenuItem>
                  {isActive ? (
                    <DropdownMenuItem
                      onClick={() => setStatus(s, 'suspended')}
                    >
                      <PauseCircle className="size-4 me-2" />
                      Suspend
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setStatus(s, 'active')}>
                      <PlayCircle className="size-4 me-2" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="size-4 me-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 160,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    columns,
    data: schools,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Schools"
            description="Every school registered on your platform."
          />
          <ToolbarActions>
            <Button variant="outline" asChild>
              <a
                href={`${import.meta.env.VITE_APP_API_URL ?? '/api'}/schools/register`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Registration endpoint
              </a>
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
                      placeholder="Search name, slug, email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                      className="ps-9 w-64"
                    />
                    {search && (
                      <Button
                        mode="icon"
                        variant="ghost"
                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => {
                          setSearch('');
                          applyFilters();
                        }}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applyFilters}>
                    Apply
                  </Button>
                  <Badge variant="secondary" className="ms-2">
                    <Building2 className="size-3 me-1" />
                    {total} schools
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive school?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong>{' '}
            will be soft-deleted. Tenant data is preserved and can be restored
            from the database, but the school will no longer appear here or be
            accessible to its users.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={destroy}>
              <Trash2 className="size-4" />
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

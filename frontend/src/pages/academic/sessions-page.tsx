import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  LoaderCircleIcon,
  MoreVertical,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import {
  SessionPayload,
  TERM_LABELS,
  academicSessionsApi,
} from '@/services/academic';
import {
  AcademicSession,
  SessionStatus,
  Term,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_BADGE: Record<SessionStatus, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'bg-amber-500/15 text-amber-700' },
  active: { label: 'Active', color: 'bg-green-500/15 text-green-700' },
  completed: { label: 'Completed', color: 'bg-zinc-500/15 text-zinc-700' },
};

export function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSession | null>(null);

  const refresh = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await academicSessionsApi.list();
        setSessions(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load sessions.',
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

  async function setCurrent(session: AcademicSession) {
    try {
      await academicSessionsApi.setCurrent(session.id);
      toast.success(`${session.name} is now the active session.`);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not update session.',
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await academicSessionsApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete session.',
      );
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Academic Sessions"
            description="Define academic years (e.g. 2025/2026) and three Nigerian school terms per session."
          />
          <ToolbarActions>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Session
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No academic sessions yet. Create your first one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSetCurrent={() => setCurrent(session)}
                onEdit={() => {
                  setEditing(session);
                  setFormOpen(true);
                }}
                onDelete={() => setDeleteTarget(session)}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </Container>

      <SessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editing}
        onSaved={refresh}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete session?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.name}</strong>{' '}
            and its three terms will be removed.
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

/* -------------------------------------------------------------------------- */
/* Session card                                                               */
/* -------------------------------------------------------------------------- */

function SessionCard({
  session,
  onSetCurrent,
  onEdit,
  onDelete,
  onChanged,
}: {
  session: AcademicSession;
  onSetCurrent(): void;
  onEdit(): void;
  onDelete(): void;
  onChanged(): void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {session.name}
            </span>
            {session.is_current && (
              <Badge className="bg-primary/15 text-primary border-0">
                <Star className="size-3 me-1" />
                Current
              </Badge>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[session.status].color}`}
            >
              {STATUS_BADGE[session.status].label}
            </span>
          </div>
        </CardHeading>
        <CardToolbar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!session.is_current && (
                <DropdownMenuItem onClick={onSetCurrent}>
                  <CheckCircle2 className="size-4 me-2" />
                  Set as current
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4 me-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardToolbar>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          {session.start_date && session.end_date
            ? `${formatDate(session.start_date)} → ${formatDate(session.end_date)}`
            : 'No date range set'}
        </div>

        <div className="space-y-1.5">
          {(session.terms ?? []).map((term) => (
            <TermRow
              key={term.id}
              session={session}
              term={term}
              onChanged={onChanged}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TermRow({
  session,
  term,
  onChanged,
}: {
  session: AcademicSession;
  term: Term;
  onChanged(): void;
}) {
  async function setCurrentTerm() {
    try {
      await academicSessionsApi.updateTerm(session.id, term.id, {
        is_current: true,
      });
      toast.success(`${TERM_LABELS[term.name]} is now active.`);
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not update term.',
      );
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {TERM_LABELS[term.name]}
        </span>
        {term.is_current && (
          <Badge variant="secondary" className="text-xs">
            Active
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {term.start_date && term.end_date
            ? `${formatDate(term.start_date)} → ${formatDate(term.end_date)}`
            : '—'}
        </span>
        {!term.is_current && (
          <Button variant="ghost" size="sm" onClick={setCurrentTerm}>
            Set active
          </Button>
        )}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* -------------------------------------------------------------------------- */
/* Session form                                                               */
/* -------------------------------------------------------------------------- */

function SessionFormDialog({
  open,
  onOpenChange,
  session,
  onSaved,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  session?: AcademicSession | null;
  onSaved(): void;
}) {
  const isEdit = Boolean(session);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SessionPayload>({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    status: 'upcoming',
  });

  useEffect(() => {
    if (open) {
      const fallbackYear = new Date().getMonth() + 1 >= 9
        ? new Date().getFullYear()
        : new Date().getFullYear() - 1;
      setForm({
        name: session?.name ?? `${fallbackYear}/${fallbackYear + 1}`,
        start_date: session?.start_date ?? '',
        end_date: session?.end_date ?? '',
        is_current: session?.is_current ?? false,
        status: session?.status ?? 'upcoming',
      });
    }
  }, [open, session]);

  async function submit() {
    if (!/^\d{4}\/\d{4}$/.test(form.name)) {
      toast.error('Name must be in YYYY/YYYY format (e.g. 2025/2026).');
      return;
    }
    try {
      setSubmitting(true);
      const payload: SessionPayload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (isEdit && session) {
        await academicSessionsApi.update(session.id, payload);
        toast.success(`${form.name} updated.`);
      } else {
        await academicSessionsApi.create(payload);
        toast.success(`${form.name} created with three terms.`);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save session.',
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
            {isEdit ? 'Edit Session' : 'New Academic Session'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Session</Label>
            <Input
              placeholder="2025/2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as SessionStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              Three empty terms (First, Second, Third) will be created
              automatically.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

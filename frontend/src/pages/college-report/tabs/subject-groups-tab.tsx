import { Fragment, useMemo, useState } from 'react';
import {
  Layers,
  LoaderCircleIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import { SubjectGroup } from '@/types/school';
import { ReportConfigBundle } from '../use-report-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface GroupForm {
  id?: number;
  name: string;
  description: string;
  sort_order: number;
  subject_ids: number[];
}

const EMPTY: GroupForm = {
  name: '',
  description: '',
  sort_order: 0,
  subject_ids: [],
};

/**
 * Tab 10 — Subject groupings. Used by the report card to lay subjects out by
 * area (Core, Sciences, Arts…) instead of one flat list.
 */
export function SubjectGroupsTab({ config }: { config: ReportConfigBundle }) {
  const { groups, subjects } = config;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GroupForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const subjectIndex = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  function startCreate() {
    setEditing({ ...EMPTY });
    setOpen(true);
  }

  function startEdit(g: SubjectGroup) {
    setEditing({
      id: g.id,
      name: g.name,
      description: g.description ?? '',
      sort_order: g.sort_order,
      subject_ids: (g.subjects ?? []).map((s) => s.id),
    });
    setOpen(true);
  }

  async function save() {
    if (!editing.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        sort_order: editing.sort_order,
        subject_ids: editing.subject_ids,
      };
      if (editing.id) {
        await collegeReportApi.updateGroup(editing.id, payload);
        toast.success('Group updated.');
      } else {
        await collegeReportApi.createGroup(payload);
        toast.success('Group created.');
      }
      setOpen(false);
      await config.refreshSection('groups');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(g: SubjectGroup) {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      setBusyId(g.id);
      await collegeReportApi.deleteGroup(g.id);
      toast.success('Group deleted.');
      await config.refreshSection('groups');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Fragment>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Groupings only affect report-card layout — they don't change what a
          class teaches (manage that under Classes & Arms).
        </p>
        <Button onClick={startCreate}>
          <Plus className="size-4" />
          New group
        </Button>
      </div>

      <div className="grid gap-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  {g.name}
                  <Badge variant="secondary" appearance="light" size="sm">
                    {g.subjects?.length ?? 0} subjects
                  </Badge>
                </span>
                {g.description && (
                  <span className="text-xs text-muted-foreground ms-3">
                    {g.description}
                  </span>
                )}
              </CardHeading>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(g)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === g.id}
                  onClick={() => remove(g)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {(g.subjects ?? []).map((s) => (
                  <Badge key={s.id} variant="outline" size="sm">
                    {s.code} · {s.name}
                  </Badge>
                ))}
                {(g.subjects ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No subjects yet.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-sm text-muted-foreground">
              No groupings yet.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? 'Edit group' : 'New group'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Sciences"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    sort_order: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Subjects</Label>
              <div className="border rounded-md p-3 max-h-72 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {subjects.map((s) => {
                  const checked = editing.subject_ids.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v) {
                            setEditing({
                              ...editing,
                              subject_ids: [...editing.subject_ids, s.id],
                            });
                          } else {
                            setEditing({
                              ...editing,
                              subject_ids: editing.subject_ids.filter(
                                (id) => id !== s.id,
                              ),
                            });
                          }
                        }}
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.code}
                      </span>
                      <span>{s.name}</span>
                    </label>
                  );
                })}
                {subjects.length === 0 && (
                  <span className="text-xs text-muted-foreground col-span-2">
                    No subjects yet — add some under <strong>Subjects</strong>.
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editing.subject_ids.length} selected. Used by{' '}
                {subjectIndex[editing.subject_ids[0]]?.name ? '' : ''}
                report card layout.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
              <Save className="size-4" />
              Save group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

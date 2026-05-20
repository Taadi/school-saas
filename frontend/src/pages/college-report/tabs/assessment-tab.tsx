import { Fragment, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  LoaderCircleIcon,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import { TERM_LABELS } from '@/services/academic';
import { AssessmentComponent, AssessmentScheme } from '@/types/school';
import { ReportConfigBundle } from '../use-report-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface SchemeForm {
  id?: number;
  name: string;
  description: string;
  academic_session_id: number | null;
  term_id: number | null;
  grading_scale_id: number | null;
  is_default: boolean;
  is_active: boolean;
  components: AssessmentComponent[];
}

const NEW_COMPONENT = (i: number): AssessmentComponent => ({
  code: `c${i + 1}`,
  label: `Component ${i + 1}`,
  max_score: 10,
  weight: 1,
  is_exam: false,
});

const STARTER_FORM: SchemeForm = {
  name: '',
  description: '',
  academic_session_id: null,
  term_id: null,
  grading_scale_id: null,
  is_default: false,
  is_active: true,
  components: [
    { code: 'ca', label: 'CA', max_score: 30, weight: 1, is_exam: false },
    { code: 'exam', label: 'Exam', max_score: 70, weight: 1, is_exam: true },
  ],
};

/**
 * Tab 3 — Assessment.
 *
 * The defining tab of this whole module: each scheme's components decide
 * what columns Score Entry shows, what their maxima are, and how scores
 * combine into the final total. Schools can have a session-wide default
 * plus per-term overrides; pickers reuse existing Academic Sessions/Terms.
 */
export function AssessmentTab({ config }: { config: ReportConfigBundle }) {
  const { schemes, scales, sessions } = config;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchemeForm>(STARTER_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const sessionTerms = useMemo(
    () =>
      sessions
        .find((s) => s.id === editing.academic_session_id)
        ?.terms ?? [],
    [sessions, editing.academic_session_id],
  );

  function startCreate() {
    setEditing({ ...STARTER_FORM, components: STARTER_FORM.components.map((c) => ({ ...c })) });
    setOpen(true);
  }

  function startEdit(s: AssessmentScheme) {
    setEditing({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      academic_session_id: s.academic_session_id,
      term_id: s.term_id,
      grading_scale_id: s.grading_scale_id,
      is_default: s.is_default,
      is_active: s.is_active,
      components: (s.components ?? []).map((c) => ({ ...c })),
    });
    setOpen(true);
  }

  function addComponent() {
    setEditing({
      ...editing,
      components: [
        ...editing.components,
        NEW_COMPONENT(editing.components.length),
      ],
    });
  }

  function updateComponent(idx: number, patch: Partial<AssessmentComponent>) {
    const components = [...editing.components];
    components[idx] = { ...components[idx], ...patch };
    setEditing({ ...editing, components });
  }

  function removeComponent(idx: number) {
    setEditing({
      ...editing,
      components: editing.components.filter((_, i) => i !== idx),
    });
  }

  async function save() {
    if (!editing.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (editing.components.length === 0) {
      toast.error('Add at least one component.');
      return;
    }
    const codes = editing.components.map((c) => c.code.trim());
    if (codes.some((c) => !c.match(/^[a-z0-9_]+$/))) {
      toast.error('Component codes must be lowercase letters, digits or underscore.');
      return;
    }
    if (new Set(codes).size !== codes.length) {
      toast.error('Component codes must be unique within a scheme.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        academic_session_id: editing.academic_session_id,
        term_id: editing.term_id,
        grading_scale_id: editing.grading_scale_id,
        is_default: editing.is_default,
        is_active: editing.is_active,
        components: editing.components.map((c) => ({
          code: c.code.trim(),
          label: c.label.trim(),
          max_score: Number(c.max_score),
          weight: Number(c.weight) || 1,
          is_exam: !!c.is_exam,
        })),
      };
      if (editing.id) {
        await collegeReportApi.updateScheme(editing.id, payload);
        toast.success('Assessment scheme updated.');
      } else {
        await collegeReportApi.createScheme(payload);
        toast.success('Assessment scheme created.');
      }
      setOpen(false);
      await config.refreshSection('schemes');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save scheme.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: AssessmentScheme) {
    if (s.is_default) {
      toast.error('Set another scheme as default first.');
      return;
    }
    if (!confirm(`Delete scheme "${s.name}"? Existing results stay intact.`)) {
      return;
    }
    try {
      setBusyId(s.id);
      await collegeReportApi.deleteScheme(s.id);
      toast.success('Scheme deleted.');
      await config.refreshSection('schemes');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete scheme.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setDefault(s: AssessmentScheme) {
    if (s.is_default) return;
    try {
      setBusyId(s.id);
      await collegeReportApi.setDefaultScheme(s.id);
      toast.success(`"${s.name}" is now the default scheme.`);
      await config.refreshSection('schemes');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not set default.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Fragment>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Components defined here become Score-Entry columns. Schools can mix
          any number of CAs, projects or quizzes — total scores must add up to
          the scheme's max (usually 100).
        </p>
        <Button onClick={startCreate}>
          <Plus className="size-4" />
          New scheme
        </Button>
      </div>

      <div className="grid gap-4">
        {schemes.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-sm text-muted-foreground">
              No assessment schemes yet — create one before entering scores.
            </CardContent>
          </Card>
        )}
        {schemes.map((s) => {
          const totalDefined = s.components.reduce(
            (sum, c) => sum + Number(c.max_score),
            0,
          );
          const componentsLabel = s.components
            .map((c) => `${c.label} (${c.max_score})`)
            .join(' · ');
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardHeading>
                  <span className="font-medium flex items-center gap-2">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    {s.name}
                    {s.is_default && (
                      <Badge variant="primary" appearance="light" size="sm">
                        <Star className="size-3 me-1" />
                        Default
                      </Badge>
                    )}
                    {!s.is_active && (
                      <Badge variant="secondary" appearance="light" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground ms-3">
                    {scopeLabel(s, sessions)}
                  </span>
                </CardHeading>
                <div className="flex items-center gap-1">
                  {!s.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === s.id}
                      onClick={() => setDefault(s)}
                    >
                      <Star className="size-3.5" />
                      Set default
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === s.id || s.is_default}
                    onClick={() => remove(s)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="text-xs text-muted-foreground mb-2">
                  {componentsLabel || '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Total max: <strong>{totalDefined}</strong>
                  </span>
                  {Math.abs(totalDefined - 100) > 0.01 && (
                    <span className="text-amber-600 inline-flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Components sum to {totalDefined}, not 100.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? 'Edit assessment scheme' : 'New assessment scheme'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Standard CA + Exam"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Academic session (scope)</Label>
                <Select
                  value={editing.academic_session_id ? String(editing.academic_session_id) : 'all'}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      academic_session_id: v === 'all' ? null : Number(v),
                      term_id: null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sessions" />
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
              </div>
              <div className="grid gap-1.5">
                <Label>Term (optional override)</Label>
                <Select
                  value={editing.term_id ? String(editing.term_id) : 'all'}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      term_id: v === 'all' ? null : Number(v),
                    })
                  }
                  disabled={!editing.academic_session_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All terms in session</SelectItem>
                    {sessionTerms.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {TERM_LABELS[t.name]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Grading scale</Label>
                <Select
                  value={
                    editing.grading_scale_id ? String(editing.grading_scale_id) : 'default'
                  }
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      grading_scale_id: v === 'default' ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use tenant default</SelectItem>
                    {scales.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Default scheme</Label>
                <p className="text-xs text-muted-foreground">
                  Used by Score Entry when no per-term/session match exists.
                </p>
              </div>
              <Switch
                checked={editing.is_default}
                onCheckedChange={(v) => setEditing({ ...editing, is_default: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive schemes are hidden from Score Entry but kept for
                  historical results.
                </p>
              </div>
              <Switch
                checked={editing.is_active}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label>Components</Label>
                  <p className="text-xs text-muted-foreground">
                    Each component becomes a Score-Entry column.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addComponent}>
                  <Plus className="size-3.5" />
                  Add component
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-start px-2 py-2 font-medium w-32">Code</th>
                      <th className="text-start px-2 py-2 font-medium">Label</th>
                      <th className="text-start px-2 py-2 font-medium w-24">Max</th>
                      <th className="text-start px-2 py-2 font-medium w-24">Weight</th>
                      <th className="text-start px-2 py-2 font-medium w-20">Exam?</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {editing.components.map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1">
                          <Input
                            value={c.code}
                            onChange={(e) =>
                              updateComponent(idx, { code: e.target.value.toLowerCase() })
                            }
                            placeholder="ca1"
                            className="h-9 font-mono"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            value={c.label}
                            onChange={(e) => updateComponent(idx, { label: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            value={c.max_score}
                            onChange={(e) =>
                              updateComponent(idx, { max_score: Number(e.target.value) })
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={c.weight}
                            onChange={(e) =>
                              updateComponent(idx, { weight: Number(e.target.value) })
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Switch
                            checked={c.is_exam}
                            onCheckedChange={(v) => updateComponent(idx, { is_exam: v })}
                          />
                        </td>
                        <td className="px-1 py-1 text-end">
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => removeComponent(idx)}
                            title="Remove component"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SchemeTotalsHint components={editing.components} />
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
              Save scheme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function scopeLabel(
  s: AssessmentScheme,
  sessions: ReportConfigBundle['sessions'],
): string {
  if (s.term_id) {
    const session = sessions.find((x) => x.id === s.academic_session_id);
    const term = session?.terms?.find((t) => t.id === s.term_id);
    if (term && session) {
      return `${session.name} · ${TERM_LABELS[term.name]}`;
    }
    return 'Term-specific';
  }
  if (s.academic_session_id) {
    const session = sessions.find((x) => x.id === s.academic_session_id);
    return session ? `${session.name} (whole session)` : 'Session-specific';
  }
  return 'Tenant-wide';
}

function SchemeTotalsHint({ components }: { components: AssessmentComponent[] }) {
  const total = components.reduce((sum, c) => sum + Number(c.max_score || 0), 0);
  const ok = Math.abs(total - 100) < 0.01;
  return (
    <p className={`text-xs mt-2 ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
      Sum of component max scores: <strong>{total}</strong>
      {ok ? ' — balanced ✓' : ' (most schools target 100).'}
    </p>
  );
}

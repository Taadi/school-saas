import { Fragment, useMemo, useState } from 'react';
import {
  Award,
  Check,
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
import { GradingBand, GradingScale } from '@/types/school';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const BLANK_BAND: GradingBand = {
  min_score: 0,
  max_score: 0,
  grade: '',
  grade_point: 0,
  remark: '',
};

interface ScaleForm {
  id?: number;
  name: string;
  description: string;
  is_default: boolean;
  bands: GradingBand[];
}

const EMPTY_FORM: ScaleForm = {
  name: '',
  description: '',
  is_default: false,
  bands: [
    { ...BLANK_BAND, min_score: 70, max_score: 100, grade: 'A', grade_point: 5, remark: 'Excellent' },
    { ...BLANK_BAND, min_score: 60, max_score: 69, grade: 'B', grade_point: 4, remark: 'Very Good' },
    { ...BLANK_BAND, min_score: 50, max_score: 59, grade: 'C', grade_point: 3, remark: 'Good' },
    { ...BLANK_BAND, min_score: 40, max_score: 49, grade: 'D', grade_point: 2, remark: 'Pass' },
    { ...BLANK_BAND, min_score: 0, max_score: 39, grade: 'F', grade_point: 0, remark: 'Fail' },
  ],
};

/**
 * Tab 2 — Grading System.
 *
 * Schools can define multiple scales (e.g. Junior vs. Senior) and pick which
 * one is the default. Bands are inclusive ranges with grade letter, point and
 * remark. Used by the report card legend and to auto-grade results.
 */
export function GradingTab({ config }: { config: ReportConfigBundle }) {
  const { scales } = config;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScaleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  function startCreate() {
    setEditing({ ...EMPTY_FORM, bands: EMPTY_FORM.bands.map((b) => ({ ...b })) });
    setOpen(true);
  }

  function startEdit(s: GradingScale) {
    setEditing({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      is_default: s.is_default,
      bands: (s.bands ?? []).map((b) => ({ ...b })),
    });
    setOpen(true);
  }

  async function save() {
    if (!editing.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (editing.bands.length === 0) {
      toast.error('Add at least one grade band.');
      return;
    }
    for (const b of editing.bands) {
      if (b.max_score < b.min_score) {
        toast.error(`Band ${b.grade || '?'} max must be ≥ min.`);
        return;
      }
      if (!b.grade.trim()) {
        toast.error('Every band needs a grade letter.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        is_default: editing.is_default,
        bands: editing.bands.map((b) => ({
          min_score: Number(b.min_score),
          max_score: Number(b.max_score),
          grade: b.grade.trim(),
          grade_point: b.grade_point ?? null,
          remark: b.remark?.trim() || null,
        })),
      };
      if (editing.id) {
        await collegeReportApi.updateScale(editing.id, payload);
        toast.success('Grading scale updated.');
      } else {
        await collegeReportApi.createScale(payload);
        toast.success('Grading scale created.');
      }
      setOpen(false);
      await config.refreshSection('scales');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save scale.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: GradingScale) {
    if (s.is_default) {
      toast.error('Mark another scale as default first.');
      return;
    }
    if (!confirm(`Delete grading scale "${s.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      setBusyId(s.id);
      await collegeReportApi.deleteScale(s.id);
      toast.success('Scale deleted.');
      await config.refreshSection('scales');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete scale.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setDefault(s: GradingScale) {
    if (s.is_default) return;
    try {
      setBusyId(s.id);
      await collegeReportApi.setDefaultScale(s.id);
      toast.success(`"${s.name}" is now the default scale.`);
      await config.refreshSection('scales');
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
          Define grade boundaries, points and remarks. The default scale grades
          new results across the school.
        </p>
        <Button onClick={startCreate}>
          <Plus className="size-4" />
          New scale
        </Button>
      </div>

      <div className="grid gap-4">
        {scales.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-sm text-muted-foreground">
              No grading scales yet — create one to start grading results.
            </CardContent>
          </Card>
        )}
        {scales.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <Award className="size-4 text-muted-foreground" />
                  {s.name}
                  {s.is_default && (
                    <Badge variant="primary" appearance="light" size="sm">
                      <Star className="size-3 me-1" />
                      Default
                    </Badge>
                  )}
                </span>
                {s.description && (
                  <span className="text-xs text-muted-foreground ms-3">
                    {s.description}
                  </span>
                )}
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
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground bg-muted/40">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">Range</th>
                    <th className="text-start px-3 py-2 font-medium">Grade</th>
                    <th className="text-start px-3 py-2 font-medium">Point</th>
                    <th className="text-start px-3 py-2 font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {(s.bands ?? []).map((b) => (
                    <tr key={b.id ?? `${b.min_score}-${b.grade}`} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">
                        {b.min_score} – {b.max_score}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{b.grade}</Badge>
                      </td>
                      <td className="px-3 py-2">{b.grade_point ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {b.remark ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? 'Edit grading scale' : 'New grading scale'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Senior Secondary Scale"
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
                placeholder="Optional context for school admins."
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Use as default</Label>
                <p className="text-xs text-muted-foreground">
                  New schemes adopt the default automatically.
                </p>
              </div>
              <Switch
                checked={editing.is_default}
                onCheckedChange={(v) => setEditing({ ...editing, is_default: v })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Grade bands</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      bands: [...editing.bands, { ...BLANK_BAND }],
                    })
                  }
                >
                  <Plus className="size-3.5" />
                  Add band
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-start px-2 py-2 font-medium w-24">Min</th>
                      <th className="text-start px-2 py-2 font-medium w-24">Max</th>
                      <th className="text-start px-2 py-2 font-medium w-20">Grade</th>
                      <th className="text-start px-2 py-2 font-medium w-20">Point</th>
                      <th className="text-start px-2 py-2 font-medium">Remark</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {editing.bands.map((b, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            value={b.min_score}
                            onChange={(e) => {
                              const bands = [...editing.bands];
                              bands[idx] = { ...b, min_score: Number(e.target.value) };
                              setEditing({ ...editing, bands });
                            }}
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            value={b.max_score}
                            onChange={(e) => {
                              const bands = [...editing.bands];
                              bands[idx] = { ...b, max_score: Number(e.target.value) };
                              setEditing({ ...editing, bands });
                            }}
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            value={b.grade}
                            onChange={(e) => {
                              const bands = [...editing.bands];
                              bands[idx] = { ...b, grade: e.target.value };
                              setEditing({ ...editing, bands });
                            }}
                            className="h-9 uppercase"
                            maxLength={4}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            step="0.5"
                            value={b.grade_point ?? ''}
                            onChange={(e) => {
                              const bands = [...editing.bands];
                              bands[idx] = {
                                ...b,
                                grade_point:
                                  e.target.value === '' ? null : Number(e.target.value),
                              };
                              setEditing({ ...editing, bands });
                            }}
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            value={b.remark ?? ''}
                            onChange={(e) => {
                              const bands = [...editing.bands];
                              bands[idx] = { ...b, remark: e.target.value };
                              setEditing({ ...editing, bands });
                            }}
                            className="h-9"
                          />
                        </td>
                        <td className="px-1 py-1 text-end">
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() =>
                              setEditing({
                                ...editing,
                                bands: editing.bands.filter((_, i) => i !== idx),
                              })
                            }
                            title="Remove band"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <BandsCoverageHint bands={editing.bands} />
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
              Save scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

/**
 * Quick sanity hint: warns admins about gaps or overlaps in the bands so the
 * grading function never lands a total in a "no band" zone.
 */
function BandsCoverageHint({ bands }: { bands: GradingBand[] }) {
  const sorted = useMemo(
    () => [...bands].sort((a, b) => a.min_score - b.min_score),
    [bands],
  );

  if (sorted.length < 2) return null;

  const issues: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.min_score > prev.max_score + 0.01) {
      issues.push(`Gap between ${prev.max_score} and ${cur.min_score}`);
    } else if (cur.min_score <= prev.max_score) {
      issues.push(`Overlap at ${cur.min_score}`);
    }
  }

  if (issues.length === 0) {
    return (
      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
        <Check className="size-3" /> Bands cover 0–100 with no gaps.
      </p>
    );
  }
  return (
    <p className="text-xs text-amber-600 mt-2">
      {issues.join(' · ')}. Adjust before saving for predictable grading.
    </p>
  );
}

import { Fragment, useEffect, useState } from 'react';
import { LoaderCircleIcon, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { evaluationsApi, EvaluationItemPayload } from '@/services/evaluations';
import { EvaluationRubric } from '@/types/school';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ITEM_TYPES = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'scale_1_10', label: 'Scale 1–10' },
  { value: 'scale_1_5', label: 'Scale 1–5' },
  { value: 'text', label: 'Free text' },
] as const;

export function EvaluationRubricsPage() {
  const [rubrics, setRubrics] = useState<EvaluationRubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EvaluationRubric | null>(null);
  const [items, setItems] = useState<EvaluationItemPayload[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      setLoading(true);
      const r = await evaluationsApi.listRubrics();
      setRubrics(r.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load rubrics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setEditing({
      id: 0,
      name: '',
      cadence: 'weekly',
      scope: 'per_student',
      target_role: 'form_teacher',
      is_active: true,
      is_default: false,
    });
    setItems([
      { code: 'homework_done', label: 'All assignments completed?', type: 'yes_no', weight: 2 },
      { code: 'conduct', label: 'Conduct', type: 'scale_1_10', weight: 1 },
    ]);
  }

  function editRubric(r: EvaluationRubric) {
    setEditing(r);
    setItems(
      (r.items ?? []).map((i) => ({
        code: i.code,
        label: i.label,
        type: i.type,
        weight: i.weight,
        choices: i.choices,
      })),
    );
  }

  async function save() {
    if (!editing?.name.trim()) {
      toast.error('Rubric name is required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: editing.name,
        description: editing.description,
        cadence: editing.cadence,
        is_active: editing.is_active,
        is_default: editing.is_default,
        items,
      };
      if (editing.id) {
        await evaluationsApi.updateRubric(editing.id, payload);
        toast.success('Rubric updated.');
      } else {
        await evaluationsApi.createRubric(payload);
        toast.success('Rubric created.');
      }
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save rubric.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Evaluation Rubrics"
            description="Define weekly behaviour and homework checklists. Form teachers use these in Weekly Evaluation Entry."
          />
          <ToolbarActions>
            <Button onClick={startNew}>
              <Plus className="size-4" />
              New rubric
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardHeading>Rubrics</CardHeading>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
            ) : (
              rubrics.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-start rounded-md border px-3 py-2 hover:bg-muted/50"
                  onClick={() => editRubric(r)}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.cadence} • {(r.items ?? []).length} question(s)
                    {r.is_default ? ' • default' : ''}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {editing && (
          <Card>
            <CardHeader>
              <CardHeading>{editing.id ? 'Edit rubric' : 'New rubric'}</CardHeading>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Questions</Label>
                {items.map((item, idx) => (
                  <div key={idx} className="grid gap-2 rounded-md border p-3">
                    <Input
                      placeholder="Code (e.g. homework_done)"
                      value={item.code}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...item, code: e.target.value };
                        setItems(next);
                      }}
                    />
                    <Input
                      placeholder="Label"
                      value={item.label}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...item, label: e.target.value };
                        setItems(next);
                      }}
                    />
                    <Select
                      value={item.type}
                      onValueChange={(v) => {
                        const next = [...items];
                        next[idx] = { ...item, type: v as EvaluationItemPayload['type'] };
                        setItems(next);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItems([
                      ...items,
                      { code: `q${items.length + 1}`, label: 'New question', type: 'scale_1_10' },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add question
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
                  <Save className="size-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </Container>
    </Fragment>
  );
}

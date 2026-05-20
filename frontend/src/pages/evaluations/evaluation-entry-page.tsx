import { Fragment, useEffect, useState } from 'react';
import { LoaderCircleIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { academicSessionsApi, classesApi } from '@/services/academic';
import { evaluationsApi } from '@/services/evaluations';
import {
  AcademicSession,
  Arm,
  EvaluationItem,
  EvaluationPeriod,
  EvaluationRubric,
  EvaluationSheetRow,
  SchoolClass,
} from '@/types/school';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function EvaluationEntryPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rubrics, setRubrics] = useState<EvaluationRubric[]>([]);
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [rows, setRows] = useState<EvaluationSheetRow[]>([]);

  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [rubricId, setRubricId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [classId, setClassId] = useState('');
  const [armId, setArmId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const arms: Arm[] = classes.find((c) => String(c.id) === classId)?.arms ?? [];
  const sessionTerms =
    sessions.find((s) => String(s.id) === sessionId)?.terms ?? [];

  useEffect(() => {
    Promise.all([academicSessionsApi.list(), classesApi.list(true), evaluationsApi.listRubrics()])
      .then(([s, c, r]) => {
        setSessions(s.data);
        setClasses(c.data);
        setRubrics(r.data.filter((x) => x.is_active));
        const cur = s.data.find((x) => x.is_current);
        if (cur) {
          setSessionId(String(cur.id));
          const t = cur.terms?.find((t) => t.is_current) ?? cur.terms?.[0];
          if (t) setTermId(String(t.id));
        }
        const def = r.data.find((x) => x.is_default) ?? r.data[0];
        if (def) setRubricId(String(def.id));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!rubricId || !termId) {
      setPeriods([]);
      return;
    }
    evaluationsApi
      .listPeriods(Number(rubricId), Number(termId))
      .then((r) => setPeriods(r.data))
      .catch(() => setPeriods([]));
  }, [rubricId, termId]);

  async function loadSheet() {
    if (!periodId || !classId) return;
    try {
      setLoading(true);
      const r = await evaluationsApi.sheet({
        period_id: Number(periodId),
        school_class_id: Number(classId),
        arm_id: armId ? Number(armId) : null,
      });
      setRows(r.data);
      setItems(r.context.rubric.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load sheet.');
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(studentId: number, code: string, value: string | boolean) {
    setRows((prev) =>
      prev.map((row) =>
        row.student_id === studentId
          ? { ...row, answers: { ...row.answers, [code]: value } }
          : row,
      ),
    );
  }

  async function save() {
    if (!periodId || !classId) return;
    try {
      setSaving(true);
      const r = await evaluationsApi.bulkUpsert({
        period_id: Number(periodId),
        school_class_id: Number(classId),
        arm_id: armId ? Number(armId) : null,
        rows: rows.map((row) => ({
          student_id: row.student_id,
          answers: row.answers,
        })),
      });
      toast.success(r.message);
      loadSheet();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function generateWeeks() {
    if (!rubricId || !termId) return;
    try {
      const r = await evaluationsApi.generatePeriods(
        Number(rubricId),
        Number(termId),
        12,
      );
      toast.success(r.message);
      const p = await evaluationsApi.listPeriods(Number(rubricId), Number(termId));
      setPeriods(p.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not generate weeks.');
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Weekly Evaluation Entry"
            description="Form-teacher rubrics: homework, conduct, punctuality and more. Scores are calculated automatically from your answers."
          />
        </Toolbar>
      </Container>

      <Container>
        <Card className="mb-4">
          <CardContent className="pt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Session</Label>
              <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setTermId(''); }}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Term</Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  {sessionTerms.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Rubric</Label>
              <Select value={rubricId} onValueChange={setRubricId}>
                <SelectTrigger><SelectValue placeholder="Rubric" /></SelectTrigger>
                <SelectContent>
                  {rubrics.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Week / period</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Arm</Label>
              <Select value={armId || 'all'} onValueChange={(v) => setArmId(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Arm" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {arms.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={generateWeeks} disabled={!rubricId || !termId}>
                Generate weeks
              </Button>
              <Button onClick={loadSheet} disabled={loading || !periodId || !classId}>
                {loading && <LoaderCircleIcon className="size-4 animate-spin" />}
                Load
              </Button>
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardHeading>Students</CardHeading>
              <Button onClick={save} disabled={saving}>
                {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
                <Save className="size-4" />
                Save all
              </Button>
            </CardHeader>
            <CardTable>
              <ScrollArea>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start p-2">Student</th>
                      {items.map((i) => (
                        <th key={i.code} className="text-start p-2 min-w-[120px]">{i.label}</th>
                      ))}
                      <th className="text-start p-2">Score %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.student_id} className="border-b">
                        <td className="p-2">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.admission_number}</div>
                        </td>
                        {items.map((item) => (
                          <td key={item.code} className="p-2">
                            <ItemInput
                              item={item}
                              value={row.answers[item.code]}
                              onChange={(v) => updateAnswer(row.student_id, item.code, v)}
                            />
                          </td>
                        ))}
                        <td className="p-2 font-medium">
                          {row.overall_score != null ? `${row.overall_score}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
          </Card>
        )}
      </Container>
    </Fragment>
  );
}

function ItemInput({
  item,
  value,
  onChange,
}: {
  item: EvaluationItem;
  value: string | number | boolean | null | undefined;
  onChange(v: string | boolean): void;
}) {
  if (item.type === 'yes_no') {
    return (
      <Checkbox
        checked={value === 1 || value === true || value === '1'}
        onCheckedChange={(c) => onChange(Boolean(c))}
      />
    );
  }
  if (item.type === 'scale_1_10' || item.type === 'scale_1_5') {
    const max = item.type === 'scale_1_10' ? 10 : 5;
    return (
      <Input
        type="number"
        min={0}
        max={max}
        className="w-20"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input
      className="min-w-[100px]"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

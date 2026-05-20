import { Fragment, useEffect, useMemo, useState } from 'react';
import { LoaderCircleIcon, RotateCcw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { academicSessionsApi, classesApi, TERM_LABELS } from '@/services/academic';
import { subTermsApi } from '@/services/sub-terms';
import {
  RESULT_STATUS_COLOR,
  RESULT_STATUS_LABEL,
  resultsApi,
} from '@/services/results';
import {
  AcademicSession,
  Arm,
  AssessmentSchemeSummary,
  ResultRow,
  SchoolClass,
  ScoreMap,
  Subject,
  SubTerm,
  Term,
} from '@/types/school';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTable,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ScoreEntryPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [sessionId, setSessionId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [armId, setArmId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  /** `term` = end-of-term; otherwise sub-term id */
  const [periodKey, setPeriodKey] = useState<string>('term');
  const [subTerms, setSubTerms] = useState<SubTerm[]>([]);

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [scheme, setScheme] = useState<AssessmentSchemeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([academicSessionsApi.list(), classesApi.list(true)])
      .then(([sRes, cRes]) => {
        setSessions(sRes.data);
        setClasses(cRes.data);
        const current = sRes.data.find((s) => s.is_current) ?? sRes.data[0];
        if (current) {
          setSessionId(String(current.id));
          const t =
            current.terms?.find((t) => t.is_current) ?? current.terms?.[0];
          if (t) setTermId(String(t.id));
        }
      })
      .catch(() => toast.error('Could not load sessions or classes.'));
  }, []);

  useEffect(() => {
    if (!classId) {
      setArms([]);
      setSubjects([]);
      setArmId('');
      setSubjectId('');
      return;
    }
    const cls = classes.find((c) => String(c.id) === classId);
    setArms(cls?.arms ?? []);
    classesApi
      .subjects(Number(classId))
      .then((r) => setSubjects(r.data))
      .catch(() => setSubjects([]));
  }, [classId, classes]);

  const sessionTerms = useMemo<Term[]>(() => {
    return sessions.find((s) => String(s.id) === sessionId)?.terms ?? [];
  }, [sessions, sessionId]);

  const subTermId = periodKey === 'term' ? null : Number(periodKey);

  useEffect(() => {
    if (!termId) {
      setSubTerms([]);
      setPeriodKey('term');
      return;
    }
    subTermsApi
      .list(Number(termId))
      .then((r) => setSubTerms(r.data.filter((s) => s.is_active)))
      .catch(() => setSubTerms([]));
  }, [termId]);

  const canLoad = Boolean(classId && subjectId && termId);

  async function loadSheet() {
    if (!canLoad) return;
    try {
      setLoading(true);
      const r = await resultsApi.scoreSheet({
        school_class_id: Number(classId),
        arm_id: armId ? Number(armId) : null,
        subject_id: Number(subjectId),
        term_id: Number(termId),
        sub_term_id: subTermId,
      });
      setRows(r.data);
      setScheme(r.context.scheme);
      if (r.data.length === 0) {
        toast.message('No students found for this class/arm.');
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not load score sheet.',
      );
    } finally {
      setLoading(false);
    }
  }

  function recomputeRow(row: ResultRow, schemeSnapshot: AssessmentSchemeSummary): ResultRow {
    const total = schemeSnapshot.components.reduce((sum, c) => {
      const v = row.scores?.[c.code];
      if (v === null || v === undefined) return sum;
      return sum + Number(v) * (c.weight || 1);
    }, 0);
    return {
      ...row,
      total: Math.round(total * 100) / 100,
      grade: localGrade(total),
    };
  }

  function updateScore(studentId: number, code: string, raw: string, max: number) {
    if (!scheme) return;
    setRows((prev) =>
      prev.map((row) => {
        if (row.student_id !== studentId) return row;
        const value = raw === '' ? null : clamp(Number(raw), 0, max);
        const next: ResultRow = {
          ...row,
          scores: { ...(row.scores ?? {}), [code]: value },
        };
        return recomputeRow(next, scheme);
      }),
    );
  }

  async function save() {
    if (!scheme) return;
    try {
      setSaving(true);
      const r = await resultsApi.bulkUpsert({
        school_class_id: Number(classId),
        arm_id: armId ? Number(armId) : null,
        subject_id: Number(subjectId),
        term_id: Number(termId),
        sub_term_id: subTermId,
        rows: rows.map((row) => ({
          student_id: row.student_id,
          scores: filterToScheme(row.scores ?? {}, scheme),
        })),
      });
      toast.success(r.message);
      loadSheet();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save scores.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    try {
      setSubmitting(true);
      const r = await resultsApi.submit({
        school_class_id: Number(classId),
        arm_id: armId ? Number(armId) : null,
        subject_id: Number(subjectId),
        term_id: Number(termId),
        sub_term_id: subTermId,
      });
      toast.success(`Submitted ${r.submitted} draft result(s) for approval.`);
      loadSheet();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Score Entry"
            description="Columns are driven by the active assessment scheme. Configure schemes under College Report → Assessment."
          />
        </Toolbar>
      </Container>

      <Container>
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Session</Label>
                <Select
                  value={sessionId}
                  onValueChange={(v) => {
                    setSessionId(v);
                    setTermId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                        {s.is_current ? ' • current' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Term</Label>
                <Select value={termId} onValueChange={setTermId} disabled={!sessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTerms.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {capitalize(t.name)} Term{t.is_current ? ' • current' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Period</Label>
                <Select value={periodKey} onValueChange={setPeriodKey} disabled={!termId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term">End of term (full)</SelectItem>
                    {subTerms.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Arm (optional)</Label>
                <Select
                  value={armId}
                  onValueChange={(v) => setArmId(v === 'all' ? '' : v)}
                  disabled={!classId || arms.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={arms.length ? 'All arms' : 'No arms'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All arms</SelectItem>
                    {arms.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5 lg:col-span-1">
                <Label className="text-xs">Subject</Label>
                <Select
                  value={subjectId}
                  onValueChange={setSubjectId}
                  disabled={!classId || subjects.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        subjects.length ? 'Subject' : 'No subjects on class'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs invisible">Load</Label>
                <Button onClick={loadSheet} disabled={!canLoad || loading}>
                  {loading ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Load students
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && scheme && (
          <Card>
            <CardHeader>
              <CardHeading>
                <span className="text-sm font-medium">
                  {rows.length} student{rows.length === 1 ? '' : 's'}
                </span>
                <span className="text-xs text-muted-foreground ms-3">
                  Scheme: <strong>{scheme.name}</strong> ·{' '}
                  {scheme.components
                    .map((c) => `${c.label} (max ${c.max_score})`)
                    .join(' · ')}{' '}
                  · Total max <strong>{scheme.total_max}</strong>
                </span>
              </CardHeading>
            </CardHeader>
            <CardTable>
              <ScrollArea>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">Adm #</th>
                      <th className="text-start px-3 py-2 font-medium">Student</th>
                      {scheme.components.map((c) => (
                        <th
                          key={c.code}
                          className="text-start px-3 py-2 font-medium"
                          style={{ width: 96 }}
                          title={`Max ${c.max_score}, weight ${c.weight}`}
                        >
                          {c.label}
                          <span className="text-[10px] text-muted-foreground ms-1 font-normal">
                            /{c.max_score}
                          </span>
                        </th>
                      ))}
                      <th className="text-start px-3 py-2 font-medium w-24">Total</th>
                      <th className="text-start px-3 py-2 font-medium w-20">Grade</th>
                      <th className="text-start px-3 py-2 font-medium w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const locked = row.status === 'approved';
                      return (
                        <tr key={row.student_id} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">
                            {row.admission_number}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.name ?? '—'}
                          </td>
                          {scheme.components.map((c) => (
                            <td className="px-2 py-1" key={c.code}>
                              <Input
                                type="number"
                                min={0}
                                max={c.max_score}
                                step="0.5"
                                disabled={locked}
                                value={row.scores?.[c.code] ?? ''}
                                onChange={(e) =>
                                  updateScore(
                                    row.student_id,
                                    c.code,
                                    e.target.value,
                                    c.max_score,
                                  )
                                }
                                className="h-9"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 font-semibold">
                            {row.total ?? 0}
                          </td>
                          <td className="px-3 py-2">
                            {row.grade ? (
                              <Badge variant="outline">{row.grade}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RESULT_STATUS_COLOR[row.status]}`}
                            >
                              {RESULT_STATUS_LABEL[row.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <div className="flex flex-wrap items-center justify-end gap-2 p-4 border-t">
              <span className="text-xs text-muted-foreground me-auto">
                Approved rows are locked from edits. Final total uses the grade
                shown only as a quick preview — server re-grades on save.
              </span>
              <Button variant="outline" onClick={loadSheet} disabled={loading}>
                <RotateCcw className="size-4" />
                Reload
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
                <Save className="size-4" />
                Save scores
              </Button>
              <Button variant="secondary" onClick={submit} disabled={submitting}>
                {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
                <Send className="size-4" />
                Submit for approval
              </Button>
            </div>
          </Card>
        )}
      </Container>
    </Fragment>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function filterToScheme(scores: ScoreMap, scheme: AssessmentSchemeSummary): ScoreMap {
  const allowed = new Set(scheme.components.map((c) => c.code));
  return Object.fromEntries(
    Object.entries(scores).filter(([k, v]) => allowed.has(k) && v !== null),
  ) as ScoreMap;
}

/**
 * Cheap client-side grade preview. Server re-applies the full GradingService
 * on save, so this only needs to be plausibly close.
 */
function localGrade(total: number): string {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 45) return 'D';
  if (total >= 40) return 'E';
  return 'F';
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

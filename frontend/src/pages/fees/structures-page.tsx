import { Fragment, useEffect, useMemo, useState } from 'react';
import { Layers, LoaderCircleIcon, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import {
  TERM_LABELS,
  academicSessionsApi,
  classesApi,
} from '@/services/academic';
import {
  feeCategoriesApi,
  feeStructuresApi,
  formatNaira,
} from '@/services/fees';
import {
  AcademicSession,
  Arm,
  FeeCategory,
  FeeStructure,
  SchoolClass,
  Term,
  TermName,
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
  CardFooter,
  CardHeader,
  CardHeading,
  CardToolbar,
} from '@/components/ui/card';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MatrixRow {
  fee_category_id: number;
  amount: number;
  is_optional: boolean;
}

export function FeeStructuresPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [termId, setTermId] = useState<number | 'all'>('all');
  const [classId, setClassId] = useState<number | null>(null);
  const [armId, setArmId] = useState<number | 'all'>('all');

  const [rows, setRows] = useState<Record<number, MatrixRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial reference data.
  useEffect(() => {
    (async () => {
      try {
        const [s, c, cats] = await Promise.all([
          academicSessionsApi.list(),
          classesApi.list(),
          feeCategoriesApi.list({ only_active: true }),
        ]);
        setSessions(s.data);
        setClasses(c.data);
        setCategories(cats.data);
        const current = s.data.find((x) => x.is_current) ?? s.data[0];
        if (current) setSessionId(current.id);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : 'Could not load reference data.',
        );
      }
    })();
  }, []);

  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  // Refresh arms whenever the class changes.
  useEffect(() => {
    if (!classId) {
      setArms([]);
      setArmId('all');
      return;
    }
    const klass = classes.find((c) => c.id === classId);
    if (klass?.arms) {
      setArms(klass.arms);
      setArmId('all');
    } else {
      classesApi.show(classId).then((r) => {
        setArms(r.data.arms ?? []);
        setArmId('all');
      });
    }
  }, [classId, classes]);

  const loadStructures = useMemo(
    () => async () => {
      if (!sessionId || !classId) return;
      try {
        setLoading(true);
        const r = await feeStructuresApi.list({
          academic_session_id: sessionId,
          school_class_id: classId,
          term_id: termId === 'all' ? undefined : Number(termId),
          arm_id: armId === 'all' ? undefined : Number(armId),
        });
        const map: Record<number, MatrixRow> = {};
        for (const s of r.data) {
          // Only show structures matching the current selection (the API
          // already filters them but extra arms/terms could leak through).
          map[s.fee_category_id] = {
            fee_category_id: s.fee_category_id,
            amount: Number(s.amount),
            is_optional: Boolean(s.is_optional),
          };
        }
        setRows(map);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : 'Could not load fee structure.',
        );
      } finally {
        setLoading(false);
      }
    },
    [sessionId, classId, termId, armId],
  );

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  function setRow(catId: number, patch: Partial<MatrixRow>) {
    setRows((prev) => ({
      ...prev,
      [catId]: {
        fee_category_id: catId,
        amount: prev[catId]?.amount ?? 0,
        is_optional: prev[catId]?.is_optional ?? false,
        ...patch,
      },
    }));
  }

  function clearRow(catId: number) {
    setRows((prev) => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });
  }

  async function save() {
    if (!sessionId || !classId) {
      toast.error('Pick a session and class first.');
      return;
    }
    const items = Object.values(rows)
      .filter((r) => r.amount > 0)
      .map((r) => ({
        fee_category_id: r.fee_category_id,
        amount: r.amount,
        is_optional: r.is_optional,
      }));

    try {
      setSaving(true);
      await feeStructuresApi.bulkSet({
        school_class_id: classId,
        arm_id: armId === 'all' ? null : Number(armId),
        academic_session_id: sessionId,
        term_id: termId === 'all' ? null : Number(termId),
        items,
      });
      toast.success(`Saved ${items.length} fee item(s).`);
      loadStructures();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save fee matrix.',
      );
    } finally {
      setSaving(false);
    }
  }

  const total = useMemo(
    () =>
      Object.values(rows)
        .filter((r) => !r.is_optional && r.amount > 0)
        .reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Fee Structures"
            description="Set per-class, per-term fee schedules. Pick a session, class, optional arm + term, then enter amounts."
          />
          <ToolbarActions>
            <Button onClick={save} disabled={saving || !classId}>
              {saving ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Matrix
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card className="mb-6">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Selection</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Session</Label>
              <Select
                value={sessionId ? String(sessionId) : ''}
                onValueChange={(v) => setSessionId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} {s.is_current && '(current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Term</Label>
              <Select
                value={String(termId)}
                onValueChange={(v) => setTermId(v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All terms (session-wide)</SelectItem>
                  {(session?.terms ?? []).map((t: Term) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {TERM_LABELS[t.name as TermName]}
                      {t.is_current && ' (current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Class</Label>
              <Select
                value={classId ? String(classId) : ''}
                onValueChange={(v) => setClassId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
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
              <Label>Arm</Label>
              <Select
                value={String(armId)}
                onValueChange={(v) => setArmId(v === 'all' ? 'all' : Number(v))}
                disabled={!classId || arms.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All arms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All arms</SelectItem>
                  {arms.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      Arm {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeading>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold">Fee Matrix</h3>
                <Badge variant="secondary">
                  <Layers className="size-3 me-1" />
                  {Object.values(rows).filter((r) => r.amount > 0).length} items
                </Badge>
              </div>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="p-0">
            {!classId ? (
              <p className="p-6 text-sm text-muted-foreground">
                Select a class above to start configuring its fees.
              </p>
            ) : loading ? (
              <div className="flex items-center justify-center p-10 text-muted-foreground">
                <LoaderCircleIcon className="size-5 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No fee categories defined yet. Create some on the Fee Categories
                page first.
              </p>
            ) : (
              <ScrollArea>
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr className="text-start">
                      <th className="px-4 py-2 text-start">Category</th>
                      <th className="px-4 py-2 text-start">Code</th>
                      <th className="px-4 py-2 text-end">Amount (₦)</th>
                      <th className="px-4 py-2 text-center">Optional?</th>
                      <th className="px-4 py-2 text-end w-12">&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const row = rows[cat.id];
                      return (
                        <tr key={cat.id} className="border-t border-border">
                          <td className="px-4 py-2 font-medium">{cat.name}</td>
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                            {cat.code}
                          </td>
                          <td className="px-4 py-2 text-end">
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              className="w-32 ms-auto text-end"
                              value={row?.amount ?? ''}
                              onChange={(e) =>
                                setRow(cat.id, {
                                  amount: Number(e.target.value || 0),
                                })
                              }
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Switch
                              checked={row?.is_optional ?? false}
                              onCheckedChange={(v) =>
                                setRow(cat.id, { is_optional: Boolean(v) })
                              }
                              disabled={!row || row.amount <= 0}
                            />
                          </td>
                          <td className="px-4 py-2 text-end">
                            {row && row.amount > 0 && (
                              <Button
                                mode="icon"
                                variant="ghost"
                                size="sm"
                                onClick={() => clearRow(cat.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Compulsory total per student (this term):
            </span>
            <span className="text-lg font-semibold">{formatNaira(total)}</span>
          </CardFooter>
        </Card>
      </Container>
    </Fragment>
  );
}

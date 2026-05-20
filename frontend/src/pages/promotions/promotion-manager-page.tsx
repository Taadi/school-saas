import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Info,
  LoaderCircleIcon,
  RotateCcw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { academicSessionsApi } from '@/services/academic';
import {
  PromotionAction,
  PromotionPreviewContext,
  PromotionPreviewGroup,
  PromotionRule,
  promotionsApi,
} from '@/services/promotions';
import { AcademicSession } from '@/types/school';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Alert, AlertContent, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ACTION_META: Record<PromotionAction, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  promote: {
    label: 'Promote',
    tone: 'bg-primary/15 text-primary border-primary/30',
    icon: ArrowRight,
  },
  repeat: {
    label: 'Repeat',
    tone: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    icon: RotateCcw,
  },
  graduate: {
    label: 'Graduate',
    tone: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    icon: GraduationCap,
  },
};

interface DraftRule {
  source_class_id: number;
  source_arm_id: number | null;
  action: PromotionAction;
  target_class_id: number | null;
  target_arm_id: number | null;
  excluded: Set<number>;
}

export function PromotionManagerPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [sourceSessionId, setSourceSessionId] = useState<string>('');
  const [targetSessionId, setTargetSessionId] = useState<string>('');

  const [groups, setGroups] = useState<PromotionPreviewGroup[]>([]);
  const [context, setContext] = useState<PromotionPreviewContext | null>(null);
  const [rules, setRules] = useState<Record<string, DraftRule>>({});

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [carryOpen, setCarryOpen] = useState(false);
  const [carryRunning, setCarryRunning] = useState(false);

  useEffect(() => {
    academicSessionsApi
      .list()
      .then((r) => {
        const list = r.data;
        setSessions(list);

        // Pick sensible defaults: target = current session, source = the
        // session immediately before it by name (or the next-most-recent one).
        const current = list.find((s) => s.is_current);
        const others = list.filter((s) => s.id !== current?.id);
        const previous = current
          ? [...others].sort((a, b) => b.name.localeCompare(a.name))[0]
          : list[0];

        if (current) setTargetSessionId(String(current.id));
        if (previous) setSourceSessionId(String(previous.id));
      })
      .catch(() => undefined);
  }, []);

  function ruleKey(g: { source_class_id: number; source_arm_id: number | null }) {
    return `${g.source_class_id}:${g.source_arm_id ?? 'null'}`;
  }

  async function loadPreview() {
    if (!sourceSessionId || !targetSessionId) {
      toast.error('Choose both a source and a target session.');
      return;
    }
    if (sourceSessionId === targetSessionId) {
      toast.error('Source and target session must be different.');
      return;
    }

    try {
      setLoadingPreview(true);
      const r = await promotionsApi.preview(
        Number(sourceSessionId),
        Number(targetSessionId),
      );
      setGroups(r.data);
      setContext(r.context);

      // Seed the rule drafts with the backend's suggestion per group.
      const next: Record<string, DraftRule> = {};
      r.data.forEach((g) => {
        next[ruleKey(g)] = {
          source_class_id: g.source_class_id,
          source_arm_id: g.source_arm_id,
          action: g.suggested_action,
          target_class_id: g.suggested_target_class_id,
          target_arm_id: g.source_arm_id,
          excluded: new Set<number>(
            g.students.filter((s) => s.already_enrolled_in_target).map((s) => s.id),
          ),
        };
      });
      setRules(next);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not load promotion preview.',
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  function updateRule(key: string, patch: Partial<DraftRule>) {
    setRules((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function toggleExclude(key: string, studentId: number) {
    setRules((prev) => {
      const set = new Set(prev[key].excluded);
      if (set.has(studentId)) set.delete(studentId);
      else set.add(studentId);
      return { ...prev, [key]: { ...prev[key], excluded: set } };
    });
  }

  const totals = useMemo(() => {
    return Object.entries(rules).reduce(
      (acc, [k, r]) => {
        const group = groups.find((g) => ruleKey(g) === k);
        if (!group) return acc;
        const eligible = group.students.length - r.excluded.size;
        if (r.action === 'promote') acc.promote += eligible;
        else if (r.action === 'repeat') acc.repeat += eligible;
        else acc.graduate += eligible;
        return acc;
      },
      { promote: 0, repeat: 0, graduate: 0 },
    );
  }, [rules, groups]);

  async function apply() {
    if (!context) return;
    const payloadRules: PromotionRule[] = Object.values(rules).map((r) => ({
      source_class_id: r.source_class_id,
      source_arm_id: r.source_arm_id,
      action: r.action,
      target_class_id: r.action === 'promote' ? r.target_class_id : null,
      target_arm_id: r.action === 'promote' ? r.target_arm_id : null,
      exclude_student_ids: Array.from(r.excluded),
    }));

    const missing = payloadRules.find(
      (r) => r.action === 'promote' && !r.target_class_id,
    );
    if (missing) {
      toast.error('Each class set to "Promote" needs a target class.');
      return;
    }

    try {
      setApplying(true);
      const r = await promotionsApi.apply({
        source_session_id: context.source_session.id,
        target_session_id: context.target_session.id,
        rules: payloadRules,
      });
      toast.success(r.message);
      setConfirmOpen(false);
      loadPreview();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not apply promotion.',
      );
    } finally {
      setApplying(false);
    }
  }

  async function runCarryForward() {
    if (!targetSessionId) return;
    try {
      setCarryRunning(true);
      const r = await academicSessionsApi.promoteEnrollments(Number(targetSessionId));
      toast.success(r.message);
      setCarryOpen(false);
      loadPreview();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not carry enrollments forward.',
      );
    } finally {
      setCarryRunning(false);
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Promotion Manager"
            description="Move students between academic sessions. Promote class-by-class (JSS1 → JSS2), keep repeaters in place, or graduate the final year."
          />
          <ToolbarActions>
            <Button
              variant="outline"
              onClick={() => setCarryOpen(true)}
              disabled={!targetSessionId}
            >
              <Undo2 className="size-4" />
              Carry forward (same class)
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card>
          <CardHeader>
            <CardHeading>
              <span className="font-semibold">Pick sessions</span>
            </CardHeading>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>From session</Label>
                <Select value={sourceSessionId} onValueChange={setSourceSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source session" />
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

              <div className="space-y-1.5">
                <Label>Into session</Label>
                <Select value={targetSessionId} onValueChange={setTargetSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target session" />
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

              <div className="flex items-end">
                <Button
                  onClick={loadPreview}
                  disabled={loadingPreview || !sourceSessionId || !targetSessionId}
                  className="w-full md:w-auto"
                >
                  {loadingPreview ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generate preview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>

      {context && groups.length > 0 && (
        <Container>
          <Alert variant="primary" appearance="light">
            <Info className="size-4" />
            <AlertContent>
              <AlertTitle>
                {context.source_session.name} → {context.target_session.name}
              </AlertTitle>
              <AlertDescription>
                {totals.promote} student(s) will be promoted, {totals.repeat} will
                repeat, and {totals.graduate} will graduate. Already-enrolled students
                in the target session are pre-excluded.
              </AlertDescription>
            </AlertContent>
          </Alert>
        </Container>
      )}

      {context && (
        <Container>
          {groups.length === 0 && !loadingPreview ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No active enrollments in {context.source_session.name}.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {groups.map((g) => {
                const key = ruleKey(g);
                const rule = rules[key];
                if (!rule) return null;
                const eligible = g.students.length - rule.excluded.size;
                const ActionIcon = ACTION_META[rule.action].icon;
                const targetClass = context.classes.find(
                  (c) => c.id === rule.target_class_id,
                );

                return (
                  <Card key={key}>
                    <CardHeader>
                      <CardHeading>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {g.source_class_name}
                            {g.source_arm_name ? ` — ${g.source_arm_name}` : ''}
                          </span>
                          <Badge variant="outline">
                            <Users className="size-3 me-1" />
                            {g.student_count} student
                            {g.student_count === 1 ? '' : 's'}
                          </Badge>
                          <Badge className={ACTION_META[rule.action].tone}>
                            <ActionIcon className="size-3 me-1" />
                            {ACTION_META[rule.action].label}
                            {rule.action === 'promote' && targetClass ? (
                              <span className="ms-1">→ {targetClass.name}</span>
                            ) : null}
                          </Badge>
                          <Badge variant="outline">{eligible} eligible</Badge>
                        </div>
                      </CardHeading>
                      <CardToolbar>
                        <RuleControls
                          rule={rule}
                          context={context}
                          onChange={(patch) => updateRule(key, patch)}
                        />
                      </CardToolbar>
                    </CardHeader>
                    <CardContent>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                          Show students ({g.students.length})
                        </summary>
                        <div className="mt-3 grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                          {g.students.map((s) => {
                            const excluded = rule.excluded.has(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${
                                  excluded ? 'opacity-50' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={!excluded}
                                  onCheckedChange={() => toggleExclude(key, s.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-foreground truncate">
                                    {s.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {s.admission_number}
                                    {s.already_enrolled_in_target ? (
                                      <span className="ms-1 text-amber-600">
                                        • already in target
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {groups.length > 0 && (
            <Card className="mt-4">
              <CardFooter className="justify-end gap-2 py-4">
                <Button variant="outline" onClick={loadPreview} disabled={loadingPreview}>
                  Reset to suggestions
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={applying || totals.promote + totals.repeat + totals.graduate === 0}
                >
                  <CheckCircle2 className="size-4" />
                  Apply promotion
                </Button>
              </CardFooter>
            </Card>
          )}
        </Container>
      )}

      {/* Apply confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply promotion?</DialogTitle>
          </DialogHeader>
          {context && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                This will create enrollment records in{' '}
                <strong className="text-foreground">{context.target_session.name}</strong>{' '}
                using the rules below. Already-enrolled students are skipped.
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Badge className={ACTION_META.promote.tone}>
                    Promote → {totals.promote}
                  </Badge>
                </li>
                <li>
                  <Badge className={ACTION_META.repeat.tone}>
                    Repeat → {totals.repeat}
                  </Badge>
                </li>
                <li>
                  <Badge className={ACTION_META.graduate.tone}>
                    Graduate → {totals.graduate}
                  </Badge>
                </li>
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={applying}>
              {applying && <LoaderCircleIcon className="size-4 animate-spin" />}
              Confirm & apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry-forward confirmation */}
      <Dialog open={carryOpen} onOpenChange={setCarryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carry enrollments forward?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copies every active enrollment from the previous session into{' '}
            <strong className="text-foreground">
              {sessions.find((s) => String(s.id) === targetSessionId)?.name}
            </strong>{' '}
            in the same class & arm. Use this when no promotion is needed —
            e.g. a new term/year began but everyone stays in place. It does not
            change any student's class.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runCarryForward} disabled={carryRunning}>
              {carryRunning && <LoaderCircleIcon className="size-4 animate-spin" />}
              Carry forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function RuleControls({
  rule,
  context,
  onChange,
}: {
  rule: DraftRule;
  context: PromotionPreviewContext;
  onChange(patch: Partial<DraftRule>): void;
}) {
  const targetClass = context.classes.find((c) => c.id === rule.target_class_id);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={rule.action}
        onValueChange={(v) => onChange({ action: v as PromotionAction })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="promote">Promote</SelectItem>
          <SelectItem value="repeat">Repeat</SelectItem>
          <SelectItem value="graduate">Graduate</SelectItem>
        </SelectContent>
      </Select>

      {rule.action === 'promote' && (
        <Fragment>
          <Select
            value={rule.target_class_id ? String(rule.target_class_id) : ''}
            onValueChange={(v) =>
              onChange({ target_class_id: Number(v), target_arm_id: null })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Target class" />
            </SelectTrigger>
            <SelectContent>
              {context.classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={rule.target_arm_id ? String(rule.target_arm_id) : 'same'}
            onValueChange={(v) =>
              onChange({ target_arm_id: v === 'same' ? null : Number(v) })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Target arm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same">Same arm</SelectItem>
              {(targetClass?.arms ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Fragment>
      )}
    </div>
  );
}

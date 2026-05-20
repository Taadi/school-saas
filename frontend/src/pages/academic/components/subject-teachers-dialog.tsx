import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  LoaderCircleIcon,
  Plus,
  School,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { classesApi } from '@/services/academic';
import { subjectTeachersApi } from '@/services/subject-teachers';
import { teachersApi } from '@/services/teachers';
import {
  Arm,
  SchoolClass,
  Subject,
  SubjectTeacherAssignment,
  Teacher,
} from '@/types/school';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NO_VALUE = '__none__';

interface Props {
  open: boolean;
  onOpenChange(o: boolean): void;
  subject: Subject | null;
  /** Optional callback after the assignment list changes — useful for refreshing counts. */
  onChanged?(): void;
}

/**
 * Admin-only dialog for assigning teachers to a subject across the school's
 * classes/arms. Each row is one (Class › Arm) ↔ Teacher pair. Co-teachers are
 * allowed (same arm, different teachers).
 */
export function SubjectTeachersDialog({
  open,
  onOpenChange,
  subject,
  onChanged,
}: Props) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Add-row form
  const [classId, setClassId] = useState<string>(NO_VALUE);
  const [armId, setArmId] = useState<string>(NO_VALUE);
  const [teacherId, setTeacherId] = useState<string>(NO_VALUE);
  const [adding, setAdding] = useState(false);

  // Refresh assignments
  const refresh = useMemo(
    () => async () => {
      if (!subject) return;
      try {
        setLoading(true);
        const r = await subjectTeachersApi.forSubject(subject.id);
        setAssignments(r.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load assignments.',
        );
      } finally {
        setLoading(false);
      }
    },
    [subject],
  );

  // One-time bootstrap of classes + teachers when the dialog opens
  useEffect(() => {
    if (!open || !subject) return;
    let alive = true;
    (async () => {
      try {
        setBootstrapping(true);
        const [cls, tch] = await Promise.all([
          classesApi.list(),
          teachersApi.list({
            status: 'active',
            per_page: 100,
            sort: 'id',
            direction: 'asc',
          }),
        ]);
        if (!alive) return;
        setClasses(cls.data);
        setTeachers(tch.data);
      } catch {
        if (alive) toast.error('Could not load classes or teachers.');
      } finally {
        if (alive) setBootstrapping(false);
      }
      refresh();
    })();
    return () => {
      alive = false;
    };
  }, [open, subject, refresh]);

  // Reset form when dialog re-opens
  useEffect(() => {
    if (open) {
      setClassId(NO_VALUE);
      setArmId(NO_VALUE);
      setTeacherId(NO_VALUE);
    }
  }, [open]);

  // Group assignments by class for display
  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { className: string; rows: SubjectTeacherAssignment[] }
    >();
    assignments.forEach((a) => {
      const key = a.school_class_id;
      const className = a.school_class?.name ?? `Class #${key}`;
      if (!map.has(key)) map.set(key, { className, rows: [] });
      map.get(key)!.rows.push(a);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className),
    );
  }, [assignments]);

  // Available arms for currently picked class
  const armsForClass = useMemo<Arm[]>(() => {
    if (classId === NO_VALUE) return [];
    const cls = classes.find((c) => String(c.id) === classId);
    return cls?.arms ?? [];
  }, [classes, classId]);

  // Reset arm when class changes
  useEffect(() => {
    setArmId(NO_VALUE);
  }, [classId]);

  async function add() {
    if (!subject) return;
    if (classId === NO_VALUE || armId === NO_VALUE || teacherId === NO_VALUE) {
      toast.error('Pick a class, arm, and teacher.');
      return;
    }
    try {
      setAdding(true);
      await subjectTeachersApi.create({
        subject_id: subject.id,
        arm_id: Number(armId),
        teacher_user_id: Number(teacherId),
      });
      toast.success('Teacher assigned.');
      setClassId(NO_VALUE);
      setArmId(NO_VALUE);
      setTeacherId(NO_VALUE);
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not assign teacher.',
      );
    } finally {
      setAdding(false);
    }
  }

  async function remove(a: SubjectTeacherAssignment) {
    if (
      !confirm(
        `Remove ${a.teacher?.name ?? 'this teacher'} from ${
          a.school_class?.name ?? ''
        } ${a.arm?.name ?? ''} for ${subject?.name ?? 'this subject'}?`,
      )
    ) {
      return;
    }
    try {
      await subjectTeachersApi.remove(a.id);
      toast.success('Assignment removed.');
      await refresh();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not remove assignment.',
      );
    }
  }

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-5" />
            Teachers for{' '}
            <span className="text-primary">{subject.name}</span>
            <Badge variant="outline" className="ms-1 font-mono">
              {subject.code}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Assign one or more teachers to this subject per class arm. Teachers
            will then be able to enter scores for their assigned arms only.
          </DialogDescription>
        </DialogHeader>

        {/* Existing assignments */}
        <div className="rounded-md border">
          <div className="px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>
              <Users className="size-3.5 inline -mt-0.5 me-1" />
              Current assignments
            </span>
            <Badge variant="secondary">{assignments.length}</Badge>
          </div>
          <ScrollArea className="max-h-[280px]">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : grouped.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No teachers assigned yet.
              </div>
            ) : (
              <ul className="divide-y">
                {grouped.map((g) => (
                  <li key={g.className} className="px-3 py-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <School className="size-3.5" />
                      {g.className}
                    </div>
                    <div className="grid gap-1.5">
                      {g.rows.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{a.arm?.name ?? '—'}</Badge>
                            <UserCheck className="size-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {a.teacher?.name ?? `User #${a.teacher_user_id}`}
                            </span>
                            {a.teacher?.email && (
                              <span className="text-muted-foreground text-xs">
                                · {a.teacher.email}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => remove(a)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Add new assignment */}
        <div className="rounded-md border p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-3 items-end">
          <div className="grid gap-1.5">
            <Label>Class</Label>
            <Select
              value={classId}
              onValueChange={setClassId}
              disabled={bootstrapping}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={bootstrapping ? 'Loading…' : 'Pick class'}
                />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
                {!bootstrapping && classes.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No classes yet.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Arm</Label>
            <Select
              value={armId}
              onValueChange={setArmId}
              disabled={classId === NO_VALUE || armsForClass.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    classId === NO_VALUE
                      ? 'Pick class first'
                      : armsForClass.length === 0
                        ? 'No arms'
                        : 'Pick arm'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {armsForClass.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Teacher</Label>
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
              disabled={bootstrapping}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={bootstrapping ? 'Loading…' : 'Pick teacher'}
                />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.user_id} value={String(t.user_id)}>
                    {t.name}
                    {t.subject_specialization
                      ? ` · ${t.subject_specialization}`
                      : ''}
                  </SelectItem>
                ))}
                {!bootstrapping && teachers.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No active teachers.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={adding}>
            {adding ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

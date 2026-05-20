import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  LoaderCircleIcon,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { armsApi, classesApi, subjectsApi } from '@/services/academic';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  schoolClass: SchoolClass | null;
  onChanged(): void;
}

export function ClassManagerDialog({
  open,
  onOpenChange,
  schoolClass,
  onChanged,
}: Props) {
  if (!schoolClass) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Manage {schoolClass.name}{' '}
            <Badge variant="secondary" className="ms-2">
              {schoolClass.level.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="arms">
          <TabsList>
            <TabsTrigger value="arms">Arms / Sections</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="subject-teachers">
              <GraduationCap className="size-3.5 me-1.5" />
              Subject Teachers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arms" className="pt-4">
            <ArmsManager schoolClass={schoolClass} onChanged={onChanged} />
          </TabsContent>

          <TabsContent value="subjects" className="pt-4">
            <SubjectsManager schoolClass={schoolClass} onChanged={onChanged} />
          </TabsContent>

          <TabsContent value="subject-teachers" className="pt-4">
            <SubjectTeachersManager
              schoolClass={schoolClass}
              onChanged={onChanged}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Arms manager                                                               */
/* -------------------------------------------------------------------------- */

const NO_TEACHER = '__none__';

function ArmsManager({
  schoolClass,
  onChanged,
}: {
  schoolClass: SchoolClass;
  onChanged(): void;
}) {
  const [arms, setArms] = useState<Arm[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [editing, setEditing] = useState<Arm | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(40);
  const [classTeacherId, setClassTeacherId] = useState<string>(NO_TEACHER);

  const refresh = async () => {
    try {
      setLoading(true);
      const r = await armsApi.list(schoolClass.id);
      setArms(r.data);
    } catch {
      toast.error('Could not load arms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass.id]);

  // Load all active teachers once — used for the form-teacher picker.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTeachers(true);
        const res = await teachersApi.list({
          status: 'active',
          per_page: 100,
          sort: 'id',
          direction: 'asc',
        });
        if (!alive) return;
        setTeachers(res.data);
      } catch {
        if (alive) toast.error('Could not load teachers.');
      } finally {
        if (alive) setLoadingTeachers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const teacherByUserId = useMemo(() => {
    const map = new Map<number, Teacher>();
    teachers.forEach((t) => map.set(t.user_id, t));
    return map;
  }, [teachers]);

  function resetForm() {
    setEditing(null);
    setName('');
    setCapacity(40);
    setClassTeacherId(NO_TEACHER);
  }

  async function save() {
    if (!name.trim()) return toast.error('Arm name is required.');
    try {
      const payload = {
        name: name.trim(),
        capacity: capacity === '' ? undefined : Number(capacity),
        class_teacher_id:
          classTeacherId === NO_TEACHER ? null : Number(classTeacherId),
      };
      if (editing) {
        await armsApi.update(schoolClass.id, editing.id, payload);
        toast.success('Arm updated.');
      } else {
        await armsApi.create(schoolClass.id, payload);
        toast.success('Arm created.');
      }
      resetForm();
      refresh();
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not save arm.',
      );
    }
  }

  async function remove(arm: Arm) {
    if (!confirm(`Delete arm "${arm.name}"?`)) return;
    try {
      await armsApi.remove(schoolClass.id, arm.id);
      toast.success('Arm deleted.');
      refresh();
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete arm.');
    }
  }

  function startEdit(arm: Arm) {
    setEditing(arm);
    setName(arm.name);
    setCapacity(arm.capacity ?? 40);
    setClassTeacherId(
      arm.class_teacher_id ? String(arm.class_teacher_id) : NO_TEACHER,
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-start px-3 py-2 font-medium">Name</th>
              <th className="text-start px-3 py-2 font-medium">Capacity</th>
              <th className="text-start px-3 py-2 font-medium">Form teacher</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : arms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No arms yet. Add one below.
                </td>
              </tr>
            ) : (
              arms.map((arm) => {
                const teacher =
                  arm.class_teacher ??
                  (arm.class_teacher_id
                    ? teacherByUserId.get(arm.class_teacher_id)
                      ? {
                          id: arm.class_teacher_id,
                          name:
                            teacherByUserId.get(arm.class_teacher_id)?.name ??
                            '—',
                        }
                      : null
                    : null);
                return (
                  <tr key={arm.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{arm.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {arm.capacity ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {teacher ? (
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">{teacher.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        onClick={() => startEdit(arm)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        onClick={() => remove(arm)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border p-3 grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
        <div className="grid gap-1.5">
          <Label>Arm name</Label>
          <Input
            placeholder="A, B, Gold, Silver…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={capacity}
            onChange={(e) =>
              setCapacity(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Form teacher</Label>
          <Select
            value={classTeacherId}
            onValueChange={(v) => setClassTeacherId(v)}
            disabled={loadingTeachers}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingTeachers ? 'Loading…' : 'Unassigned'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEACHER}>Unassigned</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.user_id} value={String(t.user_id)}>
                  {t.name}
                  {t.subject_specialization
                    ? ` · ${t.subject_specialization}`
                    : ''}
                </SelectItem>
              ))}
              {!loadingTeachers && teachers.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No active teachers yet. Add one in{' '}
                  <strong>Teachers</strong>.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {editing && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
          <Button onClick={save}>
            <Plus className="size-4" />
            {editing ? 'Save' : 'Add arm'}
          </Button>
        </div>
      </div>

      {teachers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: only active teachers from this school appear in the form-teacher
          list. Mark a teacher <Badge variant="outline">resigned</Badge> to
          remove them from selection.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subjects manager                                                           */
/* -------------------------------------------------------------------------- */

function SubjectsManager({
  schoolClass,
  onChanged,
}: {
  schoolClass: SchoolClass;
  onChanged(): void;
}) {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [compulsory, setCompulsory] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return allSubjects;
    return allSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [allSubjects, filter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [subs, current] = await Promise.all([
          subjectsApi.list(),
          classesApi.subjects(schoolClass.id),
        ]);
        if (!alive) return;
        setAllSubjects(subs.data);
        const sel = new Set<number>(current.data.map((s) => s.id));
        setSelected(sel);
        setCompulsory(new Set(sel));
      } catch {
        toast.error('Could not load subjects.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [schoolClass.id]);

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCompulsory((c) => {
          const cn = new Set(c);
          cn.delete(id);
          return cn;
        });
      } else {
        next.add(id);
        setCompulsory((c) => new Set(c).add(id));
      }
      return next;
    });
  }

  function toggleCompulsory(id: number) {
    setCompulsory((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    try {
      setSaving(true);
      await classesApi.syncSubjects(
        schoolClass.id,
        Array.from(selected),
        Array.from(compulsory),
      );
      toast.success(`Subjects updated for ${schoolClass.name}.`);
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save subjects.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Filter subjects…"
          className="max-w-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Badge variant="outline">{compulsory.size} compulsory</Badge>
        </div>
      </div>

      <ScrollArea className="h-80 rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur text-muted-foreground">
            <tr>
              <th className="text-start px-3 py-2 font-medium w-12">Pick</th>
              <th className="text-start px-3 py-2 font-medium">Code</th>
              <th className="text-start px-3 py-2 font-medium">Subject</th>
              <th className="text-start px-3 py-2 font-medium w-32">Compulsory</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                  Loading subjects…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                  No subjects match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((subject) => {
                const isSel = selected.has(subject.id);
                return (
                  <tr key={subject.id} className="border-t">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleSelected(subject.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{subject.code}</td>
                    <td className="px-3 py-2 font-medium">{subject.name}</td>
                    <td className="px-3 py-2">
                      <Checkbox
                        disabled={!isSel}
                        checked={compulsory.has(subject.id)}
                        onCheckedChange={() => toggleCompulsory(subject.id)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          Save subjects
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subject Teachers manager — assign teachers per (subject × arm) for class   */
/* -------------------------------------------------------------------------- */

const NO_TEACHER_VALUE = '__none__';

function SubjectTeachersManager({
  schoolClass,
  onChanged,
}: {
  schoolClass: SchoolClass;
  onChanged(): void;
}) {
  const [arms, setArms] = useState<Arm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const [armsR, subjectsR, teachersR, assignsR] = await Promise.all([
        armsApi.list(schoolClass.id),
        classesApi.subjects(schoolClass.id),
        teachersApi.list({
          status: 'active',
          per_page: 100,
          sort: 'id',
          direction: 'asc',
        }),
        subjectTeachersApi.list({ school_class_id: schoolClass.id }),
      ]);
      setArms(armsR.data);
      setSubjects(subjectsR.data);
      setTeachers(teachersR.data);
      setAssignments(assignsR.data);
    } catch {
      toast.error('Could not load subject-teacher matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass.id]);

  // Index assignments by `${subjectId}:${armId}` -> first matching assignment.
  // Co-teaching is supported at the API level but the per-class matrix shows
  // one slot per cell — co-teachers should be added via the Subjects page.
  const assignmentByCell = useMemo(() => {
    const map = new Map<string, SubjectTeacherAssignment>();
    assignments.forEach((a) => map.set(`${a.subject_id}:${a.arm_id}`, a));
    return map;
  }, [assignments]);

  async function setCell(subject: Subject, arm: Arm, teacherUserId: number | null) {
    const key = `${subject.id}:${arm.id}`;
    const current = assignmentByCell.get(key);
    if (current && current.teacher_user_id === teacherUserId) return;
    setSavingKey(key);
    try {
      // Remove existing assignment first (if any)
      if (current) {
        await subjectTeachersApi.remove(current.id);
      }
      // Then create the new one (if a teacher was selected)
      if (teacherUserId !== null) {
        await subjectTeachersApi.create({
          subject_id: subject.id,
          arm_id: arm.id,
          teacher_user_id: teacherUserId,
        });
      }
      await refresh();
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not update assignment.',
      );
    } finally {
      setSavingKey(null);
    }
  }

  if (loading && assignments.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading matrix…
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No subjects assigned to <strong>{schoolClass.name}</strong> yet. Add
        them from the <strong>Subjects</strong> tab first.
      </div>
    );
  }

  if (arms.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No arms set up for <strong>{schoolClass.name}</strong> yet. Add an arm
        from the <strong>Arms / Sections</strong> tab first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick the teacher responsible for each subject in each arm. The matrix
        only shows one teacher per cell — for co-teaching, use the{' '}
        <strong>Subjects</strong> page.
      </p>

      <ScrollArea className="rounded-md border max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground sticky top-0">
            <tr>
              <th className="text-start px-3 py-2 font-medium min-w-[180px]">
                Subject
              </th>
              {arms.map((arm) => (
                <th
                  key={arm.id}
                  className="text-start px-3 py-2 font-medium min-w-[180px]"
                >
                  Arm {arm.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{subject.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {subject.code}
                  </div>
                </td>
                {arms.map((arm) => {
                  const key = `${subject.id}:${arm.id}`;
                  const a = assignmentByCell.get(key);
                  const value = a
                    ? String(a.teacher_user_id)
                    : NO_TEACHER_VALUE;
                  return (
                    <td key={arm.id} className="px-3 py-2 align-top">
                      <Select
                        value={value}
                        disabled={savingKey === key}
                        onValueChange={(v) =>
                          setCell(
                            subject,
                            arm,
                            v === NO_TEACHER_VALUE ? null : Number(v),
                          )
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TEACHER_VALUE}>
                            Unassigned
                          </SelectItem>
                          {teachers.map((t) => (
                            <SelectItem
                              key={t.user_id}
                              value={String(t.user_id)}
                            >
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TEACHER_STATUS_BADGE,
  teachersApi,
  teacherPhotoUrl,
} from '@/services/teachers';
import { ApiError } from '@/lib/api';
import { Teacher } from '@/types/school';
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
  CardHeader,
  CardHeading,
  CardToolbar,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherFormDialog } from './components/teacher-form-dialog';

export function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetResult, setResetResult] = useState<
    { email: string; temporary_password: string } | null
  >(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    teachersApi
      .show(Number(id))
      .then((r) => !cancelled && setTeacher(r.data))
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load teacher.',
        ),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!teacher) return;
    try {
      await teachersApi.remove(teacher.id);
      toast.success('Teacher removed.');
      navigate('/teachers');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete teacher.',
      );
    }
  }

  async function handleResetPassword() {
    if (!teacher) return;
    try {
      const res = await teachersApi.resetPassword(teacher.id);
      setResetResult(res);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not reset password.',
      );
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !teacher) return;
    try {
      const res = await teachersApi.uploadPhoto(teacher.id, file);
      setTeacher({ ...teacher, passport_photo: res.passport_photo });
      toast.success('Photo updated.');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not upload photo.',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </Container>
    );
  }

  if (!teacher) {
    return (
      <Container>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Teacher not found.
          </CardContent>
        </Card>
      </Container>
    );
  }

  const status = TEACHER_STATUS_BADGE[teacher.status];
  const photo = teacherPhotoUrl(teacher.passport_photo);

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title={teacher.name ?? 'Teacher'}
            description={
              <span className="font-mono text-xs">{teacher.staff_id}</span>
            }
          />
          <ToolbarActions>
            <Button variant="outline" onClick={() => navigate('/teachers')}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResetOpen(true);
                setResetResult(null);
              }}
            >
              <KeyRound className="size-4" />
              Reset password
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Edit className="size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {photo ? (
                    <img
                      src={photo}
                      alt={teacher.name ?? ''}
                      className="size-28 rounded-full object-cover border bg-muted"
                    />
                  ) : (
                    <div className="size-28 rounded-full grid place-items-center bg-muted text-muted-foreground border">
                      <UserRound className="size-12" />
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {photo ? 'Replace' : 'Upload photo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{teacher.name}</h2>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {teacher.email && (
                      <a
                        href={`mailto:${teacher.email}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <Mail className="size-3.5" />
                        {teacher.email}
                      </a>
                    )}
                    {teacher.phone && (
                      <a
                        href={`tel:${teacher.phone}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <Phone className="size-3.5" />
                        {teacher.phone}
                      </a>
                    )}
                    {teacher.state_of_origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {teacher.state_of_origin}
                      </span>
                    )}
                  </div>
                </div>

                <div className="md:text-end">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                  >
                    {status.label}
                  </span>
                  {!teacher.is_active && (
                    <Badge variant="outline" className="ms-2">
                      Login disabled
                    </Badge>
                  )}
                </div>

                <SummaryStat
                  label="Subject Specialization"
                  value={teacher.subject_specialization ?? '—'}
                />
                <SummaryStat
                  label="Qualification"
                  value={teacher.qualification ?? '—'}
                />
                <SummaryStat
                  label="Years of Experience"
                  value={
                    teacher.years_of_experience !== null
                      ? `${teacher.years_of_experience} year(s)`
                      : '—'
                  }
                />
                <SummaryStat
                  label="Date Employed"
                  value={teacher.date_employed ?? '—'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="next-of-kin">Next of Kin</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <DetailsCard
              title="Personal Information"
              rows={[
                ['Full Name', teacher.name],
                ['Email', teacher.email],
                ['Primary Phone', teacher.phone],
                ['Secondary Phone', teacher.phone_secondary],
                [
                  'Date of Birth',
                  teacher.date_of_birth ?? null,
                ],
                ['Gender', cap(teacher.gender)],
                ['Marital Status', teacher.marital_status],
                ['State of Origin', teacher.state_of_origin],
                ['LGA', teacher.lga],
                ['Address', teacher.address],
              ]}
            />
          </TabsContent>

          <TabsContent value="employment" className="mt-4">
            <DetailsCard
              title="Employment Details"
              rows={[
                ['Staff ID', teacher.staff_id],
                ['Status', cap(teacher.status.replace('_', ' '))],
                ['Date Employed', teacher.date_employed],
                ['Qualification', teacher.qualification],
                ['Subject Specialization', teacher.subject_specialization],
                [
                  'Years of Experience',
                  teacher.years_of_experience !== null
                    ? `${teacher.years_of_experience} year(s)`
                    : null,
                ],
                [
                  'Salary',
                  teacher.salary_amount !== null
                    ? `₦${Number(teacher.salary_amount).toLocaleString()}`
                    : null,
                ],
              ]}
            />
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <DetailsCard
              title="Bank Account"
              rows={[
                ['Bank Name', teacher.bank_name],
                ['Account Number', teacher.account_number],
                ['Account Name', teacher.account_name],
              ]}
            />
          </TabsContent>

          <TabsContent value="next-of-kin" className="mt-4">
            <DetailsCard
              title="Next of Kin"
              rows={[
                ['Name', teacher.next_of_kin_name],
                ['Phone', teacher.next_of_kin_phone],
                ['Relationship', teacher.next_of_kin_relationship],
              ]}
            />
          </TabsContent>
        </Tabs>
      </Container>

      <TeacherFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={teacher}
        onSaved={(t) => setTeacher(t)}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove teacher?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{teacher.name}</strong> (
            {teacher.staff_id}) will be soft-deleted and their login disabled.
            You can restore them later from the database.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(o) => {
          setResetOpen(o);
          if (!o) setResetResult(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset login password?</DialogTitle>
          </DialogHeader>
          {!resetResult ? (
            <p className="text-sm text-muted-foreground">
              Generate a new temporary password for{' '}
              <strong className="text-foreground">{teacher.name}</strong>.
              Share it securely — they should change it after first login.
            </p>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="text-sm">
                Email: <strong>{resetResult.email}</strong>
              </div>
              <div className="text-sm">
                New password:{' '}
                <code className="rounded bg-background px-2 py-0.5 font-mono">
                  {resetResult.temporary_password}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            {!resetResult ? (
              <>
                <Button variant="outline" onClick={() => setResetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>Reset password</Button>
              </>
            ) : (
              <Button onClick={() => setResetOpen(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function DetailsCard({
  title,
  rows,
}: {
  title: string;
  rows: [label: string, value: string | number | null | undefined][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <h3 className="text-base font-semibold">{title}</h3>
        </CardHeading>
        <CardToolbar />
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b pb-2 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground text-end">
                {value === null || value === undefined || value === ''
                  ? '—'
                  : value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function cap(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

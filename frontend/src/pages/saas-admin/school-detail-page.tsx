import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  KeyRound,
  LogIn,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { impersonation } from '@/auth/impersonation';
import {
  SchoolDetail,
  SUBSCRIPTION_BADGE,
  SubscriptionStatus,
  saasAdminApi,
} from '@/services/saas-admin';
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
} from '@/components/ui/card';
import {
  Dialog,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const schoolId = Number(id);
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function refresh() {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await saasAdminApi.showSchool(schoolId);
      setData(res);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not load school.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  function open() {
    if (!data) return;
    impersonation.start({
      id: data.data.id,
      name: data.data.name,
      slug: data.data.slug,
    });
    navigate('/');
    window.location.reload();
  }

  async function archive() {
    if (!data) return;
    try {
      await saasAdminApi.deleteSchool(data.data.id);
      toast.success(`${data.data.name} archived.`);
      navigate('/admin/schools');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not archive school.',
      );
    }
  }

  if (!data) {
    return (
      <Container>
        <div className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : 'School not found.'}
        </div>
      </Container>
    );
  }

  const school = data.data;
  const badge = SUBSCRIPTION_BADGE[school.subscription_status];

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title={
              <span className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                {school.name}
                <Badge
                  variant="outline"
                  className={`ms-1 text-xs ${badge.className}`}
                >
                  {badge.label}
                </Badge>
              </span>
            }
            description={`${school.slug} · ${school.email}`}
          />
          <ToolbarActions>
            <Button variant="outline" asChild>
              <Link to="/admin/schools">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <Button onClick={open}>
              <LogIn className="size-4" />
              Open as admin
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:grid-cols-4 mb-5">
          <StatCard label="Students" value={data.stats.students} />
          <StatCard label="Teachers" value={data.stats.teachers} />
          <StatCard label="Classes" value={data.stats.classes} />
          <StatCard label="Admins" value={data.stats.admins} />
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-4">
            <ProfileTab data={data} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="admins" className="pt-4">
            <AdminsTab data={data} onChanged={refresh} />
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <ActivityTab data={data} />
          </TabsContent>

          <TabsContent value="danger" className="pt-4">
            <DangerTab
              data={data}
              onArchive={() => setArchiveOpen(true)}
              onChanged={refresh}
            />
          </TabsContent>
        </Tabs>
      </Container>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {school.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The school is soft-deleted: data is preserved but the school is
            removed from the directory and its users can no longer log in.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={archive}>
              <Trash2 className="size-4" />
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile tab                                                                */
/* -------------------------------------------------------------------------- */

function ProfileTab({
  data,
  onSaved,
}: {
  data: SchoolDetail;
  onSaved(): void;
}) {
  const s = data.data;
  const [form, setForm] = useState({
    name: s.name,
    slug: s.slug,
    email: s.email,
    phone: s.phone ?? '',
    motto: s.motto ?? '',
    address: s.address ?? '',
    city: s.city ?? '',
    state: s.state ?? '',
    subscription_status: s.subscription_status as SubscriptionStatus,
    subscription_expires_at: s.subscription_expires_at ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    try {
      setSaving(true);
      await saasAdminApi.updateSchool(s.id, {
        ...form,
        subscription_expires_at: form.subscription_expires_at || null,
      });
      toast.success('School updated.');
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not update school.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium">School profile</span>
        </CardHeading>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Slug (URL)">
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Motto">
          <Input
            value={form.motto}
            onChange={(e) => setForm({ ...form, motto: e.target.value })}
          />
        </Field>
        <Field label="Subscription">
          <Select
            value={form.subscription_status}
            onValueChange={(v) =>
              setForm({ ...form, subscription_status: v as SubscriptionStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subscription expires">
          <Input
            type="date"
            value={form.subscription_expires_at?.slice(0, 10) ?? ''}
            onChange={(e) =>
              setForm({ ...form, subscription_expires_at: e.target.value })
            }
          />
        </Field>
        <Field label="Address" className="md:col-span-2">
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <Field label="City">
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </Field>
        <Field label="State">
          <Input
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
        </Field>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save} disabled={saving}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Admins tab                                                                 */
/* -------------------------------------------------------------------------- */

function AdminsTab({
  data,
  onChanged,
}: {
  data: SchoolDetail;
  onChanged(): void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [tempCreds, setTempCreds] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function resetPassword(adminId: number, name: string) {
    if (!confirm(`Reset password for ${name}?`)) return;
    try {
      const res = await saasAdminApi.resetAdminPassword(data.data.id, adminId);
      setTempCreds({ email: res.data.email, password: res.temporary_password });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not reset password.',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium">School admins</span>
        </CardHeading>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          Add admin
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {data.admins.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No admins yet. The first admin is created at school registration.
          </div>
        ) : (
          <ul className="divide-y">
            {data.admins.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.email}
                    {a.phone ? ` · ${a.phone}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!a.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetPassword(a.id, a.name)}
                  >
                    <KeyRound className="size-3.5" />
                    Reset password
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schoolId={data.data.id}
        onCreated={(creds) => {
          setTempCreds(creds);
          onChanged();
        }}
      />

      <Dialog open={Boolean(tempCreds)} onOpenChange={() => setTempCreds(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary credentials</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share these with the user. They won't be shown again.
          </p>
          <div className="space-y-2 rounded-md bg-muted p-3 font-mono text-sm">
            <div>
              <span className="text-muted-foreground">Email: </span>
              {tempCreds?.email}
            </div>
            <div>
              <span className="text-muted-foreground">Password: </span>
              {tempCreds?.password}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateAdminDialog({
  open,
  onOpenChange,
  schoolId,
  onCreated,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  schoolId: number;
  onCreated(creds: { email: string; password: string }): void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    try {
      setSaving(true);
      const res = await saasAdminApi.createAdmin(schoolId, form);
      onCreated({ email: res.data.email, password: res.temporary_password });
      onOpenChange(false);
      setForm({ name: '', email: '', phone: '' });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not create admin.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add school admin</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Full name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone (optional)">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            <Plus className="size-4" />
            Create admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity / Danger tabs                                                     */
/* -------------------------------------------------------------------------- */

function ActivityTab({ data }: { data: SchoolDetail }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardHeading>
            <span className="font-medium">Billing</span>
          </CardHeading>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="Total billed">
            ₦{data.stats.total_billed.toLocaleString()}
          </Row>
          <Row label="Total collected">
            ₦{data.stats.total_collected.toLocaleString()}
          </Row>
          <Row label="Outstanding">
            ₦
            {Math.max(
              0,
              data.stats.total_billed - data.stats.total_collected,
            ).toLocaleString()}
          </Row>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardHeading>
            <span className="font-medium">Open the school</span>
          </CardHeading>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the <strong>Open as admin</strong> button at the top of the page
          to enter this school's modules. Every action you take will be scoped
          to this tenant until you exit impersonation.
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function DangerTab({
  data,
  onArchive,
  onChanged,
}: {
  data: SchoolDetail;
  onArchive(): void;
  onChanged(): void;
}) {
  async function setStatus(status: SubscriptionStatus) {
    try {
      await saasAdminApi.setStatus(data.data.id, status);
      toast.success(`${data.data.name} marked as ${status}.`);
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not update status.',
      );
    }
  }

  const isActive = data.data.subscription_status === 'active';

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardHeading>
          <span className="font-medium text-destructive">Danger Zone</span>
        </CardHeading>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DangerRow
          title={isActive ? 'Suspend school' : 'Activate school'}
          description={
            isActive
              ? 'Users will no longer be able to log in until reactivated.'
              : 'Restore access for this school and its users.'
          }
        >
          {isActive ? (
            <Button
              variant="outline"
              onClick={() => setStatus('suspended')}
            >
              <PauseCircle className="size-4" />
              Suspend
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStatus('active')}
            >
              <PlayCircle className="size-4" />
              Activate
            </Button>
          )}
        </DangerRow>
        <DangerRow
          title="Archive school"
          description="Soft-delete this school. Data is preserved but the school is hidden everywhere."
        >
          <Button variant="destructive" onClick={onArchive}>
            <Trash2 className="size-4" />
            Archive
          </Button>
        </DangerRow>
      </CardContent>
    </Card>
  );
}

function DangerRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {children}
    </div>
  );
}

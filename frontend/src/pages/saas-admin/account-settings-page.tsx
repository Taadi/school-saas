import { Fragment, useEffect, useState } from 'react';
import { Lock, Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { AccountUser, accountApi } from '@/services/account';
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
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AccountSettingsPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    accountApi
      .show()
      .then((r) => setUser(r.user))
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load profile.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Account Settings"
            description="Manage your profile and password."
          />
        </Toolbar>
      </Container>

      <Container>
        <Tabs defaultValue="profile" className="max-w-3xl">
          <TabsList>
            <TabsTrigger value="profile">
              <UserCircle className="size-3.5 me-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="size-3.5 me-1.5" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-4">
            <ProfileForm user={user} disabled={loading} onSaved={setUser} />
          </TabsContent>
          <TabsContent value="security" className="pt-4">
            <PasswordForm />
          </TabsContent>
        </Tabs>
      </Container>
    </Fragment>
  );
}

function ProfileForm({
  user,
  disabled,
  onSaved,
}: {
  user: AccountUser | null;
  disabled: boolean;
  onSaved(u: AccountUser): void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
      });
    }
  }, [user]);

  async function save() {
    try {
      setSaving(true);
      const res = await accountApi.update(form);
      onSaved(res.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not update profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium">Your profile</span>
        </CardHeading>
        {user && (
          <Badge variant="outline" className="text-xs">
            {user.role.replace('_', ' ')}
            {user.school?.name ? ` · ${user.school.name}` : ''}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Full name</Label>
          <Input
            disabled={disabled}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            disabled={disabled}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Phone</Label>
          <Input
            disabled={disabled}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || disabled}>
            <Save className="size-4" />
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (form.password !== form.password_confirmation) {
      toast.error('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    try {
      setSaving(true);
      await accountApi.changePassword(form);
      toast.success('Password updated.');
      setForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not change password.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium">Change password</span>
        </CardHeading>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Current password</Label>
          <Input
            type="password"
            value={form.current_password}
            onChange={(e) =>
              setForm({ ...form, current_password: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>New password</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Confirm new password</Label>
          <Input
            type="password"
            value={form.password_confirmation}
            onChange={(e) =>
              setForm({ ...form, password_confirmation: e.target.value })
            }
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Lock className="size-4" />
            Update password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

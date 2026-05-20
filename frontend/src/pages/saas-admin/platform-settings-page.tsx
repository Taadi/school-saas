import { Fragment, useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { PlatformSettings, saasAdminApi } from '@/services/saas-admin';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function PlatformSettingsPage() {
  const [form, setForm] = useState<PlatformSettings>({
    platform_name: '',
    support_email: '',
    default_trial_days: 14,
    maintenance_message: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    saasAdminApi
      .getSettings()
      .then((r) =>
        setForm({
          platform_name: r.data.platform_name ?? '',
          support_email: r.data.support_email ?? '',
          default_trial_days: r.data.default_trial_days ?? 14,
          maintenance_message: r.data.maintenance_message ?? '',
        }),
      )
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load settings.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    try {
      setSaving(true);
      await saasAdminApi.updateSettings({
        platform_name: form.platform_name?.trim() || null,
        support_email: form.support_email?.trim() || null,
        default_trial_days: Number(form.default_trial_days) || null,
        maintenance_message: form.maintenance_message?.trim() || null,
      });
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not save settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Platform Settings"
            description="Defaults and branding applied across all tenants."
          />
        </Toolbar>
      </Container>

      <Container>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardHeading>
              <span className="font-medium flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" />
                General
              </span>
            </CardHeading>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Platform name</Label>
              <Input
                placeholder="School SaaS"
                disabled={loading}
                value={form.platform_name ?? ''}
                onChange={(e) =>
                  setForm({ ...form, platform_name: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Shown on emails and the public school registration form.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Support email</Label>
              <Input
                type="email"
                placeholder="help@your-platform.com"
                disabled={loading}
                value={form.support_email ?? ''}
                onChange={(e) =>
                  setForm({ ...form, support_email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Default trial length (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                disabled={loading}
                value={form.default_trial_days ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_trial_days: Number(e.target.value) || null,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Applied when a new school registers.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Maintenance message</Label>
              <Textarea
                rows={3}
                placeholder="Leave blank for normal operation."
                disabled={loading}
                value={form.maintenance_message ?? ''}
                onChange={(e) =>
                  setForm({ ...form, maintenance_message: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                When set, a banner is shown to all users.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={saving || loading}>
                <Save className="size-4" />
                Save settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}

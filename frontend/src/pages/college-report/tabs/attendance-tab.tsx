import { useEffect, useState } from 'react';
import { CalendarCheck, LoaderCircleIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import { ReportSettings } from '@/types/school';
import { ReportConfigBundle } from '../use-report-config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type A = ReportSettings['attendance'];

/**
 * Tab 8 — Attendance setup. Toggles whether attendance shows on the report
 * card and how the percentage is computed. Actual attendance entry will live
 * in its own module later; this tab only configures presentation.
 */
export function AttendanceTab({ config }: { config: ReportConfigBundle }) {
  const [att, setAtt] = useState<A>({
    enabled: true,
    method: 'days_present_over_total',
    show_percentage: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) setAtt(config.settings.attendance);
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ attendance: att });
      toast.success('Attendance settings saved.');
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium flex items-center gap-2">
            <CalendarCheck className="size-4 text-muted-foreground" />
            Attendance
          </span>
        </CardHeading>
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable attendance section</Label>
            <p className="text-xs text-muted-foreground">
              Adds a present/absent summary to every report card.
            </p>
          </div>
          <Switch
            checked={att.enabled}
            onCheckedChange={(v) => setAtt({ ...att, enabled: v })}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Calculation method</Label>
          <Select
            value={att.method}
            onValueChange={(v) => setAtt({ ...att, method: v as A['method'] })}
            disabled={!att.enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days_present_over_total">
                Days present / total school days
              </SelectItem>
              <SelectItem value="manual">Manually entered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show percentage</Label>
            <p className="text-xs text-muted-foreground">
              Adds a "85%" badge alongside the days count.
            </p>
          </div>
          <Switch
            disabled={!att.enabled}
            checked={att.show_percentage}
            onCheckedChange={(v) => setAtt({ ...att, show_percentage: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

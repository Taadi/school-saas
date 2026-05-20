import { useEffect, useState } from 'react';
import { LoaderCircleIcon, Palette, Save } from 'lucide-react';
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

type P = ReportSettings['presentation'];

const TOGGLE_FIELDS: { key: keyof P; label: string; help?: string }[] = [
  { key: 'show_position', label: 'Show class position' },
  { key: 'show_class_average', label: 'Show class average' },
  { key: 'show_class_highest', label: 'Show class highest score' },
  { key: 'show_class_lowest', label: 'Show class lowest score' },
  { key: 'show_grade_legend', label: 'Show grading legend' },
  { key: 'show_subject_grouping', label: 'Group subjects on report card' },
  { key: 'show_attendance', label: 'Show attendance section' },
  { key: 'show_non_assessment', label: 'Show non-assessment ratings' },
  { key: 'show_signatures', label: 'Show signature lines' },
];

/**
 * Tab 11 — Result presentation. Pure UI toggles; the report-card renderer
 * reads these flags to decide what to render. Layout choice triggers a fully
 * different template.
 */
export function PresentationTab({ config }: { config: ReportConfigBundle }) {
  const [p, setP] = useState<P>({
    layout: 'classic',
    show_position: true,
    show_class_average: true,
    show_class_highest: true,
    show_class_lowest: false,
    show_grade_legend: true,
    show_subject_grouping: true,
    show_attendance: true,
    show_non_assessment: true,
    show_signatures: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) setP(config.settings.presentation);
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ presentation: p });
      toast.success('Presentation updated.');
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
            <Palette className="size-4 text-muted-foreground" />
            Report card presentation
          </span>
        </CardHeading>
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Layout style</Label>
          <Select
            value={p.layout}
            onValueChange={(v) => setP({ ...p, layout: v as P['layout'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic — single page, dense</SelectItem>
              <SelectItem value="modern">Modern — boxed, branded header</SelectItem>
              <SelectItem value="compact">
                Compact — fits multiple terms per page
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {TOGGLE_FIELDS.map((field) => (
            <div
              key={field.key}
              className="flex items-center justify-between border rounded-md px-3 py-2"
            >
              <div>
                <Label>{field.label}</Label>
                {field.help && (
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                )}
              </div>
              <Switch
                checked={Boolean(p[field.key])}
                onCheckedChange={(v) => setP({ ...p, [field.key]: v })}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

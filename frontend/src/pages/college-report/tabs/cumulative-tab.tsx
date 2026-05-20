import { useEffect, useState } from 'react';
import { LoaderCircleIcon, Save, Sigma } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type C = ReportSettings['cumulative'];

/**
 * Tab 12 — Assessment cumulative setup. Decides how multi-term results combine
 * on a final report card: per-term only, simple cumulative average, or weighted
 * average (e.g. final term weighted higher). The pass-mark is also defined
 * here so the renderer can highlight failing subjects.
 */
export function CumulativeTab({ config }: { config: ReportConfigBundle }) {
  const [c, setC] = useState<C>({
    mode: 'per_term',
    weights: { first: 1, second: 1, third: 1 },
    pass_mark: 40,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) setC(config.settings.cumulative);
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ cumulative: c });
      toast.success('Cumulative rules saved.');
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
            <Sigma className="size-4 text-muted-foreground" />
            Cumulative rules
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
          <Label>Cumulative mode</Label>
          <Select
            value={c.mode}
            onValueChange={(v) => setC({ ...c, mode: v as C['mode'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_term">
                Per-term only — no carry-over
              </SelectItem>
              <SelectItem value="cumulative_average">
                Cumulative average — average of completed terms
              </SelectItem>
              <SelectItem value="weighted_average">
                Weighted average — uses term weights below
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {c.mode === 'weighted_average' && (
          <div className="grid grid-cols-3 gap-3">
            <WeightField
              label="First term weight"
              value={c.weights.first}
              onChange={(first) =>
                setC({ ...c, weights: { ...c.weights, first } })
              }
            />
            <WeightField
              label="Second term weight"
              value={c.weights.second}
              onChange={(second) =>
                setC({ ...c, weights: { ...c.weights, second } })
              }
            />
            <WeightField
              label="Third term weight"
              value={c.weights.third}
              onChange={(third) =>
                setC({ ...c, weights: { ...c.weights, third } })
              }
            />
          </div>
        )}

        <div className="grid gap-1.5 max-w-xs">
          <Label>Pass mark</Label>
          <Input
            type="number"
            value={c.pass_mark}
            onChange={(e) => setC({ ...c, pass_mark: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">
            Subjects scoring below this threshold are flagged on the report card.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function WeightField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { LoaderCircleIcon, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
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

type NA = ReportSettings['non_assessment'];

/**
 * Tab 5 — Non-assessment ratings (affective domain). Defines what categories
 * teachers grade pupils on (Conduct, Punctuality, …) and the symbolic scale
 * (A–E or Excellent → Poor). Doesn't affect totals, only the report card.
 */
export function NonAssessmentTab({ config }: { config: ReportConfigBundle }) {
  const [na, setNA] = useState<NA>({ categories: [], scale: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) {
      setNA(config.settings.non_assessment);
    }
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ non_assessment: na });
      toast.success('Non-assessment ratings updated.');
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          These show up as a separate section on the report card with a rating
          per pupil per category.
        </p>
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardHeading>
            <span className="font-medium flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              Categories
            </span>
          </CardHeading>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setNA({
                ...na,
                categories: [
                  ...na.categories,
                  { code: `cat_${na.categories.length + 1}`, label: 'New category' },
                ],
              })
            }
          >
            <Plus className="size-3.5" />
            Add category
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {na.categories.map((c, idx) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2" key={idx}>
              <div className="grid gap-1.5">
                <Label className="text-xs">Code</Label>
                <Input
                  value={c.code}
                  onChange={(e) => {
                    const cats = [...na.categories];
                    cats[idx] = { ...c, code: e.target.value.toLowerCase() };
                    setNA({ ...na, categories: cats });
                  }}
                  className="font-mono"
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={c.label}
                    onChange={(e) => {
                      const cats = [...na.categories];
                      cats[idx] = { ...c, label: e.target.value };
                      setNA({ ...na, categories: cats });
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() =>
                    setNA({
                      ...na,
                      categories: na.categories.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardHeading>
            <span className="font-medium">Rating scale</span>
          </CardHeading>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setNA({
                ...na,
                scale: [
                  ...na.scale,
                  { code: String.fromCharCode(65 + na.scale.length), label: '' },
                ],
              })
            }
          >
            <Plus className="size-3.5" />
            Add level
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {na.scale.map((s, idx) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2" key={idx}>
              <div className="grid gap-1.5">
                <Label className="text-xs">Code</Label>
                <Input
                  value={s.code}
                  onChange={(e) => {
                    const scale = [...na.scale];
                    scale[idx] = { ...s, code: e.target.value.toUpperCase() };
                    setNA({ ...na, scale });
                  }}
                  maxLength={4}
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={s.label}
                    onChange={(e) => {
                      const scale = [...na.scale];
                      scale[idx] = { ...s, label: e.target.value };
                      setNA({ ...na, scale });
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() =>
                    setNA({
                      ...na,
                      scale: na.scale.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

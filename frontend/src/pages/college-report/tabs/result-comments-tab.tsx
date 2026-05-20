import { useEffect, useState } from 'react';
import { LoaderCircleIcon, MessageSquare, Plus, Save, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

type Bands = ReportSettings['result_comments'];

/**
 * Tab 4 — Result default comments. A bank of teacher-friendly remarks per
 * grade range. The report card renderer can pluck any of these as the default
 * subject remark when teachers don't enter one manually.
 */
export function ResultCommentsTab({ config }: { config: ReportConfigBundle }) {
  const [bands, setBands] = useState<Bands>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) setBands(config.settings.result_comments ?? []);
  }, [config.settings]);

  function updateBand(idx: number, patch: Partial<Bands[number]>) {
    const next = [...bands];
    next[idx] = { ...next[idx], ...patch };
    setBands(next);
  }

  function updateComment(idx: number, cidx: number, value: string) {
    const next = [...bands];
    const comments = [...next[idx].comments];
    comments[cidx] = value;
    next[idx] = { ...next[idx], comments };
    setBands(next);
  }

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ result_comments: bands });
      toast.success('Comment bank updated.');
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not save comments.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Suggested teacher remarks per grade range. Used as drop-down hints in
          Score Entry and as fallback remarks on the report card.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setBands([...bands, { min: 0, max: 100, comments: [''] }])
            }
          >
            <Plus className="size-3.5" />
            Add band
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {bands.map((b, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Band {idx + 1}
                </span>
                <span className="text-xs text-muted-foreground ms-3">
                  {b.min}–{b.max} score range
                </span>
              </CardHeading>
              <Button
                variant="ghost"
                mode="icon"
                size="sm"
                onClick={() => setBands(bands.filter((_, i) => i !== idx))}
                title="Remove band"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Min score</Label>
                  <Input
                    type="number"
                    value={b.min}
                    onChange={(e) =>
                      updateBand(idx, { min: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Max score</Label>
                  <Input
                    type="number"
                    value={b.max}
                    onChange={(e) =>
                      updateBand(idx, { max: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Comments</Label>
                {b.comments.map((c, cidx) => (
                  <div className="flex gap-2" key={cidx}>
                    <Textarea
                      rows={2}
                      value={c}
                      onChange={(e) => updateComment(idx, cidx, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      onClick={() =>
                        updateBand(idx, {
                          comments: b.comments.filter((_, i) => i !== cidx),
                        })
                      }
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    updateBand(idx, { comments: [...b.comments, ''] })
                  }
                >
                  <Plus className="size-3.5" />
                  Add comment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

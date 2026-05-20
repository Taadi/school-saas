import { useEffect, useState } from 'react';
import { LoaderCircleIcon, MessageSquareText, Plus, Save, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

type Block = ReportSettings['non_assessment_comments'];

/**
 * Tab 6 — Non-assessment comments. Two banks: form-teacher and head-teacher.
 * They power the dropdowns at the bottom of the report card so teachers don't
 * have to start each remark from scratch.
 */
export function NonAssessmentCommentsTab({
  config,
}: {
  config: ReportConfigBundle;
}) {
  const [block, setBlock] = useState<Block>({
    form_teacher: [],
    head_teacher: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.settings) setBlock(config.settings.non_assessment_comments);
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({ non_assessment_comments: block });
      toast.success('Comments saved.');
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save
        </Button>
      </div>

      <CommentBlock
        title="Form teacher comments"
        items={block.form_teacher}
        onChange={(form_teacher) => setBlock({ ...block, form_teacher })}
      />
      <CommentBlock
        title="Head teacher comments"
        items={block.head_teacher}
        onChange={(head_teacher) => setBlock({ ...block, head_teacher })}
      />
    </div>
  );
}

function CommentBlock({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium flex items-center gap-2">
            <MessageSquareText className="size-4 text-muted-foreground" />
            {title}
          </span>
        </CardHeading>
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((c, idx) => (
          <div className="flex gap-2" key={idx}>
            <Textarea
              rows={2}
              value={c}
              className="flex-1"
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              variant="ghost"
              mode="icon"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No saved comments — teachers will type freeform on the report card.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

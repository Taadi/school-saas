import { useState } from 'react';
import { CalendarRange, LoaderCircleIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import { TERM_LABELS } from '@/services/academic';
import { ReportConfigBundle } from '../use-report-config';
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

/**
 * Tab 7 — Term begin/end dates and result deadlines. Teacher score-entry past
 * the entry deadline is blocked at the API layer (admins can still override).
 */
export function TermDatesTab({ config }: { config: ReportConfigBundle }) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function saveTerm(
    termId: number,
    payload: {
      start_date?: string | null;
      end_date?: string | null;
      result_entry_deadline?: string | null;
      result_approval_deadline?: string | null;
    },
  ) {
    try {
      setBusyId(termId);
      await collegeReportApi.updateTerm(termId, payload);
      toast.success('Term dates saved.');
      await config.refreshSection('sessions');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save term.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {config.sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader>
            <CardHeading>
              <span className="font-medium flex items-center gap-2">
                <CalendarRange className="size-4 text-muted-foreground" />
                {session.name}
                {session.is_current && (
                  <Badge variant="primary" appearance="light" size="sm">
                    Current
                  </Badge>
                )}
              </span>
            </CardHeading>
          </CardHeader>
          <CardContent className="grid gap-4">
            {(session.terms ?? []).map((t) => (
              <TermRow
                key={t.id}
                term={t}
                busy={busyId === t.id}
                onSave={(payload) => saveTerm(t.id, payload)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TermRow({
  term,
  busy,
  onSave,
}: {
  term: {
    id: number;
    name: 'first' | 'second' | 'third';
    start_date: string | null;
    end_date: string | null;
    result_entry_deadline?: string | null;
    result_approval_deadline?: string | null;
  };
  busy: boolean;
  onSave: (payload: {
    start_date?: string | null;
    end_date?: string | null;
    result_entry_deadline?: string | null;
    result_approval_deadline?: string | null;
  }) => void | Promise<void>;
}) {
  const [start, setStart] = useState(term.start_date ?? '');
  const [end, setEnd] = useState(term.end_date ?? '');
  const [entryDeadline, setEntryDeadline] = useState(
    term.result_entry_deadline ?? '',
  );
  const [approvalDeadline, setApprovalDeadline] = useState(
    term.result_approval_deadline ?? '',
  );

  return (
    <div className="border rounded-md p-3">
      <div className="font-medium text-sm mb-3">{TERM_LABELS[term.name]}</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <DateField label="Starts" value={start} onChange={setStart} />
        <DateField label="Ends" value={end} onChange={setEnd} />
        <DateField
          label="Entry deadline"
          value={entryDeadline}
          onChange={setEntryDeadline}
        />
        <DateField
          label="Approval deadline"
          value={approvalDeadline}
          onChange={setApprovalDeadline}
        />
      </div>
      <div className="flex justify-end mt-3">
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            onSave({
              start_date: start || null,
              end_date: end || null,
              result_entry_deadline: entryDeadline || null,
              result_approval_deadline: approvalDeadline || null,
            })
          }
        >
          {busy && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save term
        </Button>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

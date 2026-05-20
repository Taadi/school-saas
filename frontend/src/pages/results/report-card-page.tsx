import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircleIcon, Printer } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { academicSessionsApi } from '@/services/academic';
import { resultsApi } from '@/services/results';
import { AcademicSession, ReportCard } from '@/types/school';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-zinc-500/15 text-zinc-700',
  submitted: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-green-500/15 text-green-700',
};

export function ReportCardPage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const studentId = Number(id);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [termId, setTermId] = useState<string>(params.get('term_id') ?? '');
  const subTermParam = params.get('sub_term_id');
  const [report, setReport] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    academicSessionsApi.list().then((r) => {
      setSessions(r.data);
      if (!termId) {
        const cur = r.data.find((s) => s.is_current);
        const t = cur?.terms?.find((t) => t.is_current) ?? cur?.terms?.[0];
        if (t) {
          setTermId(String(t.id));
          setParams({ term_id: String(t.id) }, { replace: true });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!studentId || !termId) return;
    setLoading(true);
    resultsApi
      .reportCard(
        studentId,
        Number(termId),
        subTermParam ? Number(subTermParam) : null,
      )
      .then(setReport)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Could not load report.';
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [studentId, termId, subTermParam]);

  const allTermOptions = useMemo(() => {
    return sessions.flatMap((s) =>
      (s.terms ?? []).map((t) => ({
        id: t.id,
        label: `${s.name} · ${capitalize(t.name)} term`,
      })),
    );
  }, [sessions]);

  function changeTerm(v: string) {
    setTermId(v);
    setParams({ term_id: v }, { replace: true });
  }

  return (
    <Fragment>
      {/* Toolbar — hidden on print */}
      <Container>
        <div className="flex items-center justify-between mb-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/results">
                <ArrowLeft className="size-4" />
                Back to results
              </Link>
            </Button>
            <Select value={termId || undefined} onValueChange={changeTerm}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pick a term" />
              </SelectTrigger>
              <SelectContent>
                {allTermOptions.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-10 text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
          </div>
        )}

        {!loading && report && (
          <div className="report-card mx-auto max-w-3xl bg-white text-zinc-900 dark:bg-white shadow-md rounded-lg overflow-hidden border print:shadow-none print:border-0 print:max-w-full">
            {/* Header */}
            <div className="bg-zinc-900 text-white px-6 py-5 print:bg-zinc-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-widest opacity-70">
                    {report.report_type === 'sub_term' && report.sub_term
                      ? `${report.sub_term.name} Report`
                      : 'Student Report Card'}
                  </div>
                  <div className="text-2xl font-semibold">
                    {report.student.name}
                  </div>
                  <div className="text-sm opacity-80 font-mono">
                    {report.student.admission_number}
                  </div>
                </div>
                <div className="text-end text-sm">
                  <div>
                    <span className="opacity-70">Class:</span>{' '}
                    <span className="font-semibold">
                      {report.student.class ?? '—'}
                      {report.student.arm ? ` ${report.student.arm}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70">Session:</span>{' '}
                    <span className="font-semibold">{report.session?.name}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Term:</span>{' '}
                    <span className="font-semibold capitalize">
                      {report.term?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b">
              <Tile label="Subjects" value={report.summary.subjects_offered} />
              <Tile label="Total" value={report.summary.total_score} />
              <Tile
                label="Average"
                value={`${report.summary.average} (${report.summary.overall_grade})`}
              />
              <Tile
                label="Position"
                value={
                  report.summary.position
                    ? `${report.summary.position} of ${report.summary.class_size}`
                    : '—'
                }
              />
            </div>

            {/* Subject table */}
            <div className="px-6 py-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-zinc-600">
                    <th className="text-start py-2 font-medium">Subject</th>
                    <th className="text-end py-2 font-medium">CA1</th>
                    <th className="text-end py-2 font-medium">CA2</th>
                    <th className="text-end py-2 font-medium">Mid</th>
                    <th className="text-end py-2 font-medium">Exam</th>
                    <th className="text-end py-2 font-medium">Total</th>
                    <th className="text-center py-2 font-medium">Grade</th>
                    <th className="text-start py-2 font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((s) => (
                    <tr key={s.subject_id} className="border-b">
                      <td className="py-2">
                        <div className="font-medium text-zinc-900">{s.subject_name}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {s.subject_code}
                        </div>
                      </td>
                      <td className="text-end">{s.ca1 ?? '—'}</td>
                      <td className="text-end">{s.ca2 ?? '—'}</td>
                      <td className="text-end">{s.midterm ?? '—'}</td>
                      <td className="text-end">{s.exam ?? '—'}</td>
                      <td className="text-end font-semibold">{s.total}</td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-900 text-xs font-bold">
                          {s.grade ?? '—'}
                        </span>
                      </td>
                      <td className="py-2 text-zinc-600">{s.remark ?? '—'}</td>
                    </tr>
                  ))}
                  {report.subjects.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-zinc-500">
                        No results recorded for this term yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Grading scale + signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 py-4 border-t bg-zinc-50">
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                  Grading Scale
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {report.grading_scale.map((g) => (
                    <div key={g.grade} className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-bold">
                        {g.grade}
                      </span>
                      <span className="text-zinc-700">
                        {g.min}+ · {g.remark}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                  Approval status
                </div>
                {report.summary.all_approved ? (
                  <Badge className="bg-green-500/15 text-green-700 border-0">
                    Officially Approved
                  </Badge>
                ) : (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE['submitted']}`}
                  >
                    Pending school admin approval
                  </span>
                )}
                <div className="mt-8 grid grid-cols-2 gap-6 text-xs text-zinc-600">
                  <div>
                    <div className="border-t border-zinc-400 pt-1">
                      Class Teacher
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-zinc-400 pt-1">
                      Principal / Head Teacher
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>

      {/* Print stylesheet — hide app chrome, keep only the report card */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          aside, header, .toolbar, [data-sidebar], .print\\:hidden { display: none !important; }
          .report-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </Fragment>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

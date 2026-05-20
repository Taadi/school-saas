import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  LoaderCircleIcon,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { TERM_LABELS, academicSessionsApi } from '@/services/academic';
import { invoicesApi, formatNaira, INVOICE_STATUS_LABEL } from '@/services/fees';
import { AcademicSession, FeeSummary, TermName } from '@/types/school';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardToolbar,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FeesDashboardPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [sessionId, setSessionId] = useState<number | 'all'>('all');
  const [termId, setTermId] = useState<number | 'all'>('all');
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    academicSessionsApi.list().then((r) => {
      setSessions(r.data);
      const current = r.data.find((s) => s.is_current) ?? r.data[0];
      if (current) {
        setSessionId(current.id);
        const term = current.terms?.find((t) => t.is_current);
        if (term) setTermId(term.id);
      }
    });
  }, []);

  const session = useMemo(
    () =>
      sessionId === 'all'
        ? null
        : sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  const fetchSummary = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const r = await invoicesApi.summary({
          academic_session_id: sessionId === 'all' ? undefined : sessionId,
          term_id: termId === 'all' ? undefined : termId,
        });
        setSummary(r);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load summary.',
        );
      } finally {
        setLoading(false);
      }
    },
    [sessionId, termId],
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Fees Dashboard"
            description="Real-time view of school fee collections, outstanding balances, and recent payments."
          />
          <ToolbarActions>
            <Select
              value={String(sessionId)}
              onValueChange={(v) => {
                setSessionId(v === 'all' ? 'all' : Number(v));
                setTermId('all');
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(termId)}
              onValueChange={(v) => setTermId(v === 'all' ? 'all' : Number(v))}
              disabled={!session}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terms</SelectItem>
                {(session?.terms ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {TERM_LABELS[t.name as TermName]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        {loading && !summary ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
          </div>
        ) : !summary ? (
          <p className="text-muted-foreground">No data.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <SummaryTile
                label="Expected"
                value={formatNaira(summary.totals.expected)}
                icon={<BadgeDollarSign className="size-5" />}
                color="text-foreground"
              />
              <SummaryTile
                label="Collected"
                value={formatNaira(summary.totals.collected)}
                icon={<CheckCircle2 className="size-5" />}
                color="text-success"
              />
              <SummaryTile
                label="Outstanding"
                value={formatNaira(summary.totals.outstanding)}
                icon={<AlertTriangle className="size-5" />}
                color="text-destructive"
              />
              <SummaryTile
                label="Invoices"
                value={String(summary.totals.invoice_count)}
                icon={<FileText className="size-5" />}
                color="text-primary"
              />
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardHeading>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Collection Rate</h3>
                  </div>
                </CardHeading>
                <CardToolbar>
                  <Badge variant="secondary">
                    {summary.totals.collection_rate}%
                  </Badge>
                </CardToolbar>
              </CardHeader>
              <CardContent>
                <Progress value={summary.totals.collection_rate} />
                <div className="flex flex-wrap gap-3 mt-4">
                  {summary.by_status.map((s) => (
                    <Badge
                      key={s.status}
                      variant="outline"
                      className="text-xs px-3 py-1"
                    >
                      <span className="capitalize text-muted-foreground me-2">
                        {INVOICE_STATUS_LABEL[s.status]}:
                      </span>
                      <span className="font-semibold">{s.count}</span>
                      <span className="text-muted-foreground ms-2">
                        · {formatNaira(s.total)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardHeading>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive" />
                      <h3 className="text-base font-semibold">Top Defaulters</h3>
                    </div>
                  </CardHeading>
                  <CardToolbar>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/fees/invoices?status=pending">
                        View all
                        <ExternalLink className="size-3.5 ms-1" />
                      </Link>
                    </Button>
                  </CardToolbar>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-start">Student</th>
                          <th className="px-4 py-2 text-start">Class</th>
                          <th className="px-4 py-2 text-end">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.defaulters.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-6 text-center text-muted-foreground"
                            >
                              No outstanding balances. Great job!
                            </td>
                          </tr>
                        ) : (
                          summary.defaulters.map((inv) => (
                            <tr
                              key={inv.id}
                              className="border-t border-border hover:bg-muted/30"
                            >
                              <td className="px-4 py-2">
                                <Link
                                  to={`/fees/invoices/${inv.id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {inv.student?.user?.name ?? '—'}
                                </Link>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {inv.student?.admission_number}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {inv.school_class?.name}
                                {inv.arm ? ` ${inv.arm.name}` : ''}
                              </td>
                              <td className="px-4 py-2 text-end text-destructive font-medium">
                                {formatNaira(inv.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardHeading>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="size-4 text-success" />
                      <h3 className="text-base font-semibold">
                        Recent Payments
                      </h3>
                    </div>
                  </CardHeading>
                  <CardToolbar />
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-start">Student</th>
                          <th className="px-4 py-2 text-start">Date</th>
                          <th className="px-4 py-2 text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.recent_payments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-6 text-center text-muted-foreground"
                            >
                              No payments yet.
                            </td>
                          </tr>
                        ) : (
                          summary.recent_payments.map((p) => (
                            <tr
                              key={p.id}
                              className="border-t border-border hover:bg-muted/30"
                            >
                              <td className="px-4 py-2">
                                <Link
                                  to={`/fees/invoices/${p.invoice_id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {p.invoice?.student?.user?.name ?? '—'}
                                </Link>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {p.invoice?.invoice_number}
                                </div>
                              </td>
                              <td className="px-4 py-2">{p.paid_on}</td>
                              <td className="px-4 py-2 text-end text-success font-medium">
                                {formatNaira(p.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </Container>
    </Fragment>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`size-10 grid place-items-center rounded-md bg-muted ${color}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-lg font-semibold ${color}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

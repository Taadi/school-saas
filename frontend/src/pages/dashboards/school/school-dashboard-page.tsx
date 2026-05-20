import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutGrid,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { ApiError } from '@/lib/api';
import {
  AdminDashboard,
  DashboardSummary,
  PersonalDashboard,
  TeacherDashboard,
  dashboardApi,
  isAdminDashboard,
  isPersonalDashboard,
  isTeacherDashboard,
} from '@/services/dashboard';
import { formatNaira, INVOICE_STATUS_COLOR, INVOICE_STATUS_LABEL } from '@/services/fees';
import { Container } from '@/components/common/container';
import {
  Toolbar,
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
import { Skeleton } from '@/components/ui/skeleton';

export function SchoolDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi
      .summary()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load dashboard.',
        ),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.first_name || user?.fullname?.split(' ')[0] || 'there';
  const termLabel = data?.context?.term?.name
    ? `${capitalize(data.context.term.name)} Term · ${data.context.session?.name ?? ''}`
    : 'Welcome to your school workspace';

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title={`${greeting}, ${firstName}`}
            description={termLabel}
          />
        </Toolbar>
      </Container>

      <Container>
        {loading && !data ? (
          <DashboardSkeleton />
        ) : !data ? (
          <p className="text-muted-foreground">No data.</p>
        ) : isAdminDashboard(data) ? (
          <AdminView data={data} />
        ) : isTeacherDashboard(data) ? (
          <TeacherView data={data} />
        ) : isPersonalDashboard(data) ? (
          <PersonalView data={data} />
        ) : null}
      </Container>
    </Fragment>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin / Super Admin view                                                   */
/* -------------------------------------------------------------------------- */

function AdminView({ data }: { data: AdminDashboard }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          label="Total Students"
          value={data.totals.students.toLocaleString()}
          hint={`${data.totals.classes} classes`}
          icon={<GraduationCap className="size-5" />}
          color="text-primary"
          accent="bg-primary/10"
        />
        <KpiCard
          label="Total Classes"
          value={data.totals.classes.toLocaleString()}
          hint="Across all levels"
          icon={<LayoutGrid className="size-5" />}
          color="text-info"
          accent="bg-info/10"
        />
        <KpiCard
          label="Revenue this term"
          value={formatNaira(data.totals.revenue)}
          hint={`of ${formatNaira(data.totals.expected)} billed`}
          icon={<TrendingUp className="size-5" />}
          color="text-success"
          accent="bg-success/10"
        />
        <KpiCard
          label="Pending Fees"
          value={formatNaira(data.totals.pending)}
          hint={`${data.totals.defaulters} defaulter(s)`}
          icon={<AlertTriangle className="size-5" />}
          color="text-destructive"
          accent="bg-destructive/10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Last 6 months collections</h3>
            </CardHeading>
            <CardToolbar>
              <Badge variant="secondary">
                {data.totals.collection_rate}% collected
              </Badge>
            </CardToolbar>
          </CardHeader>
          <CardContent>
            <CollectionsBarChart data={data.monthly_collections} />
            <Progress
              value={data.totals.collection_rate}
              className="mt-4"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Quick actions</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <QuickLink
              icon={<Users className="size-4" />}
              label="Manage Students"
              to="/students"
            />
            <QuickLink
              icon={<ClipboardList className="size-4" />}
              label="Enter Scores"
              to="/results/entry"
            />
            <QuickLink
              icon={<Receipt className="size-4" />}
              label="Generate Invoices"
              to="/fees/invoices"
            />
            <QuickLink
              icon={<Wallet className="size-4" />}
              label="Open Fees Dashboard"
              to="/fees"
            />
            <QuickLink
              icon={<BookOpen className="size-4" />}
              label="Subjects & Classes"
              to="/academic/classes"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardHeading>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-success" />
                <h3 className="text-base font-semibold">Recent Payments</h3>
              </div>
            </CardHeading>
            <CardToolbar>
              <Button asChild variant="outline" size="sm">
                <Link to="/fees/invoices">
                  View all <ArrowRight className="size-3.5 ms-1" />
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
                    <th className="px-4 py-2 text-start">Date</th>
                    <th className="px-4 py-2 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_payments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No payments yet.
                      </td>
                    </tr>
                  ) : (
                    data.recent_payments.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-muted/30">
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
                        <td className="px-4 py-2 text-muted-foreground">
                          {p.paid_on}
                        </td>
                        <td className="px-4 py-2 text-end font-medium text-success">
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

        <Card>
          <CardHeader>
            <CardHeading>
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-primary" />
                <h3 className="text-base font-semibold">New Admissions</h3>
              </div>
            </CardHeading>
            <CardToolbar>
              <Button asChild variant="outline" size="sm">
                <Link to="/students">
                  All students <ArrowRight className="size-3.5 ms-1" />
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
                    <th className="px-4 py-2 text-start">Admitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_admissions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No admissions yet.
                      </td>
                    </tr>
                  ) : (
                    data.recent_admissions.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <Link
                            to={`/students/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.user?.name ?? '—'}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {s.admission_number}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {s.enrollments?.[0]?.school_class?.name ?? '—'}
                          {s.enrollments?.[0]?.arm
                            ? ` ${s.enrollments[0].arm.name}`
                            : ''}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {s.admitted_on ?? '—'}
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

      {data.class_breakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Students per Class</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent>
            <ClassBreakdown data={data.class_breakdown} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Teacher view                                                               */
/* -------------------------------------------------------------------------- */

function TeacherView({ data }: { data: TeacherDashboard }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          label="Students in school"
          value={data.totals.students.toLocaleString()}
          icon={<GraduationCap className="size-5" />}
          color="text-primary"
          accent="bg-primary/10"
        />
        <KpiCard
          label="Classes"
          value={data.totals.classes.toLocaleString()}
          icon={<LayoutGrid className="size-5" />}
          color="text-info"
          accent="bg-info/10"
        />
        <KpiCard
          label="My drafts"
          value={data.totals.drafts.toLocaleString()}
          hint="Awaiting submission"
          icon={<ClipboardList className="size-5" />}
          color="text-warning"
          accent="bg-warning/10"
        />
        <KpiCard
          label="Submitted / Approved"
          value={`${data.totals.submitted} / ${data.totals.approved}`}
          hint={`${data.totals.my_results_term} entries this term`}
          icon={<CheckCircle2 className="size-5" />}
          color="text-success"
          accent="bg-success/10"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Recent score entries</h3>
            </CardHeading>
            <CardToolbar>
              <Button asChild variant="outline" size="sm">
                <Link to="/results">
                  All results <ArrowRight className="size-3.5 ms-1" />
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
                    <th className="px-4 py-2 text-start">Subject</th>
                    <th className="px-4 py-2 text-start">Class</th>
                    <th className="px-4 py-2 text-end">Total</th>
                    <th className="px-4 py-2 text-start">Grade</th>
                    <th className="px-4 py-2 text-start">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_results.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        You haven&apos;t entered any scores yet. Head over to
                        <Link
                          to="/results/entry"
                          className="text-primary hover:underline ms-1"
                        >
                          Score Entry
                        </Link>{' '}
                        to begin.
                      </td>
                    </tr>
                  ) : (
                    data.recent_results.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <span className="font-medium">
                            {r.student?.user?.name ?? '—'}
                          </span>
                          <div className="text-xs text-muted-foreground font-mono">
                            {r.student?.admission_number}
                          </div>
                        </td>
                        <td className="px-4 py-2">{r.subject?.name ?? '—'}</td>
                        <td className="px-4 py-2">{r.school_class?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-end font-medium">
                          {r.total}
                        </td>
                        <td className="px-4 py-2">{r.grade ?? '—'}</td>
                        <td className="px-4 py-2">
                          <ResultStatusPill status={r.status} />
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
              <h3 className="text-base font-semibold">Quick actions</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <QuickLink
              icon={<ClipboardList className="size-4" />}
              label="Score Entry"
              to="/results/entry"
            />
            <QuickLink
              icon={<FileText className="size-4" />}
              label="View Results"
              to="/results"
            />
            <QuickLink
              icon={<Users className="size-4" />}
              label="Browse Students"
              to="/students"
            />
            <QuickLink
              icon={<BookOpen className="size-4" />}
              label="My Subjects"
              to="/academic/subjects"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Student / Parent view                                                      */
/* -------------------------------------------------------------------------- */

function PersonalView({ data }: { data: PersonalDashboard }) {
  if (data.message) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {data.message}
        </CardContent>
      </Card>
    );
  }

  const profileLink = data.totals.student_id
    ? `/students/${data.totals.student_id}`
    : null;
  const reportCardLink = data.totals.student_id && data.context.term?.id
    ? `/results/students/${data.totals.student_id}/report-card?term_id=${data.context.term.id}`
    : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <KpiCard
          label="Total billed"
          value={formatNaira(data.totals.billed)}
          icon={<BadgeDollarSign className="size-5" />}
          color="text-foreground"
          accent="bg-muted"
        />
        <KpiCard
          label="Paid"
          value={formatNaira(data.totals.paid)}
          icon={<CheckCircle2 className="size-5" />}
          color="text-success"
          accent="bg-success/10"
        />
        <KpiCard
          label="Outstanding"
          value={formatNaira(data.totals.outstanding)}
          hint={data.totals.outstanding > 0 ? 'Action required' : 'All cleared'}
          icon={<AlertTriangle className="size-5" />}
          color={data.totals.outstanding > 0 ? 'text-destructive' : 'text-muted-foreground'}
          accent={data.totals.outstanding > 0 ? 'bg-destructive/10' : 'bg-muted'}
        />
      </div>

      {data.children && data.children.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Your children</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2">
            {data.children.map((c) => (
              <Link
                key={c.id}
                to={`/students/${c.id}`}
                className="rounded-md border px-3 py-2 hover:bg-muted/30 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{c.name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.admission_number} · {c.class ?? 'Unassigned'}
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>
              <h3 className="text-base font-semibold">Recent results</h3>
            </CardHeading>
            <CardToolbar>
              {reportCardLink && (
                <Button asChild variant="outline" size="sm">
                  <Link to={reportCardLink}>
                    Open report card{' '}
                    <ArrowRight className="size-3.5 ms-1" />
                  </Link>
                </Button>
              )}
            </CardToolbar>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-start">Subject</th>
                    <th className="px-4 py-2 text-start">Term</th>
                    <th className="px-4 py-2 text-end">Total</th>
                    <th className="px-4 py-2 text-start">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_results.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No approved results yet.
                      </td>
                    </tr>
                  ) : (
                    data.recent_results.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">
                          {r.subject?.name ?? '—'}
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {r.term?.name ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-end font-medium">{r.total}</td>
                        <td className="px-4 py-2">{r.grade ?? '—'}</td>
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
              <h3 className="text-base font-semibold">Quick links</h3>
            </CardHeading>
            <CardToolbar />
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {data.current_invoice && (
              <Link
                to={`/fees/invoices/${data.current_invoice.id}`}
                className="rounded-md border px-3 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    Current term invoice
                  </span>
                  <Badge
                    variant="outline"
                    className={INVOICE_STATUS_COLOR[data.current_invoice.status]}
                  >
                    {INVOICE_STATUS_LABEL[data.current_invoice.status]}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono mb-2">
                  {data.current_invoice.invoice_number}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span
                    className={
                      data.current_invoice.balance > 0
                        ? 'text-destructive font-semibold'
                        : 'text-success font-semibold'
                    }
                  >
                    {formatNaira(data.current_invoice.balance)}
                  </span>
                </div>
              </Link>
            )}
            <QuickLink
              icon={<Receipt className="size-4" />}
              label="My Invoices"
              to="/fees/invoices"
            />
            <QuickLink
              icon={<FileText className="size-4" />}
              label="My Results"
              to="/results"
            />
            {profileLink && (
              <QuickLink
                icon={<GraduationCap className="size-4" />}
                label="My Profile"
                to={profileLink}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardHeading>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-4 text-success" />
              <h3 className="text-base font-semibold">Recent payments</h3>
            </div>
          </CardHeading>
          <CardToolbar />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-start">Date</th>
                  <th className="px-4 py-2 text-start">Invoice</th>
                  <th className="px-4 py-2 text-start">Method</th>
                  <th className="px-4 py-2 text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.recent_payments.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.paid_on}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link
                          to={`/fees/invoices/${p.invoice_id}`}
                          className="text-primary hover:underline"
                        >
                          {p.invoice?.invoice_number ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 capitalize">
                        {p.method.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 text-end font-medium text-success">
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
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function KpiCard({
  label,
  value,
  hint,
  icon,
  color,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  color?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={`size-11 grid place-items-center rounded-md ${accent ?? 'bg-muted'} ${color ?? ''}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-xl font-semibold truncate ${color ?? ''}`}>
            {value}
          </div>
          {hint && (
            <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors"
    >
      <span className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function CollectionsBarChart({
  data,
}: {
  data: { label: string; amount: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((d) => {
        const heightPct = Math.max(4, Math.round((d.amount / max) * 100));
        return (
          <div
            key={d.label}
            className="flex flex-col items-center gap-2 flex-1 min-w-0"
          >
            <div
              className="w-full rounded-t-md bg-primary/15 hover:bg-primary/25 transition-colors relative"
              style={{ height: `${heightPct}%` }}
              title={formatNaira(d.amount)}
            >
              {d.amount > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatNairaShort(d.amount)}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ClassBreakdown({
  data,
}: {
  data: { name: string; students: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.students));
  return (
    <div className="grid gap-3">
      {data.map((c) => (
        <div key={c.name} className="grid grid-cols-[80px_1fr_60px] items-center gap-3">
          <span className="text-sm font-medium">{c.name}</span>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.round((c.students / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground text-end">
            {c.students}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultStatusPill({
  status,
}: {
  status: 'draft' | 'submitted' | 'approved';
}) {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground border-border',
    submitted: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-success/15 text-success border-success/30',
  };
  return (
    <Badge variant="outline" className={map[status]}>
      {capitalize(status)}
    </Badge>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full lg:col-span-2" />
        <Skeleton className="h-72 w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function capitalize(s?: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function formatNairaShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}k`;
  return `₦${amount}`;
}

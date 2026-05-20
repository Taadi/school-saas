import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  GraduationCap,
  PauseCircle,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { impersonation } from '@/auth/impersonation';
import {
  PlatformOverview,
  saasAdminApi,
  SUBSCRIPTION_BADGE,
  School,
} from '@/services/saas-admin';
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
import { Skeleton } from '@/components/ui/skeleton';

export function PlatformOverviewPage() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    saasAdminApi
      .overview()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) =>
        toast.error(
          err instanceof ApiError ? err.message : 'Could not load overview.',
        ),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  function open(school: School) {
    impersonation.start({
      id: school.id,
      name: school.name,
      slug: school.slug,
    });
    navigate('/');
    window.location.reload();
  }

  const totals = data?.totals;
  const series = data?.school_signups_by_month ?? [];
  const maxSignups = Math.max(1, ...series.map((s) => s.schools));

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Platform Overview"
            description="Cross-tenant view of every school using your platform."
          />
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:grid-cols-4 mb-5">
          <KpiCard
            label="Total Schools"
            icon={<Building2 className="size-4" />}
            value={loading ? null : (totals?.schools ?? 0).toString()}
            sub={
              totals
                ? `${totals.schools_active} active · ${totals.schools_trial} trial · ${totals.schools_suspended} suspended`
                : '—'
            }
          />
          <KpiCard
            label="Total Students"
            icon={<GraduationCap className="size-4" />}
            value={loading ? null : (totals?.students ?? 0).toString()}
            sub="Across all tenants"
          />
          <KpiCard
            label="Total Teachers"
            icon={<Users className="size-4" />}
            value={loading ? null : (totals?.teachers ?? 0).toString()}
            sub="Active staff accounts"
          />
          <KpiCard
            label="Payments (30d)"
            icon={<CircleDollarSign className="size-4" />}
            value={
              loading
                ? null
                : `₦${(totals?.payments_last_30_days ?? 0).toLocaleString()}`
            }
            sub="Collected across all schools"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <TrendingUp className="size-4 text-muted-foreground" />
                  School signups (last 6 months)
                </span>
              </CardHeading>
              <CardToolbar />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : series.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="flex h-40 items-end gap-3">
                  {series.map((m) => {
                    const pct = (m.schools / maxSignups) * 100;
                    return (
                      <div
                        key={m.label}
                        className="flex flex-col items-center gap-1 flex-1 min-w-0"
                      >
                        <div className="text-xs text-muted-foreground">
                          {m.schools}
                        </div>
                        <div className="w-full bg-muted rounded-t-md overflow-hidden h-32 flex items-end">
                          <div
                            className="w-full bg-primary/80 hover:bg-primary transition-colors"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium">{m.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" />
                  Recent schools
                </span>
              </CardHeading>
              <CardToolbar>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/schools">
                    All
                    <ArrowRight className="size-3.5 ms-1" />
                  </Link>
                </Button>
              </CardToolbar>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (data?.recent_schools ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">
                  No schools registered yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {data!.recent_schools.map((s) => {
                    const badge = SUBSCRIPTION_BADGE[s.subscription_status];
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.slug}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${badge.className}`}
                          >
                            {s.subscription_status === 'active' ? (
                              <PlayCircle className="size-3 me-1" />
                            ) : s.subscription_status === 'suspended' ? (
                              <PauseCircle className="size-3 me-1" />
                            ) : null}
                            {badge.label}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => open(s)}
                          >
                            Open
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </Fragment>
  );
}

function KpiCard({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="mt-1 text-2xl font-semibold">
          {value === null ? <Skeleton className="h-7 w-20" /> : value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

import { Fragment, useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Edit, ExternalLink, Receipt } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { studentsApi, referenceApi } from '@/services/students';
import {
  invoicesApi,
  formatNaira,
  INVOICE_STATUS_COLOR,
  INVOICE_STATUS_LABEL,
} from '@/services/fees';
import { TERM_LABELS } from '@/services/academic';
import { ApiError } from '@/lib/api';
import { Invoice, SchoolClass, Student, TermName } from '@/types/school';
import { Badge } from '@/components/ui/badge';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentFormDialog } from './components/student-form-dialog';

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      const res = await studentsApi.show(Number(id));
      setStudent(res.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not load student.';
      toast.error(message);
      navigate('/students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    referenceApi.classes().then((r) => setClasses(r.data)).catch(() => undefined);
    if (id) {
      setInvoicesLoading(true);
      invoicesApi
        .list({ student_id: Number(id), per_page: 50 })
        .then((r) => setInvoices(r.data))
        .catch(() => undefined)
        .finally(() => setInvoicesLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount_paid),
    0,
  );
  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0,
  );

  if (loading) {
    return (
      <Container>
        <div className="space-y-3 py-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (!student) return null;

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title={student.name}
            description={`Admission № ${student.admission_number}`}
          />
          <ToolbarActions>
            <Button variant="outline" asChild>
              <Link to="/students">
                <ArrowLeft className="size-4" />
                Back to list
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/results/students/${student.id}/report-card`}>
                <ClipboardList className="size-4" />
                Report card
              </Link>
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Edit className="size-4" />
              Edit
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="size-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground mx-auto">
                {initials(student.name)}
              </div>
              <div className="text-center">
                <div className="text-base font-semibold">{student.name}</div>
                <div className="text-sm text-muted-foreground">
                  {student.email}
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                <ProfileStat label="Status" value={student.status} capitalize />
                <ProfileStat
                  label="Class"
                  value={classLabel(student)}
                />
                <ProfileStat
                  label="Gender"
                  value={student.gender ?? '—'}
                  capitalize
                />
                <ProfileStat
                  label="Date of Birth"
                  value={student.date_of_birth ?? '—'}
                />
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <Info label="Admission Number" value={student.admission_number} />
                    <Info label="Status" value={student.status} capitalize />
                    <Info label="Gender" value={student.gender ?? '—'} capitalize />
                    <Info label="Date of Birth" value={student.date_of_birth ?? '—'} />
                    <Info label="Religion" value={student.religion ?? '—'} />
                    <Info label="Blood Group" value={student.blood_group ?? '—'} />
                    <Info label="State of Origin" value={student.state_of_origin ?? '—'} />
                    <Info label="LGA" value={student.lga ?? '—'} />
                    <Info label="Address" value={student.address ?? '—'} className="md:col-span-2" />
                    <Info label="Admitted On" value={student.admitted_on ?? '—'} />
                    <Info label="Class" value={classLabel(student)} />

                    <div className="md:col-span-2 pt-2 border-t">
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Guardian
                      </h3>
                    </div>
                    <Info label="Guardian Name" value={student.guardian_name ?? '—'} />
                    <Info
                      label="Relationship"
                      value={student.guardian_relationship ?? '—'}
                    />
                    <Info label="Guardian Phone" value={student.guardian_phone ?? '—'} />
                    <Info label="Guardian Email" value={student.guardian_email ?? '—'} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      View this student's term-by-term report card with
                      Continuous Assessment + Exam scores, totals, grades, and
                      class position.
                    </p>
                    <Button asChild>
                      <Link to={`/results/students/${student.id}/report-card`}>
                        <ClipboardList className="size-4" />
                        Open report card
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fees">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="size-4" /> Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                          Total billed
                        </div>
                        <div className="font-semibold">
                          {formatNaira(totalBilled)}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="font-semibold text-success">
                          {formatNaira(totalPaid)}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">
                          Outstanding
                        </div>
                        <div
                          className={`font-semibold ${totalDue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {formatNaira(totalDue)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-start">Invoice</th>
                            <th className="px-3 py-2 text-start">Term</th>
                            <th className="px-3 py-2 text-end">Total</th>
                            <th className="px-3 py-2 text-end">Balance</th>
                            <th className="px-3 py-2 text-start">Status</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {invoicesLoading ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="p-6 text-center text-muted-foreground"
                              >
                                Loading invoices…
                              </td>
                            </tr>
                          ) : invoices.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="p-6 text-center text-muted-foreground"
                              >
                                No invoices yet for this student.
                              </td>
                            </tr>
                          ) : (
                            invoices.map((inv) => (
                              <tr
                                key={inv.id}
                                className="border-t hover:bg-muted/30"
                              >
                                <td className="px-3 py-2 font-mono text-xs">
                                  <Link
                                    to={`/fees/invoices/${inv.id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {inv.invoice_number}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  {inv.term
                                    ? TERM_LABELS[inv.term.name as TermName]
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatNaira(inv.total_amount)}
                                </td>
                                <td
                                  className={`px-3 py-2 text-end ${inv.balance > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                                >
                                  {formatNaira(inv.balance)}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant="outline"
                                    className={INVOICE_STATUS_COLOR[inv.status]}
                                  >
                                    {INVOICE_STATUS_LABEL[inv.status]}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-end">
                                  <Button
                                    asChild
                                    variant="ghost"
                                    mode="icon"
                                    size="sm"
                                  >
                                    <Link to={`/fees/invoices/${inv.id}`}>
                                      <ExternalLink className="size-4" />
                                    </Link>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Container>

      <StudentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
        classes={classes}
        onSaved={load}
      />
    </Fragment>
  );
}

function ProfileStat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  capitalize,
  className,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function classLabel(student: Student): string {
  const cc = student.current_class;
  if (!cc?.school_class_name) return '—';
  return `${cc.school_class_name}${cc.arm_name ? ` ${cc.arm_name}` : ''} · ${cc.session_year}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

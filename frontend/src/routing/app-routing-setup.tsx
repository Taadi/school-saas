import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import {
  AcademicSessionsPage,
  ClassesPage,
  SubjectsPage,
} from '@/pages/academic';
import { CollegeReportSetupPage } from '@/pages/college-report';
import { EvaluationEntryPage, EvaluationRubricsPage } from '@/pages/evaluations';
import { PromotionManagerPage } from '@/pages/promotions';
import { SchoolBrandingPage } from '@/pages/school';
import { SchoolDashboardPage } from '@/pages/dashboards/school';
import {
  AccountSettingsPage,
  PlatformOverviewPage,
  PlatformSettingsPage,
  SchoolDetailPage,
  SchoolsListPage,
} from '@/pages/saas-admin';
import { RootRedirect } from '@/routing/root-redirect';
import {
  FeeCategoriesPage,
  FeeStructuresPage,
  FeesDashboardPage,
  InvoiceDetailPage,
  InvoicesListPage,
} from '@/pages/fees';
import {
  ReportCardPage,
  ResultsListPage,
  ScoreEntryPage,
} from '@/pages/results';
import { StudentProfilePage, StudentsListPage } from '@/pages/students';
import { TeacherProfilePage, TeachersListPage } from '@/pages/teachers';
import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<SchoolDashboardPage />} />
          <Route path="/dark-sidebar" element={<Navigate to="/" replace />} />

          {/* Platform admin (super_admin only) */}
          <Route path="/admin" element={<PlatformOverviewPage />} />
          <Route path="/admin/schools" element={<SchoolsListPage />} />
          <Route path="/admin/schools/:id" element={<SchoolDetailPage />} />
          <Route
            path="/admin/platform-settings"
            element={<PlatformSettingsPage />}
          />

          {/* Universal account */}
          <Route path="/account/settings" element={<AccountSettingsPage />} />

          {/* Tenant: students */}
          <Route path="/students" element={<StudentsListPage />} />
          <Route path="/students/:id" element={<StudentProfilePage />} />

          {/* Tenant: teachers */}
          <Route path="/teachers" element={<TeachersListPage />} />
          <Route path="/teachers/:id" element={<TeacherProfilePage />} />

          {/* Tenant: academic */}
          <Route path="/academic/classes" element={<ClassesPage />} />
          <Route path="/academic/subjects" element={<SubjectsPage />} />
          <Route path="/academic/sessions" element={<AcademicSessionsPage />} />
          <Route path="/academic/promotions" element={<PromotionManagerPage />} />
          <Route path="/school/branding" element={<SchoolBrandingPage />} />

          {/* Tenant: results */}
          <Route path="/results" element={<ResultsListPage />} />
          <Route path="/results/entry" element={<ScoreEntryPage />} />
          <Route
            path="/results/students/:id/report-card"
            element={<ReportCardPage />}
          />

          <Route path="/evaluations/entry" element={<EvaluationEntryPage />} />
          <Route path="/evaluations/rubrics" element={<EvaluationRubricsPage />} />

          {/* Tenant: college report (settings) */}
          <Route
            path="/college-report/setup"
            element={<CollegeReportSetupPage />}
          />

          {/* Tenant: fees */}
          <Route path="/fees" element={<FeesDashboardPage />} />
          <Route path="/fees/categories" element={<FeeCategoriesPage />} />
          <Route path="/fees/structures" element={<FeeStructuresPage />} />
          <Route path="/fees/invoices" element={<InvoicesListPage />} />
          <Route path="/fees/invoices/:id" element={<InvoiceDetailPage />} />
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
}

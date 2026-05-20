import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import {
  AcademicSession,
  AssessmentScheme,
  GradingScale,
  ReportSettings,
  SubjectGroup,
  Subject,
} from '@/types/school';
import { academicSessionsApi, subjectsApi } from '@/services/academic';

export interface ReportConfigBundle {
  loading: boolean;
  scales: GradingScale[];
  schemes: AssessmentScheme[];
  groups: SubjectGroup[];
  settings: ReportSettings | null;
  sessions: AcademicSession[];
  subjects: Subject[];
  refresh: () => Promise<void>;
  refreshSection: (
    section: 'scales' | 'schemes' | 'groups' | 'settings' | 'sessions',
  ) => Promise<void>;
}

/**
 * One-stop hook used by the College Report Setup page. Loads every collection
 * the tabs need in parallel and exposes targeted refreshers so individual
 * tabs can re-fetch only what they changed.
 */
export function useReportConfig(): ReportConfigBundle {
  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [schemes, setSchemes] = useState<AssessmentScheme[]>([]);
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const refreshSection = useCallback<ReportConfigBundle['refreshSection']>(
    async (section) => {
      try {
        if (section === 'scales') {
          const r = await collegeReportApi.listScales();
          setScales(r.data);
        } else if (section === 'schemes') {
          const r = await collegeReportApi.listSchemes();
          setSchemes(r.data);
        } else if (section === 'groups') {
          const r = await collegeReportApi.listGroups();
          setGroups(r.data);
        } else if (section === 'settings') {
          const r = await collegeReportApi.getSettings();
          setSettings(r.data);
        } else if (section === 'sessions') {
          const r = await academicSessionsApi.list();
          setSessions(r.data);
        }
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : `Could not refresh ${section}.`,
        );
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sch, g, st, se, sub] = await Promise.all([
        collegeReportApi.listScales(),
        collegeReportApi.listSchemes(),
        collegeReportApi.listGroups(),
        collegeReportApi.getSettings(),
        academicSessionsApi.list(),
        subjectsApi.list(),
      ]);
      setScales(s.data);
      setSchemes(sch.data);
      setGroups(g.data);
      setSettings(st.data);
      setSessions(se.data);
      setSubjects(sub.data);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'Could not load college-report configuration.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    scales,
    schemes,
    groups,
    settings,
    sessions,
    subjects,
    refresh,
    refreshSection,
  };
}

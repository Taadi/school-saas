import { Fragment, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
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

/**
 * Tab 1 — Terms & Sub-term overview.
 *
 * The actual session/term CRUD lives in the existing Academic Sessions screen.
 * This tab gives a quick, read-only summary so admins can verify what is in
 * place before configuring assessment + cumulative rules in the next tabs,
 * with a one-click jump to the canonical editor. Sub-terms / Assessment
 * Periods (CA1, CA2, Mid-term, Exam) are managed in Tab 3 — Assessment.
 */
export function TermsTab({ config }: { config: ReportConfigBundle }) {
  const [showHelp, setShowHelp] = useState(true);

  const sessions = useMemo(
    () =>
      [...config.sessions].sort((a, b) =>
        a.is_current === b.is_current ? 0 : a.is_current ? -1 : 1,
      ),
    [config.sessions],
  );

  return (
    <Fragment>
      {showHelp && (
        <Card className="mb-4 border-violet-500/30 bg-violet-500/5">
          <CardContent className="py-4 flex gap-3">
            <Info className="size-5 shrink-0 text-violet-600 mt-0.5" />
            <div className="space-y-1 text-sm flex-1">
              <div className="font-medium">How this works</div>
              <p className="text-muted-foreground">
                Sessions and Terms are managed under{' '}
                <strong>Academic Sessions</strong>. Assessment periods (CA1, Exam,
                etc.) are defined in <strong>Tab 3 — Assessment</strong>. Term
                deadlines are on <strong>Tab 7</strong>.
              </p>
              <Button variant="ghost" size="sm" className="h-8 px-2 -ms-2 text-muted-foreground" onClick={() => setShowHelp(false)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 mt-4">
        {sessions.length === 0 && (
          <Card>
            <CardContent className="text-sm text-muted-foreground py-8 text-center">
              No academic sessions yet. Create one first.
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link to="/academic/sessions">
                    Open Academic Sessions
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardHeading>
                <span className="font-medium flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {session.name}
                  {session.is_current && (
                    <Badge variant="primary" appearance="light" size="sm">
                      Current
                    </Badge>
                  )}
                </span>
              </CardHeading>
              <Button asChild variant="outline" size="sm">
                <Link to="/academic/sessions">
                  <ExternalLink className="size-3.5" />
                  Edit session
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {(session.terms ?? []).map((term) => (
                <div
                  key={term.id}
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {TERM_LABELS[term.name]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {term.start_date ?? '—'} → {term.end_date ?? '—'}
                    </div>
                  </div>
                  {term.is_current && (
                    <Badge variant="success" appearance="light" size="sm">
                      Current
                    </Badge>
                  )}
                </div>
              ))}
              {(session.terms ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground col-span-3">
                  No terms — re-create the session to seed defaults.
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Fragment>
  );
}

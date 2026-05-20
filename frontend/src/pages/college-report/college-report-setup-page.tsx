import { Fragment, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useReportConfig } from './use-report-config';
import { AssessmentTab } from './tabs/assessment-tab';
import { AttendanceTab } from './tabs/attendance-tab';
import { BrandingTab } from './tabs/branding-tab';
import { CumulativeTab } from './tabs/cumulative-tab';
import { GradingTab } from './tabs/grading-tab';
import { NonAssessmentCommentsTab } from './tabs/non-assessment-comments-tab';
import { NonAssessmentTab } from './tabs/non-assessment-tab';
import { PresentationTab } from './tabs/presentation-tab';
import { ResultCommentsTab } from './tabs/result-comments-tab';
import { SubjectGroupsTab } from './tabs/subject-groups-tab';
import { TermDatesTab } from './tabs/term-dates-tab';
import { SubTermsTab } from './tabs/sub-terms-tab';
import { TermsTab } from './tabs/terms-tab';

const TABS = [
  { id: 'terms', label: 'Terms' },
  { id: 'sub-terms', label: 'Sub-terms' },
  { id: 'grading', label: 'Grading' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'comments', label: 'Default Comments' },
  { id: 'non-assessment', label: 'Non-Assessment' },
  { id: 'na-comments', label: 'Non-Assessment Comments' },
  { id: 'term-dates', label: 'Term Dates & Deadlines' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'branding', label: 'Motto, Seal & Sponsor' },
  { id: 'subject-groups', label: 'Subject Groupings' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'cumulative', label: 'Cumulative' },
];

export function CollegeReportSetupPage() {
  const config = useReportConfig();
  const [active, setActive] = useState('terms');

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="College Report Setup"
            description="One place to control how scores are entered, graded and presented on report cards. All settings are tenant-scoped."
          />
        </Toolbar>
      </Container>

      <Container>
        {config.loading && !config.settings ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Loading configuration…
          </div>
        ) : (
          <Tabs value={active} onValueChange={setActive}>
            <ScrollArea>
              <TabsList variant="line" className="w-max min-w-full">
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="terms" className="pt-5">
              <TermsTab config={config} />
            </TabsContent>
            <TabsContent value="sub-terms" className="pt-5">
              <SubTermsTab config={config} />
            </TabsContent>
            <TabsContent value="grading" className="pt-5">
              <GradingTab config={config} />
            </TabsContent>
            <TabsContent value="assessment" className="pt-5">
              <AssessmentTab config={config} />
            </TabsContent>
            <TabsContent value="comments" className="pt-5">
              <ResultCommentsTab config={config} />
            </TabsContent>
            <TabsContent value="non-assessment" className="pt-5">
              <NonAssessmentTab config={config} />
            </TabsContent>
            <TabsContent value="na-comments" className="pt-5">
              <NonAssessmentCommentsTab config={config} />
            </TabsContent>
            <TabsContent value="term-dates" className="pt-5">
              <TermDatesTab config={config} />
            </TabsContent>
            <TabsContent value="attendance" className="pt-5">
              <AttendanceTab config={config} />
            </TabsContent>
            <TabsContent value="branding" className="pt-5">
              <BrandingTab config={config} />
            </TabsContent>
            <TabsContent value="subject-groups" className="pt-5">
              <SubjectGroupsTab config={config} />
            </TabsContent>
            <TabsContent value="presentation" className="pt-5">
              <PresentationTab config={config} />
            </TabsContent>
            <TabsContent value="cumulative" className="pt-5">
              <CumulativeTab config={config} />
            </TabsContent>
          </Tabs>
        )}
      </Container>
    </Fragment>
  );
}

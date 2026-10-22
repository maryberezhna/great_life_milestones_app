import { WeeklyReportView } from '@/components/ds/WeeklyReportView';
import { getReports } from '@/app/actions/report';

export default async function ReportPage() {
  const reports = await getReports();
  return <WeeklyReportView initialReports={reports} />;
}

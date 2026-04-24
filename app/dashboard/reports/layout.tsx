import { ReportsPlanGate } from '@/components/dashboard/ReportsPlanGate';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ReportsPlanGate>{children}</ReportsPlanGate>;
}

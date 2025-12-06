import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { DollarSign, Banknote, AlertTriangle } from 'lucide-react';

// Data queries - ALL REAL SUPABASE DATA
import {
  getDashboardMetrics,
  getUnassignedJobs,
  getReceivablesByCompany,
  getTodaysCollections,
  getLiveDriverStatuses,
  getTodaysSchedule,
} from '@/data/dashboard-data';

// V4 Components with proper theming
import { CriticalBlock } from '@/components/dashboard/v4/CriticalBlock';
import { QuickActions } from '@/components/dashboard/v4/QuickActions';
import { DriversNow } from '@/components/dashboard/v4/DriversNow';
import { PrimaryMetricCard } from '@/components/dashboard/v4/PrimaryMetricCard';
import { KeyMetrics } from '@/components/dashboard/v4/KeyMetrics';
import { LoadsAwaitingDispatch } from '@/components/dashboard/v4/LoadsAwaitingDispatch';
import { WhoOwesYouMoney } from '@/components/dashboard/v4/WhoOwesYouMoney';
import { TodaysSchedule } from '@/components/dashboard/v4/TodaysSchedule';
import { DriverCollectionsToday } from '@/components/dashboard/v4/DriverCollectionsToday';
import { DashboardActionBar } from '@/components/dashboard/v4/DashboardActionBar';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all dashboard data in parallel - ALL REAL DATA FROM SUPABASE
  const [
    metrics,
    unassignedJobs,
    receivables,
    collections,
    driverStatuses,
    todaysSchedule,
  ] = await Promise.all([
    getDashboardMetrics(user.id),
    getUnassignedJobs(user.id, 6),
    getReceivablesByCompany(user.id, 5),
    getTodaysCollections(user.id, 5),
    getLiveDriverStatuses(user.id, 10),
    getTodaysSchedule(user.id, 8),
  ]);

  // Calculate urgency - single source of truth
  const urgentJobsCount = unassignedJobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;
  const hasCriticalAlert = urgentJobsCount > 0 || metrics.overdueInvoices > 3;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* CRITICAL ALERT BAR - Only show when something needs immediate attention */}
      {hasCriticalAlert && (
        <CriticalBlock
          message={
            urgentJobsCount > 0
              ? `${urgentJobsCount} load${urgentJobsCount > 1 ? 's' : ''} need drivers today/tomorrow`
              : `${metrics.overdueInvoices} overdue invoices need attention`
          }
          href={urgentJobsCount > 0 ? '/dashboard/assigned-loads?filter=unassigned' : '/dashboard/finance/receivables?filter=overdue'}
          actionText={urgentJobsCount > 0 ? 'Assign Now' : 'View Overdue'}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* HEADER + QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Command Center</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
          <QuickActions needsDriverAssignment={metrics.jobsNeedingAssignment} />
        </div>

        {/* DRIVERS NOW - Hero section showing driver fleet status */}
        <div className="mb-6">
          <DriversNow
            drivers={driverStatuses}
            driversOnRoad={metrics.driversOnRoad}
            totalDrivers={metrics.totalDrivers}
          />
        </div>

        {/* PRIMARY METRICS - The 3 most important numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <PrimaryMetricCard
            title="Money Owed"
            value={formatCurrency(metrics.totalReceivables)}
            subtitle={`${receivables.length} companies`}
            percentChange={metrics.receivablesChangePercent}
            accent="emerald"
            icon={<DollarSign className="h-5 w-5" />}
            href="/dashboard/finance/receivables"
          />

          <PrimaryMetricCard
            title="Collected Today"
            value={formatCurrency(metrics.collectedToday)}
            subtitle={`${collections.length} payments`}
            percentChange={metrics.collectedChangePercent}
            accent="blue"
            icon={<Banknote className="h-5 w-5" />}
            href="/dashboard/finance/receivables"
          />

          <PrimaryMetricCard
            title="Awaiting Dispatch"
            value={metrics.jobsNeedingAssignment.toString()}
            subtitle={formatCurrency(metrics.jobsNeedingAssignmentValue) + ' value'}
            accent={metrics.jobsNeedingAssignment > 0 ? (urgentJobsCount > 0 ? 'amber' : 'blue') : 'emerald'}
            pulse={urgentJobsCount > 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            href="/dashboard/assigned-loads?filter=unassigned"
          />
        </div>

        {/* KEY METRICS - Secondary operational numbers */}
        <div className="mb-6">
          <KeyMetrics metrics={metrics} />
        </div>

        {/* MAIN CONTENT - Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN - 2/3 width - Operational focus */}
          <div className="lg:col-span-2 space-y-5">
            {/* LOADS AWAITING DISPATCH - Single source of truth, replaces JobsNeedingAssignment */}
            <LoadsAwaitingDispatch
              loads={unassignedJobs}
              totalCount={metrics.jobsNeedingAssignment}
              totalValue={metrics.jobsNeedingAssignmentValue}
            />

            {/* WHO OWES YOU MONEY */}
            <WhoOwesYouMoney companies={receivables} />
          </div>

          {/* RIGHT COLUMN - 1/3 width - Schedule & Collections */}
          <div className="space-y-5">
            {/* TODAY'S SCHEDULE - Pickups & Deliveries */}
            <TodaysSchedule events={todaysSchedule} />

            {/* TODAY'S COLLECTIONS */}
            <DriverCollectionsToday
              collections={collections}
              total={metrics.collectedToday}
            />
          </div>
        </div>
      </div>

      {/* Fixed bottom action bar (mobile only) */}
      <DashboardActionBar />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { DollarSign, Banknote, AlertTriangle, Truck, Users, FileText, AlertCircle } from 'lucide-react';

// Data queries - ALL REAL SUPABASE DATA
import {
  getDashboardMetrics,
  getUnassignedJobs,
  getReceivablesByCompany,
  getTodaysCollections,
  getLiveDriverStatuses,
  getRecentDashboardActivity,
} from '@/data/dashboard-data';

// Components with proper theming
import { PrimaryMetricCard } from '@/components/dashboard/v4/PrimaryMetricCard';
import { SecondaryMetricCard } from '@/components/dashboard/v4/SecondaryMetricCard';
import { JobsNeedingAssignment } from '@/components/dashboard/v4/JobsNeedingAssignment';
import { WhoOwesYouMoney } from '@/components/dashboard/v4/WhoOwesYouMoney';
import { DriverCollectionsToday } from '@/components/dashboard/v4/DriverCollectionsToday';
import { LiveDriverStatusList } from '@/components/dashboard/v4/LiveDriverStatusList';
import { RecentActivityFeed } from '@/components/dashboard/v4/RecentActivityFeed';
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
    recentActivity,
  ] = await Promise.all([
    getDashboardMetrics(user.id),
    getUnassignedJobs(user.id, 6),
    getReceivablesByCompany(user.id, 5),
    getTodaysCollections(user.id, 5),
    getLiveDriverStatuses(user.id, 6),
    getRecentDashboardActivity(user.id, 8),
  ]);

  const hasUrgentJobs = metrics.jobsNeedingAssignment > 0;
  const urgentJobsCount = unassignedJobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-6">
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
          {urgentJobsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {urgentJobsCount} urgent
              </span>
            </div>
          )}
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
          />

          <PrimaryMetricCard
            title="Awaiting Dispatch"
            value={metrics.jobsNeedingAssignment.toString()}
            subtitle={formatCurrency(metrics.jobsNeedingAssignmentValue) + ' value'}
            accent={hasUrgentJobs ? 'amber' : 'emerald'}
            pulse={urgentJobsCount > 0}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        {/* SECONDARY METRICS - Supporting numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          <SecondaryMetricCard
            title="Active Trips"
            value={metrics.activeTrips}
            icon={<Truck className="h-4 w-4" />}
            href="/dashboard/trips?status=active"
          />

          <SecondaryMetricCard
            title="Drivers on Road"
            value={`${metrics.driversOnRoad}/${metrics.totalDrivers}`}
            icon={<Users className="h-4 w-4" />}
            href="/dashboard/drivers"
          />

          <SecondaryMetricCard
            title="Pending Settlements"
            value={metrics.pendingSettlements}
            icon={<FileText className="h-4 w-4" />}
            href="/dashboard/settlements"
          />

          <SecondaryMetricCard
            title="Overdue"
            value={metrics.overdueInvoices}
            icon={<AlertCircle className="h-4 w-4" />}
            href="/dashboard/finance/receivables?filter=overdue"
            highlight={metrics.overdueInvoices > 0}
          />
        </div>

        {/* MAIN CONTENT - Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN - 2/3 width - Operational focus */}
          <div className="lg:col-span-2 space-y-5">
            <JobsNeedingAssignment jobs={unassignedJobs} />
            <WhoOwesYouMoney companies={receivables} />
          </div>

          {/* RIGHT COLUMN - 1/3 width - Status & activity */}
          <div className="space-y-5">
            <DriverCollectionsToday
              collections={collections}
              total={metrics.collectedToday}
            />
            <LiveDriverStatusList drivers={driverStatuses} />
            <RecentActivityFeed activities={recentActivity} />
          </div>
        </div>
      </div>

      {/* Fixed bottom action bar (mobile only) */}
      <DashboardActionBar />
    </div>
  );
}

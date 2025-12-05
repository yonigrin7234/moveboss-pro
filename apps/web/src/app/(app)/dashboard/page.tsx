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
    getUnassignedJobs(user.id, 5),
    getReceivablesByCompany(user.id, 5),
    getTodaysCollections(user.id, 5),
    getLiveDriverStatuses(user.id, 6),
    getRecentDashboardActivity(user.id, 8),
  ]);

  const hasUrgentJobs = metrics.jobsNeedingAssignment > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Page content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your operations
          </p>
        </div>

        {/* PRIMARY METRICS - The 3 most important numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <PrimaryMetricCard
            title="Money Owed to You"
            value={formatCurrency(metrics.totalReceivables)}
            subtitle={`${receivables.length} companies`}
            percentChange={metrics.receivablesChangePercent}
            accent="emerald"
            icon={<DollarSign className="h-5 w-5" />}
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
            title="Jobs Needing Assignment"
            value={metrics.jobsNeedingAssignment.toString()}
            subtitle={formatCurrency(metrics.jobsNeedingAssignmentValue) + ' total value'}
            accent={hasUrgentJobs ? 'amber' : 'emerald'}
            pulse={hasUrgentJobs}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        {/* SECONDARY METRICS - Supporting numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
            title="Overdue Invoices"
            value={metrics.overdueInvoices}
            icon={<AlertCircle className="h-4 w-4" />}
            href="/dashboard/finance/receivables?filter=overdue"
          />
        </div>

        {/* MAIN CONTENT - Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <JobsNeedingAssignment jobs={unassignedJobs} />
            <WhoOwesYouMoney companies={receivables} />
          </div>

          {/* RIGHT COLUMN - 1/3 width */}
          <div className="space-y-6">
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

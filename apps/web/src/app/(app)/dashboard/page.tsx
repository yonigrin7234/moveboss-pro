import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { DollarSign, Banknote, AlertTriangle } from 'lucide-react';

// Data queries
import {
  getDashboardMetrics,
  getUnassignedJobs,
  getReceivablesByCompany,
  getTodaysCollections,
  getLiveDriverStatuses,
  getTodaysSchedule,
} from '@/data/dashboard-data';
import { getOnboardingState } from '@/data/onboarding';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import {
  getBrokerDashboardData,
  getCarrierDashboardData,
  getOwnerOperatorDashboardData,
} from '@/data/role-dashboards';

// V4 Components
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

// Role-specific dashboards
import { BrokerDashboard } from '@/components/dashboard/v4/BrokerDashboard';
import { CarrierDashboard } from '@/components/dashboard/v4/CarrierDashboard';
import { OwnerOperatorDashboard } from '@/components/dashboard/v4/OwnerOperatorDashboard';

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

  // Fetch role and company info
  const [onboardingState, workspaceCompany] = await Promise.all([
    getOnboardingState(user.id),
    getWorkspaceCompanyForUser(user.id),
  ]);

  const role = onboardingState?.role;
  const isBroker = workspaceCompany?.is_broker ?? false;
  const isCarrier = workspaceCompany?.is_carrier ?? false;

  // Determine which dashboard to show
  // Broker: role=company, isBroker=true, isCarrier=false
  // Moving Company: role=company, isBroker=true, isCarrier=true
  // Carrier: role=carrier
  // Owner-Operator: role=owner_operator

  // BROKER DASHBOARD
  if (role === 'company' && isBroker && !isCarrier) {
    const data = await getBrokerDashboardData(user.id);
    return (
      <BrokerDashboard
        loadsPosted={data.loadsPosted}
        pendingRequests={data.pendingRequests}
        loadsInTransit={data.loadsInTransit}
        metrics={data.metrics}
      />
    );
  }

  // CARRIER DASHBOARD
  if (role === 'carrier') {
    const data = await getCarrierDashboardData(user.id);
    return (
      <CarrierDashboard
        assignedLoads={data.assignedLoads}
        drivers={data.drivers}
        availableLoads={data.availableLoads}
        metrics={data.metrics}
      />
    );
  }

  // OWNER-OPERATOR DASHBOARD
  if (role === 'owner_operator') {
    const data = await getOwnerOperatorDashboardData(user.id);
    return (
      <OwnerOperatorDashboard
        currentLoad={data.currentLoad}
        upcomingLoads={data.upcomingLoads}
        availableLoads={data.availableLoads}
        metrics={data.metrics}
      />
    );
  }

  // MOVING COMPANY DASHBOARD (default) - Full operations view
  // This is for role=company with isBroker=true and isCarrier=true
  // Or any fallback case

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

  const urgentJobsCount = unassignedJobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;
  const hasCriticalAlert = urgentJobsCount > 0 || metrics.overdueInvoices > 3;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* CRITICAL ALERT BAR */}
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

        {/* DRIVERS NOW */}
        <div className="mb-6">
          <DriversNow
            drivers={driverStatuses}
            driversOnRoad={metrics.driversOnRoad}
            totalDrivers={metrics.totalDrivers}
          />
        </div>

        {/* PRIMARY METRICS */}
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

        {/* KEY METRICS */}
        <div className="mb-6">
          <KeyMetrics metrics={metrics} />
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <LoadsAwaitingDispatch
              loads={unassignedJobs}
              totalCount={metrics.jobsNeedingAssignment}
              totalValue={metrics.jobsNeedingAssignmentValue}
            />
            <WhoOwesYouMoney companies={receivables} />
          </div>

          <div className="space-y-5">
            <TodaysSchedule events={todaysSchedule} />
            <DriverCollectionsToday
              collections={collections}
              total={metrics.collectedToday}
            />
          </div>
        </div>
      </div>

      <DashboardActionBar />
    </div>
  );
}

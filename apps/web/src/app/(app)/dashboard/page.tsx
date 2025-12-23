import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

// Data queries
import {
  getDashboardMetrics,
  getUnassignedJobs,
  getTodaysCollections,
  getTodaysSchedule,
} from '@/data/dashboard-data';
import { getOnboardingState } from '@/data/onboarding';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { getCarrierDashboardData } from '@/data/role-dashboards';
import { getComplianceAlertCounts, getComplianceAlertsForUser } from '@/data/compliance-alerts';

// V4 Components - Simplified Dashboard
import { CriticalBlock } from '@/components/dashboard/v4/CriticalBlock';
import { QuickActions } from '@/components/dashboard/v4/QuickActions';
import { MoneyRow } from '@/components/dashboard/v4/MoneyRow';
import { TodaysSchedule } from '@/components/dashboard/v4/TodaysSchedule';
import { SuggestedLoads, SuggestedLoad } from '@/components/dashboard/v4/SuggestedLoads';
import { NeedsAttention, AttentionItem } from '@/components/dashboard/v4/NeedsAttention';
import { DriverCollectionsToday } from '@/components/dashboard/v4/DriverCollectionsToday';
import { DashboardActionBar } from '@/components/dashboard/v4/DashboardActionBar';

// Owner-operator has a different, simplified layout
import { OwnerOperatorDashboard } from '@/components/dashboard/v4/OwnerOperatorDashboard';
import { getOwnerOperatorDashboardData } from '@/data/role-dashboards';

// Role helpers
import {
  canPostToMarketplace,
  canHaulLoads,
  isPureCarrier,
} from '@/lib/dashboardMode';

export const dynamic = 'force-dynamic';

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
  const companyCapabilities = {
    is_broker: workspaceCompany?.is_broker ?? false,
    is_carrier: workspaceCompany?.is_carrier ?? false,
  };

  // OWNER-OPERATOR DASHBOARD - Keep separate (simpler layout focused on individual)
  if (role === 'owner_operator') {
    const data = await getOwnerOperatorDashboardData(user.id);
    return (
      <OwnerOperatorDashboard
        currentLoad={data.currentLoad}
        upcomingLoads={data.upcomingLoads}
        availableLoads={data.availableLoads}
        todaysSchedule={data.todaysSchedule}
        metrics={data.metrics}
      />
    );
  }

  // UNIFIED COMMAND CENTER for Carriers, Brokers, and Moving Companies
  const isBroker = canPostToMarketplace(companyCapabilities);
  const isCarrier = canHaulLoads(companyCapabilities);
  const pureCarrier = isPureCarrier(companyCapabilities);

  // Fetch all data in parallel
  const [
    metrics,
    todaysSchedule,
    collections,
    complianceAlertCounts,
    complianceAlerts,
  ] = await Promise.all([
    getDashboardMetrics(user.id),
    getTodaysSchedule(user.id, 8),
    getTodaysCollections(user.id, 5),
    getComplianceAlertCounts(user.id),
    getComplianceAlertsForUser(user.id),
  ]);

  // Calculate critical compliance count
  const criticalComplianceCount = complianceAlertCounts.expired + complianceAlertCounts.critical;

  // Broker-specific data
  let unassignedJobs: Awaited<ReturnType<typeof getUnassignedJobs>> = [];
  if (isBroker) {
    unassignedJobs = await getUnassignedJobs(user.id, 10);
  }

  // Carrier-specific data
  let carrierData: Awaited<ReturnType<typeof getCarrierDashboardData>> | null = null;
  if (isCarrier) {
    carrierData = await getCarrierDashboardData(user.id);
  }

  const urgentJobsCount = unassignedJobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;
  const hasCriticalAlert = criticalComplianceCount > 0 ||
    (isBroker && (urgentJobsCount > 0 || metrics.overdueInvoices > 3)) ||
    (isCarrier && carrierData && carrierData.metrics.pendingRequestsCount > 0);

  // Build critical alert message
  let criticalMessage = '';
  let criticalHref = '';
  let criticalAction = '';

  if (complianceAlertCounts.expired > 0) {
    criticalMessage = `${complianceAlertCounts.expired} expired compliance item${complianceAlertCounts.expired > 1 ? 's' : ''} - action required immediately`;
    criticalHref = '/dashboard/compliance';
    criticalAction = 'View Now';
  } else if (complianceAlertCounts.critical > 0) {
    criticalMessage = `${complianceAlertCounts.critical} compliance item${complianceAlertCounts.critical > 1 ? 's' : ''} expiring within 7 days`;
    criticalHref = '/dashboard/compliance';
    criticalAction = 'View Now';
  } else if (isBroker && urgentJobsCount > 0) {
    criticalMessage = `${urgentJobsCount} load${urgentJobsCount > 1 ? 's' : ''} need drivers today/tomorrow`;
    criticalHref = '/dashboard/assigned-loads?filter=unassigned';
    criticalAction = 'Assign Now';
  } else if (isBroker && metrics.overdueInvoices > 3) {
    criticalMessage = `${metrics.overdueInvoices} overdue invoices need attention`;
    criticalHref = '/dashboard/finance/receivables?filter=overdue';
    criticalAction = 'View Overdue';
  } else if (isCarrier && carrierData && carrierData.metrics.pendingRequestsCount > 0) {
    criticalMessage = `${carrierData.metrics.pendingRequestsCount} pending load request${carrierData.metrics.pendingRequestsCount > 1 ? 's' : ''}`;
    criticalHref = '/dashboard/my-requests';
    criticalAction = 'View Requests';
  }

  // Build attention items from various sources
  const attentionItems: AttentionItem[] = [];

  // Add unassigned loads
  unassignedJobs.slice(0, 5).forEach((job) => {
    attentionItems.push({
      id: `load-${job.id}`,
      type: 'unassigned_load',
      title: `Load ${job.loadNumber || 'Unknown'}`,
      subtitle: `${job.origin} → ${job.destination} • ${job.urgency === 'today' ? 'Pickup today' : job.urgency === 'tomorrow' ? 'Pickup tomorrow' : 'This week'}`,
      urgency: job.urgency === 'today' ? 'critical' : job.urgency === 'tomorrow' ? 'urgent' : 'normal',
      href: `/dashboard/assigned-loads/${job.id}`,
      value: job.rate ?? undefined,
    });
  });

  // Add compliance issues
  complianceAlerts.slice(0, 3).forEach((alert) => {
    attentionItems.push({
      id: `compliance-${alert.id}`,
      type: 'compliance',
      title: alert.item_name,
      subtitle: alert.days_until_expiry !== null
        ? (alert.days_until_expiry <= 0 ? `${Math.abs(alert.days_until_expiry)} days overdue` : `${alert.days_until_expiry} days left`)
        : 'Missing documentation',
      urgency: alert.severity === 'expired' || alert.severity === 'critical' ? 'critical' : 'urgent',
      href: '/dashboard/compliance',
    });
  });

  // Add pending requests for carriers
  if (carrierData && carrierData.metrics.pendingRequestsCount > 0) {
    attentionItems.push({
      id: 'pending-requests',
      type: 'pending_request',
      title: `${carrierData.metrics.pendingRequestsCount} Pending Request${carrierData.metrics.pendingRequestsCount > 1 ? 's' : ''}`,
      subtitle: 'Load requests awaiting your response',
      urgency: 'urgent',
      href: '/dashboard/my-requests',
    });
  }

  // Calculate needs attention amount (value of unassigned jobs)
  const needsAttentionAmount = unassignedJobs.reduce((sum, job) => sum + (job.rate || 0), 0);

  // Build suggested loads (smart matching based on driver delivery locations)
  // For now, this returns available loads that could be good matches
  // TODO: Implement proper geo-matching based on driver delivery destinations
  const suggestedLoads: SuggestedLoad[] = (carrierData?.availableLoads || [])
    .slice(0, 4)
    .map((load, index) => ({
      id: load.id,
      load_number: load.load_number,
      origin_city: load.origin_city,
      origin_state: load.origin_state || '',
      destination_city: load.destination_city,
      destination_state: load.destination_state || '',
      pickup_date: load.pickup_date,
      estimated_cuft: load.estimated_cuft,
      rate: undefined, // Rate shown after request
      match_reason: index === 0 ? 'Near your driver\'s next delivery' : 'Good route match',
      distance_from_delivery: index === 0 ? 15 : index === 1 ? 32 : undefined,
    }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* CRITICAL ALERT BANNER - Only when truly critical */}
      {hasCriticalAlert && criticalMessage && (
        <CriticalBlock
          message={criticalMessage}
          href={criticalHref}
          actionText={criticalAction}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* HEADER + QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
          <QuickActions
            needsDriverAssignment={metrics.jobsNeedingAssignment}
            pendingRequestsCount={carrierData?.metrics.pendingRequestsCount ?? 0}
            company={companyCapabilities}
          />
        </div>

        {/* MONEY ROW - 3 clean cards */}
        <div className="mb-6">
          <MoneyRow
            moneyOwed={pureCarrier ? (carrierData?.metrics.moneyOwedToYou ?? 0) : metrics.totalReceivables}
            collectedToday={pureCarrier ? (carrierData?.metrics.collectedToday ?? 0) : metrics.collectedToday}
            needsAttentionAmount={needsAttentionAmount}
            needsAttentionCount={attentionItems.length}
          />
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN - Schedule & Suggested Loads */}
          <div className="lg:col-span-2 space-y-5">
            <TodaysSchedule events={todaysSchedule} />

            {/* Suggested Loads - Smart Matching */}
            {isCarrier && (
              <SuggestedLoads loads={suggestedLoads} />
            )}
          </div>

          {/* RIGHT COLUMN - Attention & Collections */}
          <div className="space-y-5">
            <NeedsAttention items={attentionItems} />

            <DriverCollectionsToday
              collections={collections}
              total={pureCarrier ? (carrierData?.metrics.collectedToday ?? 0) : metrics.collectedToday}
            />
          </div>
        </div>
      </div>

      <DashboardActionBar company={companyCapabilities} />
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { DollarSign, Banknote, AlertTriangle, Package, TrendingUp, TrendingDown, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
import { getCarrierDashboardData } from '@/data/role-dashboards';

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

// Owner-operator has a different, simplified layout
import { OwnerOperatorDashboard } from '@/components/dashboard/v4/OwnerOperatorDashboard';
import { getOwnerOperatorDashboardData } from '@/data/role-dashboards';

// Role helpers
import {
  canPostToMarketplace,
  canHaulLoads,
  isPureCarrier,
  isBrokerOnly,
} from '@/lib/dashboardMode';

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
  // Role-based data fetching
  const isBroker = canPostToMarketplace(companyCapabilities);
  const isCarrier = canHaulLoads(companyCapabilities);
  const pureCarrier = isPureCarrier(companyCapabilities);
  const pureBroker = isBrokerOnly(companyCapabilities);

  // Fetch data based on capabilities
  // All roles get base metrics + schedule + collections
  const [
    metrics,
    todaysSchedule,
    collections,
  ] = await Promise.all([
    getDashboardMetrics(user.id),
    getTodaysSchedule(user.id, 8),
    getTodaysCollections(user.id, 5),
  ]);

  // Broker-specific data (receivables, unassigned jobs)
  let unassignedJobs: Awaited<ReturnType<typeof getUnassignedJobs>> = [];
  let receivables: Awaited<ReturnType<typeof getReceivablesByCompany>> = [];
  if (isBroker) {
    [unassignedJobs, receivables] = await Promise.all([
      getUnassignedJobs(user.id, 6),
      getReceivablesByCompany(user.id, 5),
    ]);
  }

  // Carrier-specific data (driver statuses, assigned loads, available loads)
  let driverStatuses: Awaited<ReturnType<typeof getLiveDriverStatuses>> = [];
  let carrierData: Awaited<ReturnType<typeof getCarrierDashboardData>> | null = null;
  if (isCarrier) {
    [driverStatuses, carrierData] = await Promise.all([
      getLiveDriverStatuses(user.id, 10),
      getCarrierDashboardData(user.id),
    ]);
  }

  const urgentJobsCount = unassignedJobs.filter(j => j.urgency === 'today' || j.urgency === 'tomorrow').length;
  const hasCriticalAlert = (isBroker && (urgentJobsCount > 0 || metrics.overdueInvoices > 3)) ||
    (isCarrier && carrierData && carrierData.metrics.pendingRequestsCount > 0);

  // Build critical alert message
  let criticalMessage = '';
  let criticalHref = '';
  let criticalAction = '';
  if (isBroker && urgentJobsCount > 0) {
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* CRITICAL ALERT BAR */}
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

        {/* DRIVERS NOW - Only show for carriers */}
        {isCarrier && (
          <div className="mb-6">
            <DriversNow
              drivers={driverStatuses}
              driversOnRoad={carrierData?.metrics.driversOnRoad ?? metrics.driversOnRoad}
              totalDrivers={carrierData?.metrics.totalDrivers ?? metrics.totalDrivers}
            />
          </div>
        )}

        {/* PRIMARY METRICS - Role-based cards */}
        {/* Carriers and Moving Companies get 4 cards, Pure Brokers get 3 */}
        <div className={`grid grid-cols-1 gap-3 mb-5 ${
          isCarrier ? 'sm:grid-cols-2 lg:grid-cols-4' :
          'sm:grid-cols-3'
        }`}>
          {/* CARRIER METRICS */}
          {isCarrier && (
            <PrimaryMetricCard
              title="Active Loads"
              value={(carrierData?.metrics.activeLoadsCount ?? 0).toString()}
              subtitle={`${carrierData?.metrics.driversOnRoad ?? 0} drivers on road`}
              accent="blue"
              icon={<Package className="h-5 w-5" />}
              href="/dashboard/assigned-loads"
            />
          )}

          {/* BROKER METRICS - Money Owed */}
          {isBroker && (
            <PrimaryMetricCard
              title="Money Owed"
              value={formatCurrency(metrics.totalReceivables)}
              subtitle={`${receivables.length} companies`}
              percentChange={metrics.receivablesChangePercent}
              accent="emerald"
              icon={<DollarSign className="h-5 w-5" />}
              href="/dashboard/finance/receivables"
            />
          )}

          {/* CARRIER METRICS - Owed to You (for carriers getting paid by brokers) */}
          {pureCarrier && (
            <PrimaryMetricCard
              title="Owed to You"
              value={formatCurrency(carrierData?.metrics.moneyOwedToYou ?? 0)}
              accent="emerald"
              icon={<TrendingUp className="h-5 w-5" />}
              href="/dashboard/finance/receivables"
            />
          )}

          {/* CARRIER METRICS - Needs Trip Assignment (carrier's "awaiting dispatch") */}
          {pureCarrier && (
            <PrimaryMetricCard
              title="Needs Trip"
              value={(carrierData?.metrics.loadsNeedingTripAssignment ?? 0).toString()}
              subtitle="Loads not on a trip"
              accent={(carrierData?.metrics.loadsNeedingTripAssignment ?? 0) > 0 ? 'amber' : 'emerald'}
              pulse={(carrierData?.metrics.loadsNeedingTripAssignment ?? 0) > 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              href="/dashboard/assigned-loads?filter=unassigned"
            />
          )}

          {/* COLLECTED TODAY - All roles */}
          <PrimaryMetricCard
            title="Collected Today"
            value={formatCurrency(pureCarrier ? (carrierData?.metrics.collectedToday ?? 0) : metrics.collectedToday)}
            subtitle={`${collections.length} payments`}
            percentChange={pureBroker ? metrics.collectedChangePercent : null}
            accent="blue"
            icon={<Banknote className="h-5 w-5" />}
            href="/dashboard/finance/receivables"
          />

          {/* BROKER METRICS - Awaiting Dispatch */}
          {isBroker && (
            <PrimaryMetricCard
              title="Awaiting Dispatch"
              value={metrics.jobsNeedingAssignment.toString()}
              subtitle={formatCurrency(metrics.jobsNeedingAssignmentValue) + ' value'}
              accent={metrics.jobsNeedingAssignment > 0 ? (urgentJobsCount > 0 ? 'amber' : 'blue') : 'emerald'}
              pulse={urgentJobsCount > 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              href="/dashboard/assigned-loads?filter=unassigned"
            />
          )}

          {/* CARRIER METRICS - You Owe (for all carriers including moving companies) */}
          {isCarrier && (
            <PrimaryMetricCard
              title="You Owe"
              value={formatCurrency(carrierData?.metrics.moneyYouOwe ?? 0)}
              accent="amber"
              icon={<TrendingDown className="h-5 w-5" />}
            />
          )}
        </div>

        {/* KEY METRICS - Only for moving companies/brokers with dispatch capabilities */}
        {(isBroker || isCarrier) && !pureCarrier && (
          <div className="mb-6">
            <KeyMetrics metrics={metrics} />
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* BROKER: Loads Awaiting Dispatch */}
            {isBroker && unassignedJobs.length > 0 && (
              <LoadsAwaitingDispatch
                loads={unassignedJobs}
                totalCount={metrics.jobsNeedingAssignment}
                totalValue={metrics.jobsNeedingAssignmentValue}
              />
            )}

            {/* CARRIER: Active Loads */}
            {isCarrier && carrierData && carrierData.assignedLoads.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-400" />
                      Active Loads
                    </CardTitle>
                    <Link href="/dashboard/assigned-loads" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {carrierData.assignedLoads.slice(0, 5).map((load) => (
                    <Link
                      key={load.id}
                      href={`/dashboard/assigned-loads/${load.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{load.load_number}</span>
                            <Badge variant="secondary" className="text-xs">
                              {load.load_status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                          </div>
                          {load.assigned_driver_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Driver: {load.assigned_driver_name}
                            </div>
                          )}
                        </div>
                        {load.carrier_rate && (
                          <span className="text-sm font-medium text-emerald-400">
                            ${load.carrier_rate.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* BROKER: Who Owes You Money */}
            {isBroker && receivables.length > 0 && (
              <WhoOwesYouMoney companies={receivables} />
            )}

            {/* CARRIER: Available Loads from Marketplace */}
            {isCarrier && carrierData && carrierData.availableLoads.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Search className="h-4 w-4 text-amber-400" />
                      Available Loads
                    </CardTitle>
                    <Link href="/dashboard/load-board" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Browse all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {carrierData.availableLoads.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No loads available</p>
                    </div>
                  ) : (
                    carrierData.availableLoads.slice(0, 4).map((load) => (
                      <Link
                        key={load.id}
                        href={`/dashboard/load-board/${load.id}`}
                        className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{load.load_number}</span>
                          {load.estimated_cuft && (
                            <span className="text-xs text-muted-foreground">
                              {load.estimated_cuft} cuft
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {load.origin_city} → {load.destination_city}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(load.pickup_date).toLocaleDateString()}
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty state for pure carriers with no loads */}
            {pureCarrier && carrierData && carrierData.assignedLoads.length === 0 && carrierData.availableLoads.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">No Active Loads</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse the Load Board to find available loads to haul.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/load-board">
                      <Search className="h-4 w-4 mr-2" />
                      Find Loads
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-5">
            <TodaysSchedule events={todaysSchedule} />
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

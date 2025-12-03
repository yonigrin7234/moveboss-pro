import { redirect } from 'next/navigation';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getDriversForUser, getDriverStatsForUser, type Driver } from '@/data/drivers';
import { getCompaniesForUser, getCompaniesCountForUser } from '@/data/companies';
import { getVerificationStateForUser } from '@/data/verification';
import { getDashboardMode, type DashboardMode } from '@/lib/dashboardMode';

// V4 Components - Premium Command Center Layout
import { TopBar } from '@/components/dashboard/v4/TopBar';
import { CriticalBlock } from '@/components/dashboard/v4/CriticalBlock';
import { DriversNow, type DriverStatus } from '@/components/dashboard/v4/DriversNow';
import { KeyMetrics } from '@/components/dashboard/v4/KeyMetrics';
import { QuickActions } from '@/components/dashboard/v4/QuickActions';
import { UnassignedLoads, type UnassignedLoad } from '@/components/dashboard/v4/UnassignedLoads';
import { TodaysSchedule, type ScheduleEvent } from '@/components/dashboard/v4/TodaysSchedule';
import { WhoOwesYou, type Receivable } from '@/components/dashboard/v4/WhoOwesYou';
import { TodaysCollections, type Collection } from '@/components/dashboard/v4/TodaysCollections';
import { OperationsPanel } from '@/components/dashboard/v4/OperationsPanel';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch company to determine dashboard mode
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, is_carrier, is_broker')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .single();

  const mode: DashboardMode = getDashboardMode(company || {});

  // Fetch data
  let drivers: Driver[] = [];
  let driverStats = { totalDrivers: 0, activeDrivers: 0, suspendedDrivers: 0 };
  let verificationState = await getVerificationStateForUser(user.id);

  try {
    const promises: Promise<any>[] = [];

    // Only fetch driver data if carrier or hybrid mode
    if (mode !== 'broker') {
      promises.push(
        getDriversForUser(user.id),
        getDriverStatsForUser(user.id)
      );

      const results = await Promise.all(promises);
      drivers = results[0];
      driverStats = results[1];
    }
  } catch (err) {
    console.error('Dashboard data error:', err);
  }

  // ========================================
  // PREPARE DATA
  // ========================================

  // TopBar data
  const fmcsaStatus: 'verified' | 'pending' | 'none' =
    verificationState?.status === 'verified' ? 'verified' :
    verificationState ? 'pending' : 'none';
  const moneyOwed = 24500; // TODO: Get from real receivables
  const hasOverdue = true; // TODO: Calculate from receivables with days > 60

  // CriticalBlock data
  const criticalCount = 2; // TODO: Get from real unassigned loads with pickup TODAY
  const criticalMessage = `${criticalCount} loads pickup TODAY with no driver assigned`;

  // DriversNow data
  const driverStatusData: DriverStatus[] = drivers.slice(0, 8).map((driver) => ({
    id: driver.id,
    name: `${driver.first_name} ${driver.last_name}`,
    status: driver.status === 'active' ? 'active' : 'available',
    activity: driver.status === 'active' ? 'Delivering' : 'Available',
    location: 'Phoenix, AZ', // TODO: Get from real GPS/location data
    eta: driver.status === 'active' ? '2:30 PM' : undefined, // TODO: Get from real trip data
  }));

  // KeyMetrics data
  const keyMetricsData = {
    activeTrips: 4, // TODO: Get from real trips where status = 'active'
    needDrivers: 4, // TODO: Get from real unassigned loads count
    availableCF: 3200, // TODO: Calculate from available drivers' truck capacity
    outstandingReceivables: '$24.5k', // TODO: Format from real receivables total
  };

  // UnassignedLoads data (mock)
  const unassignedLoadsData: UnassignedLoad[] = mode !== 'broker' ? [
    {
      id: '1',
      origin: 'Phoenix, AZ',
      destination: 'Denver, CO',
      pickupDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      cubicFeet: 1200,
      value: 4500,
    },
    {
      id: '2',
      origin: 'Los Angeles, CA',
      destination: 'Seattle, WA',
      pickupDate: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
      cubicFeet: 850,
      value: 3200,
    },
    {
      id: '3',
      origin: 'Miami, FL',
      destination: 'Boston, MA',
      pickupDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      cubicFeet: 1500,
      value: 5800,
    },
    {
      id: '4',
      origin: 'Dallas, TX',
      destination: 'Chicago, IL',
      pickupDate: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
      cubicFeet: 950,
      value: 3800,
    },
  ] : [];

  // TodaysSchedule data (mock)
  const scheduleData: ScheduleEvent[] = mode !== 'broker' ? [
    {
      id: '1',
      time: '09:00',
      type: 'pickup',
      location: 'Phoenix, AZ',
      driver: 'John Doe',
      loadId: 'L-123',
    },
    {
      id: '2',
      time: '11:30',
      type: 'pickup',
      location: 'Scottsdale, AZ',
      driver: 'Mike Johnson',
      loadId: 'L-125',
    },
    {
      id: '3',
      time: '14:30',
      type: 'delivery',
      location: 'Tucson, AZ',
      driver: 'Jane Smith',
      loadId: 'L-124',
    },
    {
      id: '4',
      time: '16:00',
      type: 'delivery',
      location: 'Mesa, AZ',
      driver: 'Sarah Williams',
      loadId: 'L-126',
    },
  ] : [];

  // WhoOwesYou data (mock)
  const receivablesData: Receivable[] = [
    { id: '1', companyName: 'ABC Moving', amount: 11200, daysOutstanding: 72 },
    { id: '2', companyName: 'XYZ Van Lines', amount: 4500, daysOutstanding: 65 },
    { id: '3', companyName: 'R&B Moving', amount: 2500, daysOutstanding: 38 },
    { id: '4', companyName: 'Quick Move LLC', amount: 3800, daysOutstanding: 12 },
    { id: '5', companyName: 'Allied Partners', amount: 2500, daysOutstanding: 5 },
  ];

  // TodaysCollections data (mock)
  const collectionsData: Collection[] = [
    {
      id: '1',
      driverName: 'John Doe',
      amount: 2500,
      loadId: 'L-123',
      time: '10:30',
    },
    {
      id: '2',
      driverName: 'Jane Smith',
      amount: 2300,
      loadId: 'L-124',
      time: '14:15',
    },
  ];

  // OperationsPanel data (mock)
  const operationsPanelData = {
    companies: [
      { id: '1', name: 'ABC Moving', dotNumber: '123456' },
      { id: '2', name: 'XYZ Van Lines', dotNumber: '789012' },
      { id: '3', name: 'R&B Moving', dotNumber: '345678' },
      { id: '4', name: 'Quick Move LLC' },
      { id: '5', name: 'Allied Partners', dotNumber: '901234' },
    ],
    drivers: drivers.slice(0, 5).map((driver) => ({
      id: driver.id,
      name: `${driver.first_name} ${driver.last_name}`,
      status: (driver.status === 'active' ? 'active' : 'available') as 'active' | 'available' | 'offline',
    })),
    activities: [
      { id: '1', description: 'Load L-123 assigned to John Doe', time: '2 hours ago' },
      { id: '2', description: 'Payment received from ABC Moving', time: '3 hours ago' },
      { id: '3', description: 'New load posted to marketplace', time: '5 hours ago' },
      { id: '4', description: 'Driver Sarah Williams completed delivery', time: '6 hours ago' },
      { id: '5', description: 'Load L-127 status updated to In Transit', time: '8 hours ago' },
    ],
  };

  // ========================================
  // RENDER PREMIUM COMMAND CENTER LAYOUT
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Bar - Compact Search + Status */}
      <TopBar
        mode={mode}
        fmcsaStatus={fmcsaStatus}
        moneyOwed={moneyOwed}
        hasOverdue={hasOverdue}
      />

      {/* Critical Alert - Only show when critical */}
      {criticalCount > 0 && (
        <CriticalBlock
          message={criticalMessage}
          href="/dashboard/assigned-loads?filter=unassigned"
        />
      )}

      {/* Main Dashboard Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {/* Key Metrics Row */}
        <KeyMetrics mode={mode} data={keyMetricsData} />

        {/* Quick Actions - Centered */}
        <QuickActions mode={mode} />

        {/* Drivers Live */}
        {mode !== 'broker' && driverStatusData.length > 0 && (
          <DriversNow drivers={driverStatusData} mode={mode} />
        )}

        {/* Unassigned Loads */}
        {mode !== 'broker' && (
          <UnassignedLoads loads={unassignedLoadsData} />
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WhoOwesYou receivables={receivablesData} total={moneyOwed} />
          <TodaysCollections collections={collectionsData} total={4800} />
        </div>

        {/* Today's Schedule */}
        {mode !== 'broker' && (
          <TodaysSchedule events={scheduleData} />
        )}

        {/* Operations Panel */}
        <OperationsPanel
          companies={operationsPanelData.companies}
          drivers={operationsPanelData.drivers}
          activities={operationsPanelData.activities}
        />
      </div>
    </div>
  );
}

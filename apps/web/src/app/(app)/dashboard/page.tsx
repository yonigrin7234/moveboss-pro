import { redirect } from 'next/navigation';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getDriversForUser, getDriverStatsForUser, type Driver } from '@/data/drivers';
import { getCompaniesForUser, getCompaniesCountForUser } from '@/data/companies';
import { getVerificationStateForUser } from '@/data/verification';
import { getDashboardMode, type DashboardMode } from '@/lib/dashboardMode';

// OBS Components
import { TopBar } from '@/components/dashboard/obs/TopBar';
import { CriticalBlock } from '@/components/dashboard/obs/CriticalBlock';
import { DriversNow, type DriverStatus } from '@/components/dashboard/obs/DriversNow';
import { KeyMetrics } from '@/components/dashboard/obs/KeyMetrics';
import { QuickActions } from '@/components/dashboard/obs/QuickActions';
import { UnassignedLoads, type UnassignedLoad } from '@/components/dashboard/obs/UnassignedLoads';
import { TodaysSchedule, type ScheduleEvent } from '@/components/dashboard/obs/TodaysSchedule';
import { WhoOwesYou, type Receivable } from '@/components/dashboard/obs/WhoOwesYou';
import { TodaysCollections, type Collection } from '@/components/dashboard/obs/TodaysCollections';
import { AttentionList, type AttentionItem } from '@/components/dashboard/obs/AttentionList';

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
  // PREPARE OBS DATA
  // ========================================

  // TopBar data
  const fmcsaStatus: 'verified' | 'pending' | 'none' =
    verificationState?.status === 'verified' ? 'verified' :
    verificationState ? 'pending' : 'none';
  const moneyOwed = 24500; // TODO: Get from real data
  const hasOverdue = true; // TODO: Calculate from receivables

  // CriticalBlock data
  const criticalCount = 2; // TODO: Get from real unassigned loads with pickup TODAY
  const criticalMessage = `${criticalCount} loads pickup TODAY with no driver assigned`;

  // DriversNow data
  const driverStatusData: DriverStatus[] = drivers.map((driver) => ({
    id: driver.id,
    name: `${driver.first_name} ${driver.last_name}`,
    status: driver.status === 'active' ? 'active' : 'available',
    activity: driver.status === 'active' ? 'Delivering' : 'Available',
    location: 'Phoenix, AZ', // TODO: Get from real data
  }));

  // KeyMetrics data
  const keyMetricsData = {
    activeTrips: 4, // TODO: Get from real data
    needDrivers: 4, // TODO: Get from real unassigned loads
    availableCF: 3200, // TODO: Calculate from available drivers
    moneyOwed: '$24.5k',
    postedLoads: 12, // TODO: Get from real data
    pendingRequests: 3, // TODO: Get from real data
    activeLoads: 8, // TODO: Get from real data
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
      time: '14:30',
      type: 'delivery',
      location: 'Tucson, AZ',
      driver: 'Jane Smith',
      loadId: 'L-124',
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

  // AttentionList data (mock)
  const attentionItems: AttentionItem[] = [
    {
      id: '1',
      severity: 'warning',
      label: 'Pending Settlements',
      count: 1,
      href: '/dashboard/finance/settlements?status=pending',
    },
    {
      id: '2',
      severity: 'info',
      label: 'Documents Expiring Soon',
      count: 3,
      href: '/dashboard/compliance',
    },
  ];

  // ========================================
  // RENDER OBS STRUCTURE
  // ========================================

  return (
    <div className="min-h-screen bg-background">
      {/* 1. TOP OPERATION BAR */}
      <TopBar
        mode={mode}
        fmcsaStatus={fmcsaStatus}
        moneyOwed={moneyOwed}
        hasOverdue={hasOverdue}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* 2. CRITICAL BLOCK */}
        {criticalCount > 0 && (
          <CriticalBlock
            message={criticalMessage}
            href="/dashboard/assigned-loads?filter=unassigned"
          />
        )}

        {/* 3. DRIVERS LIVE STATUS */}
        {mode !== 'broker' && (
          <DriversNow drivers={driverStatusData} mode={mode} />
        )}

        {/* 4. KEY METRICS */}
        <KeyMetrics mode={mode} data={keyMetricsData} />

        {/* 5. THREE PRIMARY ACTIONS */}
        <QuickActions mode={mode} />

        {/* 6. UNASSIGNED LOADS */}
        {mode !== 'broker' && (
          <UnassignedLoads loads={unassignedLoadsData} />
        )}

        {/* 7. TODAY'S SCHEDULE */}
        {mode !== 'broker' && (
          <TodaysSchedule events={scheduleData} />
        )}

        {/* 8 & 9. TWO-COLUMN: WHO OWES YOU + TODAY'S COLLECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WhoOwesYou receivables={receivablesData} total={moneyOwed} />
          <TodaysCollections collections={collectionsData} total={4800} />
        </div>

        {/* 10. ATTENTION ITEMS */}
        <AttentionList items={attentionItems} />
      </div>
    </div>
  );
}

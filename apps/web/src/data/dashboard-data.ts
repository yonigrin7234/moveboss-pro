import { createClient } from '@/lib/supabase-server';

// =====================================================
// DASHBOARD DATA QUERIES - ALL REAL SUPABASE DATA
// =====================================================

export interface DashboardMetrics {
  // Primary metrics
  totalReceivables: number;
  collectedToday: number;
  jobsNeedingAssignment: number;
  jobsNeedingAssignmentValue: number;

  // Secondary metrics
  activeTrips: number;
  driversOnRoad: number;
  totalDrivers: number;
  pendingSettlements: number;
  overdueInvoices: number;

  // Percentage changes
  receivablesChangePercent: number | null;
  collectedChangePercent: number | null;
}

export type UrgencyLevel = 'today' | 'tomorrow' | 'this_week' | 'later';

export interface UnassignedJob {
  id: string;
  loadNumber: string | null;
  companyName: string | null;
  companyId: string | null;
  origin: string;
  originZip: string | null;
  destination: string;
  destinationZip: string | null;
  pickupDate: string | null;
  pickupWindow: string | null;
  cubicFeet: number | null;
  rate: number | null;
  payout: number | null;
  urgency: UrgencyLevel;
  urgencyLabel: string;
}

export interface ReceivableCompany {
  id: string;
  companyId: string;
  companyName: string;
  initials: string;
  amountOwed: number;
  daysOutstanding: number;
  lastPaymentDate: string | null;
  status: 'current' | 'overdue';
}

export interface DriverCollection {
  id: string;
  driverName: string;
  amount: number;
  paymentMethod: string | null;
  time: string;
  loadId: string | null;
}

export interface LiveDriverStatus {
  id: string;
  name: string;
  initials: string;
  status: 'delivering' | 'loading' | 'in_transit' | 'available' | 'offline';
  location: string | null;
  eta: string | null;
  phone: string | null;
}

export interface ActivityEvent {
  id: string;
  title: string;
  description: string | null;
  time: string;
  type: string;
  driverName: string | null;
}

/**
 * Get all dashboard metrics in one call
 */
export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekIso = lastWeek.toISOString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayIso = yesterday.toISOString();

  // Run all queries in parallel
  const [
    receivablesResult,
    lastWeekReceivablesResult,
    todayPaymentsResult,
    yesterdayPaymentsResult,
    unassignedLoadsResult,
    activeTripsResult,
    driversOnRoadResult,
    totalDriversResult,
    pendingSettlementsResult,
    overdueResult,
  ] = await Promise.all([
    // Total outstanding receivables
    supabase
      .from('receivables')
      .select('amount')
      .eq('owner_id', userId)
      .eq('status', 'open'),

    // Receivables from last week (for % change)
    supabase
      .from('receivables')
      .select('amount')
      .eq('owner_id', userId)
      .eq('status', 'open')
      .lt('created_at', lastWeekIso),

    // Payments collected today
    supabase
      .from('payments')
      .select('amount')
      .eq('owner_id', userId)
      .gte('created_at', todayIso),

    // Payments collected yesterday (for % change)
    supabase
      .from('payments')
      .select('amount')
      .eq('owner_id', userId)
      .gte('created_at', yesterdayIso)
      .lt('created_at', todayIso),

    // Unassigned loads (no driver, status pending/available)
    supabase
      .from('loads')
      .select('id, total_rate, linehaul_amount')
      .eq('owner_id', userId)
      .is('assigned_driver_id', null)
      .in('load_status', ['pending', 'available', 'booked']),

    // Active trips
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', ['active', 'en_route']),

    // Drivers on road (have active trip)
    supabase
      .from('trips')
      .select('driver_id')
      .eq('owner_id', userId)
      .in('status', ['active', 'en_route'])
      .not('driver_id', 'is', null),

    // Total drivers
    supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active'),

    // Pending settlements (completed trips not yet settled)
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'completed'),

    // Overdue invoices
    supabase
      .from('receivables')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'open')
      .lt('due_date', todayIso),
  ]);

  // Calculate totals
  const totalReceivables = (receivablesResult.data || []).reduce(
    (sum, r) => sum + (Number(r.amount) || 0), 0
  );

  const lastWeekReceivables = (lastWeekReceivablesResult.data || []).reduce(
    (sum, r) => sum + (Number(r.amount) || 0), 0
  );

  const collectedToday = (todayPaymentsResult.data || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0), 0
  );

  const collectedYesterday = (yesterdayPaymentsResult.data || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0), 0
  );

  const unassignedLoads = unassignedLoadsResult.data || [];
  const jobsNeedingAssignmentValue = unassignedLoads.reduce(
    (sum, l) => sum + (Number(l.total_rate) || Number(l.linehaul_amount) || 0), 0
  );

  // Get unique drivers on road
  const driversOnRoad = new Set(
    (driversOnRoadResult.data || []).map(t => t.driver_id).filter(Boolean)
  ).size;

  // Calculate percentage changes
  const receivablesChangePercent = lastWeekReceivables > 0
    ? ((totalReceivables - lastWeekReceivables) / lastWeekReceivables) * 100
    : null;

  const collectedChangePercent = collectedYesterday > 0
    ? ((collectedToday - collectedYesterday) / collectedYesterday) * 100
    : null;

  return {
    totalReceivables,
    collectedToday,
    jobsNeedingAssignment: unassignedLoads.length,
    jobsNeedingAssignmentValue,
    activeTrips: activeTripsResult.count || 0,
    driversOnRoad,
    totalDrivers: totalDriversResult.count || 0,
    pendingSettlements: pendingSettlementsResult.count || 0,
    overdueInvoices: overdueResult.count || 0,
    receivablesChangePercent,
    collectedChangePercent,
  };
}

/**
 * Calculate urgency level and label based on pickup date
 */
function calculateUrgency(pickupDate: string | null): { urgency: UrgencyLevel; urgencyLabel: string } {
  if (!pickupDate) {
    return { urgency: 'later', urgencyLabel: 'No date' };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const pickup = new Date(pickupDate);
  pickup.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((pickup.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { urgency: 'today', urgencyLabel: 'Today' };
  } else if (diffDays === 1) {
    return { urgency: 'tomorrow', urgencyLabel: 'Tomorrow' };
  } else if (diffDays <= 7) {
    return { urgency: 'this_week', urgencyLabel: pickup.toLocaleDateString('en-US', { weekday: 'short' }) };
  } else {
    return { urgency: 'later', urgencyLabel: pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  }
}

/**
 * Format location as "City, ST ZIP" - clean format for logistics
 */
function formatLocation(city: string | null, state: string | null, zip: string | null): string {
  const parts = [city, state].filter(Boolean);
  const location = parts.join(', ') || 'TBD';
  if (zip) {
    return `${location} ${zip}`;
  }
  return location;
}

/**
 * Get jobs needing driver assignment
 */
export async function getUnassignedJobs(userId: string, limit = 10): Promise<UnassignedJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      job_number,
      pickup_city,
      pickup_state,
      pickup_zip,
      delivery_city,
      delivery_state,
      delivery_zip,
      pickup_date,
      pickup_time_start,
      pickup_time_end,
      cubic_feet,
      total_rate,
      linehaul_amount,
      company_id,
      company:companies!loads_company_id_fkey(id, name)
    `)
    .eq('owner_id', userId)
    .is('assigned_driver_id', null)
    .in('load_status', ['pending', 'available', 'booked'])
    .order('pickup_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[getUnassignedJobs] Error:', error.message);
    return [];
  }

  return (data || []).map((load: any) => {
    const { urgency, urgencyLabel } = calculateUrgency(load.pickup_date);

    // Format pickup window (e.g., "8AM-12PM")
    let pickupWindow: string | null = null;
    if (load.pickup_time_start || load.pickup_time_end) {
      const formatTime = (t: string) => {
        const [h] = t.split(':');
        const hour = parseInt(h, 10);
        return hour >= 12 ? `${hour === 12 ? 12 : hour - 12}PM` : `${hour || 12}AM`;
      };
      if (load.pickup_time_start && load.pickup_time_end) {
        pickupWindow = `${formatTime(load.pickup_time_start)}-${formatTime(load.pickup_time_end)}`;
      } else if (load.pickup_time_start) {
        pickupWindow = `From ${formatTime(load.pickup_time_start)}`;
      }
    }

    return {
      id: load.id,
      loadNumber: load.load_number || load.job_number,
      companyName: load.company?.name || null,
      companyId: load.company_id,
      origin: formatLocation(load.pickup_city, load.pickup_state, load.pickup_zip),
      originZip: load.pickup_zip || null,
      destination: formatLocation(load.delivery_city, load.delivery_state, load.delivery_zip),
      destinationZip: load.delivery_zip || null,
      pickupDate: load.pickup_date,
      pickupWindow,
      cubicFeet: load.cubic_feet ? Number(load.cubic_feet) : null,
      rate: load.linehaul_amount ? Number(load.linehaul_amount) : null,
      payout: load.total_rate ? Number(load.total_rate) : (load.linehaul_amount ? Number(load.linehaul_amount) : null),
      urgency,
      urgencyLabel,
    };
  });
}

/**
 * Get companies that owe money (receivables grouped by company)
 */
export async function getReceivablesByCompany(userId: string, limit = 10): Promise<ReceivableCompany[]> {
  const supabase = await createClient();
  const today = new Date();

  const { data, error } = await supabase
    .from('receivables')
    .select(`
      id,
      amount,
      due_date,
      created_at,
      company_id,
      company:companies!receivables_company_id_fkey(id, name)
    `)
    .eq('owner_id', userId)
    .eq('status', 'open')
    .order('amount', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[getReceivablesByCompany] Error:', error.message);
    return [];
  }

  // Group by company
  const byCompany = new Map<string, {
    companyId: string;
    companyName: string;
    total: number;
    oldestDue: Date | null;
    lastPaymentDate: string | null;
  }>();

  for (const r of data || []) {
    const companyId = r.company_id;
    if (!companyId) continue;

    const companyName = (r.company as any)?.name || 'Unknown';
    const amount = Number(r.amount) || 0;
    const dueDate = r.due_date ? new Date(r.due_date) : null;

    if (!byCompany.has(companyId)) {
      byCompany.set(companyId, {
        companyId,
        companyName,
        total: 0,
        oldestDue: null,
        lastPaymentDate: null,
      });
    }

    const entry = byCompany.get(companyId)!;
    entry.total += amount;
    if (dueDate && (!entry.oldestDue || dueDate < entry.oldestDue)) {
      entry.oldestDue = dueDate;
    }
  }

  // Convert to array and sort by amount
  const result: ReceivableCompany[] = Array.from(byCompany.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(entry => {
      const daysOutstanding = entry.oldestDue
        ? Math.max(0, Math.floor((today.getTime() - entry.oldestDue.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        id: entry.companyId,
        companyId: entry.companyId,
        companyName: entry.companyName,
        initials: entry.companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        amountOwed: entry.total,
        daysOutstanding,
        lastPaymentDate: entry.lastPaymentDate,
        status: daysOutstanding > 30 ? 'overdue' : 'current',
      };
    });

  return result;
}

/**
 * Get driver collections for today
 */
export async function getTodaysCollections(userId: string, limit = 10): Promise<DriverCollection[]> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_method,
      created_at,
      load_id,
      driver_id,
      driver:drivers!payments_driver_id_fkey(first_name, last_name)
    `)
    .eq('owner_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getTodaysCollections] Error:', error.message);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    driverName: p.driver
      ? `${p.driver.first_name} ${p.driver.last_name}`
      : 'Unknown',
    amount: Number(p.amount) || 0,
    paymentMethod: p.payment_method,
    time: new Date(p.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    loadId: p.load_id,
  }));
}

/**
 * Get live driver statuses
 */
export async function getLiveDriverStatuses(userId: string, limit = 10): Promise<LiveDriverStatus[]> {
  const supabase = await createClient();

  // Get all active drivers
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, phone, status')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .order('first_name', { ascending: true })
    .limit(limit);

  if (driversError) {
    console.error('[getLiveDriverStatuses] Error:', driversError.message);
    return [];
  }

  // Get active trips to determine who's on the road
  const { data: activeTrips } = await supabase
    .from('trips')
    .select('driver_id, status, destination_city, destination_state')
    .eq('owner_id', userId)
    .in('status', ['active', 'en_route'])
    .not('driver_id', 'is', null);

  const tripByDriver = new Map<string, any>();
  for (const trip of activeTrips || []) {
    if (trip.driver_id) {
      tripByDriver.set(trip.driver_id, trip);
    }
  }

  return (drivers || []).map(driver => {
    const trip = tripByDriver.get(driver.id);
    let status: LiveDriverStatus['status'] = 'available';
    let location: string | null = null;

    if (trip) {
      status = trip.status === 'en_route' ? 'in_transit' : 'delivering';
      location = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ') || null;
    }

    return {
      id: driver.id,
      name: `${driver.first_name} ${driver.last_name}`,
      initials: `${driver.first_name[0]}${driver.last_name[0]}`.toUpperCase(),
      status,
      location,
      eta: null, // Would need real-time tracking
      phone: driver.phone,
    };
  });
}

/**
 * Get recent activity
 */
export async function getRecentDashboardActivity(userId: string, limit = 10): Promise<ActivityEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, title, description, created_at, activity_type, driver_name')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getRecentDashboardActivity] Error:', error.message);
    return [];
  }

  return (data || []).map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    time: formatRelativeTime(new Date(a.created_at)),
    type: a.activity_type,
    driverName: a.driver_name,
  }));
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

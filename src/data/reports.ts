import { createClient } from '@/lib/supabase-server';

// ============================================
// REVENUE REPORT
// ============================================

export interface RevenueReportData {
  period: string;
  total_revenue: number;
  load_count: number;
  total_cuft: number;
  avg_revenue_per_load: number;
  avg_rate_per_cuft: number;
}

export interface RevenueByCustomer {
  company_id: string;
  company_name: string;
  total_revenue: number;
  load_count: number;
  avg_revenue_per_load: number;
}

export interface RevenueByLane {
  origin_state: string;
  destination_state: string;
  total_revenue: number;
  load_count: number;
  total_miles: number;
  avg_revenue_per_mile: number;
}

export async function getRevenueReport(
  carrierId: string,
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' | 'month' = 'month'
): Promise<RevenueReportData[]> {
  const supabase = await createClient();

  // Get delivered loads in date range
  const { data: loads, error } = await supabase
    .from('loads')
    .select(`
      id,
      delivered_at,
      carrier_rate,
      carrier_rate_type,
      estimated_cuft,
      estimated_weight_lbs
    `)
    .eq('assigned_carrier_id', carrierId)
    .eq('load_status', 'delivered')
    .gte('delivered_at', startDate)
    .lte('delivered_at', endDate)
    .order('delivered_at');

  if (error || !loads) return [];

  // Group by period
  const grouped: Record<string, { revenue: number; count: number; cuft: number }> = {};

  loads.forEach((load) => {
    if (!load.delivered_at) return;
    const date = new Date(load.delivered_at);
    let periodKey: string;

    if (groupBy === 'day') {
      periodKey = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split('T')[0];
    } else {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[periodKey]) {
      grouped[periodKey] = { revenue: 0, count: 0, cuft: 0 };
    }

    // Calculate revenue
    let revenue = 0;
    if (load.carrier_rate_type === 'per_cuft') {
      revenue = (load.carrier_rate || 0) * (load.estimated_cuft || 0);
    } else if (load.carrier_rate_type === 'per_cwt') {
      revenue = (load.carrier_rate || 0) * ((load.estimated_weight_lbs || 0) / 100);
    } else {
      revenue = (load.carrier_rate || 0) * (load.estimated_cuft || 0);
    }

    grouped[periodKey].revenue += revenue;
    grouped[periodKey].count += 1;
    grouped[periodKey].cuft += load.estimated_cuft || 0;
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      total_revenue: Math.round(data.revenue * 100) / 100,
      load_count: data.count,
      total_cuft: data.cuft,
      avg_revenue_per_load:
        data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
      avg_rate_per_cuft:
        data.cuft > 0 ? Math.round((data.revenue / data.cuft) * 100) / 100 : 0,
    }));
}

export async function getRevenueByCustomer(
  carrierId: string,
  startDate: string,
  endDate: string
): Promise<RevenueByCustomer[]> {
  const supabase = await createClient();

  const { data: loads } = await supabase
    .from('loads')
    .select(
      `
      carrier_rate,
      carrier_rate_type,
      estimated_cuft,
      estimated_weight_lbs,
      company:companies!loads_company_id_fkey(id, name)
    `
    )
    .eq('assigned_carrier_id', carrierId)
    .eq('load_status', 'delivered')
    .gte('delivered_at', startDate)
    .lte('delivered_at', endDate);

  if (!loads) return [];

  const byCustomer: Record<string, { name: string; revenue: number; count: number }> = {};

  loads.forEach((load) => {
    const company = Array.isArray(load.company) ? load.company[0] : load.company;
    const companyId = company?.id;
    if (!companyId) return;

    if (!byCustomer[companyId]) {
      byCustomer[companyId] = { name: company.name, revenue: 0, count: 0 };
    }

    let revenue = 0;
    if (load.carrier_rate_type === 'per_cuft') {
      revenue = (load.carrier_rate || 0) * (load.estimated_cuft || 0);
    } else {
      revenue = (load.carrier_rate || 0) * (load.estimated_cuft || 0);
    }

    byCustomer[companyId].revenue += revenue;
    byCustomer[companyId].count += 1;
  });

  return Object.entries(byCustomer)
    .map(([id, data]) => ({
      company_id: id,
      company_name: data.name,
      total_revenue: Math.round(data.revenue * 100) / 100,
      load_count: data.count,
      avg_revenue_per_load:
        data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

export async function getRevenueByLane(
  carrierId: string,
  startDate: string,
  endDate: string
): Promise<RevenueByLane[]> {
  const supabase = await createClient();

  const { data: loads } = await supabase
    .from('loads')
    .select(
      `
      origin_state,
      destination_state,
      carrier_rate,
      carrier_rate_type,
      estimated_cuft,
      estimated_miles
    `
    )
    .eq('assigned_carrier_id', carrierId)
    .eq('load_status', 'delivered')
    .gte('delivered_at', startDate)
    .lte('delivered_at', endDate);

  if (!loads) return [];

  const byLane: Record<string, { revenue: number; count: number; miles: number }> = {};

  loads.forEach((load) => {
    const laneKey = `${load.origin_state || 'Unknown'}-${load.destination_state || 'Unknown'}`;

    if (!byLane[laneKey]) {
      byLane[laneKey] = { revenue: 0, count: 0, miles: 0 };
    }

    const revenue = (load.carrier_rate || 0) * (load.estimated_cuft || 0);

    byLane[laneKey].revenue += revenue;
    byLane[laneKey].count += 1;
    byLane[laneKey].miles += load.estimated_miles || 0;
  });

  return Object.entries(byLane)
    .map(([lane, data]) => {
      const [origin, destination] = lane.split('-');
      return {
        origin_state: origin,
        destination_state: destination,
        total_revenue: Math.round(data.revenue * 100) / 100,
        load_count: data.count,
        total_miles: data.miles,
        avg_revenue_per_mile:
          data.miles > 0 ? Math.round((data.revenue / data.miles) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

// ============================================
// TRIP PROFITABILITY REPORT
// ============================================

export interface TripProfitabilityData {
  trip_id: string;
  trip_number: string;
  route: string;
  completed_at: string;
  total_revenue: number;
  total_costs: number;
  driver_pay: number;
  net_profit: number;
  profit_margin: number;
  total_miles: number;
  revenue_per_mile: number;
  cost_per_mile: number;
}

export interface ProfitabilitySummary {
  total_trips: number;
  total_revenue: number;
  total_costs: number;
  total_driver_pay: number;
  total_net_profit: number;
  avg_margin: number;
  profitable_trips: number;
  unprofitable_trips: number;
}

export async function getTripProfitabilityReport(
  ownerId: string,
  startDate: string,
  endDate: string
): Promise<{ trips: TripProfitabilityData[]; summary: ProfitabilitySummary }> {
  const supabase = await createClient();

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', ownerId)
    .in('status', ['completed', 'settled'])
    .gte('end_date', startDate)
    .lte('end_date', endDate)
    .order('end_date', { ascending: false });

  if (!trips || trips.length === 0) {
    return {
      trips: [],
      summary: {
        total_trips: 0,
        total_revenue: 0,
        total_costs: 0,
        total_driver_pay: 0,
        total_net_profit: 0,
        avg_margin: 0,
        profitable_trips: 0,
        unprofitable_trips: 0,
      },
    };
  }

  const tripData: TripProfitabilityData[] = trips.map((trip) => {
    const totalCosts =
      (trip.fuel_total || 0) + (trip.tolls_total || 0) + (trip.other_expenses_total || 0);
    const driverPay = trip.driver_pay_total || 0;
    const revenue = trip.revenue_total || 0;
    const netProfit = revenue - totalCosts - driverPay;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const totalMiles = trip.total_miles || trip.actual_miles || 0;

    return {
      trip_id: trip.id,
      trip_number: trip.trip_number,
      route: `${trip.origin_city || '?'}, ${trip.origin_state || '?'} → ${trip.destination_city || '?'}, ${trip.destination_state || '?'}`,
      completed_at: trip.end_date || trip.updated_at,
      total_revenue: revenue,
      total_costs: totalCosts,
      driver_pay: driverPay,
      net_profit: Math.round(netProfit * 100) / 100,
      profit_margin: Math.round(profitMargin * 10) / 10,
      total_miles: totalMiles,
      revenue_per_mile: totalMiles > 0 ? Math.round((revenue / totalMiles) * 100) / 100 : 0,
      cost_per_mile:
        totalMiles > 0 ? Math.round(((totalCosts + driverPay) / totalMiles) * 100) / 100 : 0,
    };
  });

  const summary: ProfitabilitySummary = {
    total_trips: tripData.length,
    total_revenue: Math.round(tripData.reduce((sum, t) => sum + t.total_revenue, 0) * 100) / 100,
    total_costs: Math.round(tripData.reduce((sum, t) => sum + t.total_costs, 0) * 100) / 100,
    total_driver_pay: Math.round(tripData.reduce((sum, t) => sum + t.driver_pay, 0) * 100) / 100,
    total_net_profit: Math.round(tripData.reduce((sum, t) => sum + t.net_profit, 0) * 100) / 100,
    avg_margin:
      tripData.length > 0
        ? Math.round((tripData.reduce((sum, t) => sum + t.profit_margin, 0) / tripData.length) * 10) /
          10
        : 0,
    profitable_trips: tripData.filter((t) => t.net_profit > 0).length,
    unprofitable_trips: tripData.filter((t) => t.net_profit <= 0).length,
  };

  return { trips: tripData, summary };
}

// ============================================
// DRIVER PERFORMANCE REPORT
// ============================================

export interface DriverPerformanceData {
  driver_id: string;
  driver_name: string;
  trip_count: number;
  load_count: number;
  total_miles: number;
  total_revenue_generated: number;
  total_pay: number;
  avg_pay_per_trip: number;
  avg_revenue_per_mile: number;
}

export async function getDriverPerformanceReport(
  ownerId: string,
  startDate: string,
  endDate: string
): Promise<DriverPerformanceData[]> {
  const supabase = await createClient();

  // Get completed trips with driver info
  const { data: trips } = await supabase
    .from('trips')
    .select(
      `
      id,
      driver_id,
      revenue_total,
      total_miles,
      actual_miles,
      driver_pay_total,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name)
    `
    )
    .eq('owner_id', ownerId)
    .in('status', ['completed', 'settled'])
    .not('driver_id', 'is', null)
    .gte('end_date', startDate)
    .lte('end_date', endDate);

  if (!trips) return [];

  // Get load counts per trip
  const tripIds = trips.map((t) => t.id);
  const { data: tripLoads } = await supabase
    .from('trip_loads')
    .select('trip_id')
    .in('trip_id', tripIds);

  const loadCountByTrip: Record<string, number> = {};
  tripLoads?.forEach((tl) => {
    loadCountByTrip[tl.trip_id] = (loadCountByTrip[tl.trip_id] || 0) + 1;
  });

  // Group by driver
  const byDriver: Record<
    string,
    {
      name: string;
      trips: number;
      loads: number;
      miles: number;
      revenue: number;
      pay: number;
    }
  > = {};

  trips.forEach((trip) => {
    if (!trip.driver_id || !trip.driver) return;
    const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
    if (!driver) return;

    if (!byDriver[trip.driver_id]) {
      byDriver[trip.driver_id] = {
        name: `${driver.first_name} ${driver.last_name}`,
        trips: 0,
        loads: 0,
        miles: 0,
        revenue: 0,
        pay: 0,
      };
    }

    byDriver[trip.driver_id].trips += 1;
    byDriver[trip.driver_id].loads += loadCountByTrip[trip.id] || 0;
    byDriver[trip.driver_id].miles += trip.actual_miles || trip.total_miles || 0;
    byDriver[trip.driver_id].revenue += trip.revenue_total || 0;
    byDriver[trip.driver_id].pay += trip.driver_pay_total || 0;
  });

  return Object.entries(byDriver)
    .map(([driverId, data]) => ({
      driver_id: driverId,
      driver_name: data.name,
      trip_count: data.trips,
      load_count: data.loads,
      total_miles: data.miles,
      total_revenue_generated: Math.round(data.revenue * 100) / 100,
      total_pay: Math.round(data.pay * 100) / 100,
      avg_pay_per_trip: data.trips > 0 ? Math.round((data.pay / data.trips) * 100) / 100 : 0,
      avg_revenue_per_mile: data.miles > 0 ? Math.round((data.revenue / data.miles) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.total_revenue_generated - a.total_revenue_generated);
}

// ============================================
// COMPLIANCE REPORT
// ============================================

export interface ComplianceReportData {
  category: 'vehicle' | 'driver' | 'partnership';
  item_name: string;
  item_id: string;
  document_type: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
}

export async function getComplianceReport(ownerId: string): Promise<{
  items: ComplianceReportData[];
  summary: { valid: number; expiring: number; expired: number; missing: number };
}> {
  const supabase = await createClient();

  const items: ComplianceReportData[] = [];
  const today = new Date();

  function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getStatus(days: number | null): 'valid' | 'expiring' | 'expired' | 'missing' {
    if (days === null) return 'missing';
    if (days <= 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'valid';
  }

  // Get trucks (vehicles)
  const { data: trucks } = await supabase
    .from('trucks')
    .select('id, unit_number, vehicle_type, registration_expiry, inspection_expiry, insurance_expiry')
    .eq('owner_id', ownerId);

  trucks?.forEach((truck) => {
    const truckName = `${truck.unit_number} - ${truck.vehicle_type || 'Truck'}`;

    // Registration
    const regDays = getDaysUntil(truck.registration_expiry);
    items.push({
      category: 'vehicle',
      item_name: truckName,
      item_id: truck.id,
      document_type: 'Registration',
      expiry_date: truck.registration_expiry,
      days_until_expiry: regDays,
      status: getStatus(regDays),
    });

    // Inspection
    const inspDays = getDaysUntil(truck.inspection_expiry);
    items.push({
      category: 'vehicle',
      item_name: truckName,
      item_id: truck.id,
      document_type: 'Annual Inspection',
      expiry_date: truck.inspection_expiry,
      days_until_expiry: inspDays,
      status: getStatus(inspDays),
    });

    // Insurance
    const insDays = getDaysUntil(truck.insurance_expiry);
    items.push({
      category: 'vehicle',
      item_name: truckName,
      item_id: truck.id,
      document_type: 'Insurance',
      expiry_date: truck.insurance_expiry,
      days_until_expiry: insDays,
      status: getStatus(insDays),
    });
  });

  // Get drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, cdl_expiry, medical_card_expiry, twic_expiry, mvr_date')
    .eq('owner_id', ownerId);

  drivers?.forEach((driver) => {
    const driverName = `${driver.first_name} ${driver.last_name}`;

    // CDL
    const cdlDays = getDaysUntil(driver.cdl_expiry);
    items.push({
      category: 'driver',
      item_name: driverName,
      item_id: driver.id,
      document_type: 'CDL',
      expiry_date: driver.cdl_expiry,
      days_until_expiry: cdlDays,
      status: getStatus(cdlDays),
    });

    // Medical Card
    const medDays = getDaysUntil(driver.medical_card_expiry);
    items.push({
      category: 'driver',
      item_name: driverName,
      item_id: driver.id,
      document_type: 'Medical Card',
      expiry_date: driver.medical_card_expiry,
      days_until_expiry: medDays,
      status: getStatus(medDays),
    });

    // TWIC (if applicable)
    if (driver.twic_expiry) {
      const twicDays = getDaysUntil(driver.twic_expiry);
      items.push({
        category: 'driver',
        item_name: driverName,
        item_id: driver.id,
        document_type: 'TWIC Card',
        expiry_date: driver.twic_expiry,
        days_until_expiry: twicDays,
        status: getStatus(twicDays),
      });
    }
  });

  // Summary
  const summary = {
    valid: items.filter((i) => i.status === 'valid').length,
    expiring: items.filter((i) => i.status === 'expiring').length,
    expired: items.filter((i) => i.status === 'expired').length,
    missing: items.filter((i) => i.status === 'missing').length,
  };

  // Sort by urgency
  const statusOrder = { expired: 0, expiring: 1, missing: 2, valid: 3 };
  items.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return { items, summary };
}

// ============================================
// MARKETPLACE REPORT
// ============================================

export interface MarketplaceReportData {
  total_requests: number;
  accepted_requests: number;
  declined_requests: number;
  pending_requests: number;
  acceptance_rate: number;
  loads_completed: number;
  loads_cancelled: number;
  reliability_rate: number;
  total_revenue: number;
}

export async function getMarketplaceReport(
  carrierId: string,
  startDate: string,
  endDate: string
): Promise<MarketplaceReportData> {
  const supabase = await createClient();

  // Get load requests
  const { data: requests } = await supabase
    .from('load_requests')
    .select('status, created_at, updated_at')
    .eq('carrier_id', carrierId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get loads assigned to this carrier
  const { data: loads } = await supabase
    .from('loads')
    .select(
      `
      load_status,
      carrier_rate,
      carrier_rate_type,
      estimated_cuft,
      cancelled_at
    `
    )
    .eq('assigned_carrier_id', carrierId)
    .gte('carrier_confirmed_at', startDate)
    .lte('carrier_confirmed_at', endDate);

  const totalRequests = requests?.length || 0;
  const acceptedRequests = requests?.filter((r) => r.status === 'accepted').length || 0;
  const declinedRequests = requests?.filter((r) => r.status === 'declined').length || 0;
  const pendingRequests = requests?.filter((r) => r.status === 'pending').length || 0;

  const loadsCompleted = loads?.filter((l) => l.load_status === 'delivered').length || 0;
  const loadsCancelled = loads?.filter((l) => l.cancelled_at).length || 0;

  const totalLoads = loads?.length || 0;

  // Calculate revenue
  let totalRevenue = 0;
  loads
    ?.filter((l) => l.load_status === 'delivered')
    .forEach((load) => {
      totalRevenue += (load.carrier_rate || 0) * (load.estimated_cuft || 0);
    });

  return {
    total_requests: totalRequests,
    accepted_requests: acceptedRequests,
    declined_requests: declinedRequests,
    pending_requests: pendingRequests,
    acceptance_rate: totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0,
    loads_completed: loadsCompleted,
    loads_cancelled: loadsCancelled,
    reliability_rate:
      totalLoads > 0 ? Math.round(((totalLoads - loadsCancelled) / totalLoads) * 100) : 100,
    total_revenue: Math.round(totalRevenue * 100) / 100,
  };
}

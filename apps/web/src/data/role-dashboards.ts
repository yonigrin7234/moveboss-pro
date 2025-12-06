import { createClient } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from './companies';

// ============================================
// BROKER DASHBOARD DATA
// ============================================

export interface BrokerDashboardData {
  loadsPosted: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    status: string;
    request_count: number;
  }[];
  pendingRequests: {
    id: string;
    load_id: string;
    load_number: string;
    carrier_name: string;
    requested_at: string;
    origin_city: string;
    destination_city: string;
  }[];
  loadsInTransit: {
    id: string;
    load_number: string;
    carrier_name: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    load_status: string;
    pickup_date: string;
  }[];
  metrics: {
    totalLoadsPosted: number;
    pendingRequestCount: number;
    loadsInTransitCount: number;
  };
}

export async function getBrokerDashboardData(userId: string): Promise<BrokerDashboardData> {
  const supabase = await createClient();
  const company = await getWorkspaceCompanyForUser(userId);

  if (!company) {
    return {
      loadsPosted: [],
      pendingRequests: [],
      loadsInTransit: [],
      metrics: { totalLoadsPosted: 0, pendingRequestCount: 0, loadsInTransitCount: 0 },
    };
  }

  // Get loads posted to marketplace (not yet assigned)
  const { data: postedLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      posting_status,
      load_requests(id)
    `)
    .eq('company_id', company.id)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null)
    .order('pickup_date', { ascending: true })
    .limit(10);

  // Get pending requests for this company's loads
  const { data: requests } = await supabase
    .from('load_requests')
    .select(`
      id,
      load_id,
      created_at,
      carrier:carrier_id(id, name),
      load:load_id(
        load_number,
        origin_city,
        destination_city
      )
    `)
    .eq('status', 'pending')
    .in('load_id', (postedLoads || []).map(l => l.id).concat(['__placeholder__']))
    .order('created_at', { ascending: false })
    .limit(10);

  // Get loads given out (assigned to carriers, in transit)
  const { data: inTransitLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      load_status,
      assigned_carrier:assigned_carrier_id(id, name)
    `)
    .eq('company_id', company.id)
    .not('assigned_carrier_id', 'is', null)
    .in('load_status', ['accepted', 'loading', 'in_transit'])
    .order('pickup_date', { ascending: true })
    .limit(10);

  // Count total loads posted
  const { count: totalPosted } = await supabase
    .from('loads')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null);

  // Count pending requests
  const { count: pendingCount } = await supabase
    .from('load_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in('load_id', (postedLoads || []).map(l => l.id).concat(['__placeholder__']));

  // Count loads in transit
  const { count: inTransitCount } = await supabase
    .from('loads')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company.id)
    .not('assigned_carrier_id', 'is', null)
    .in('load_status', ['accepted', 'loading', 'in_transit']);

  return {
    loadsPosted: (postedLoads || []).map(l => ({
      id: l.id,
      load_number: l.load_number,
      origin_city: l.origin_city || '',
      origin_state: l.origin_state || '',
      destination_city: l.destination_city || '',
      destination_state: l.destination_state || '',
      pickup_date: l.pickup_date || '',
      status: l.posting_status || 'posted',
      request_count: (l.load_requests as any[])?.length || 0,
    })),
    pendingRequests: (requests || []).map(r => ({
      id: r.id,
      load_id: r.load_id,
      load_number: (r.load as any)?.load_number || '',
      carrier_name: (r.carrier as any)?.name || 'Unknown Carrier',
      requested_at: r.created_at,
      origin_city: (r.load as any)?.origin_city || '',
      destination_city: (r.load as any)?.destination_city || '',
    })),
    loadsInTransit: (inTransitLoads || []).map(l => ({
      id: l.id,
      load_number: l.load_number,
      carrier_name: (l.assigned_carrier as any)?.name || 'Unknown',
      origin_city: l.origin_city || '',
      origin_state: l.origin_state || '',
      destination_city: l.destination_city || '',
      destination_state: l.destination_state || '',
      load_status: l.load_status || 'pending',
      pickup_date: l.pickup_date || '',
    })),
    metrics: {
      totalLoadsPosted: totalPosted || 0,
      pendingRequestCount: pendingCount || 0,
      loadsInTransitCount: inTransitCount || 0,
    },
  };
}

// ============================================
// CARRIER DASHBOARD DATA
// ============================================

export interface CarrierDashboardData {
  assignedLoads: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    load_status: string;
    carrier_rate: number | null;
    assigned_driver_name: string | null;
    source_company_name: string | null;
  }[];
  drivers: {
    id: string;
    name: string;
    status: 'available' | 'on_trip' | 'off_duty';
    current_location?: string;
    current_trip_id?: string;
  }[];
  availableLoads: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    estimated_cuft: number | null;
  }[];
  metrics: {
    activeLoadsCount: number;
    driversOnRoad: number;
    totalDrivers: number;
    earningsThisWeek: number;
    earningsThisMonth: number;
    pendingRequestsCount: number;
  };
}

export async function getCarrierDashboardData(userId: string): Promise<CarrierDashboardData> {
  const supabase = await createClient();
  const company = await getWorkspaceCompanyForUser(userId);

  if (!company) {
    return {
      assignedLoads: [],
      drivers: [],
      availableLoads: [],
      metrics: {
        activeLoadsCount: 0,
        driversOnRoad: 0,
        totalDrivers: 0,
        earningsThisWeek: 0,
        earningsThisMonth: 0,
        pendingRequestsCount: 0,
      },
    };
  }

  // Get assigned loads
  const { data: assignedLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      load_status,
      carrier_rate,
      assigned_driver_name,
      source_company_name
    `)
    .eq('assigned_carrier_id', company.id)
    .in('load_status', ['pending', 'accepted', 'loading', 'in_transit'])
    .order('pickup_date', { ascending: true })
    .limit(10);

  // Get drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name, status, current_trip_id')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .limit(10);

  // Get available loads from marketplace (simplified - just get recent)
  const { data: availableLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      estimated_cuft
    `)
    .eq('posting_status', 'posted')
    .eq('is_marketplace_visible', true)
    .is('assigned_carrier_id', null)
    .neq('company_id', company.id)
    .order('pickup_date', { ascending: true })
    .limit(5);

  // Count active loads
  const { count: activeCount } = await supabase
    .from('loads')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_carrier_id', company.id)
    .in('load_status', ['pending', 'accepted', 'loading', 'in_transit']);

  // Calculate earnings (simplified - sum of carrier_rate for delivered loads)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: weekLoads } = await supabase
    .from('loads')
    .select('carrier_rate')
    .eq('assigned_carrier_id', company.id)
    .eq('load_status', 'delivered')
    .gte('updated_at', startOfWeek.toISOString());

  const { data: monthLoads } = await supabase
    .from('loads')
    .select('carrier_rate')
    .eq('assigned_carrier_id', company.id)
    .eq('load_status', 'delivered')
    .gte('updated_at', startOfMonth.toISOString());

  const earningsThisWeek = (weekLoads || []).reduce((sum, l) => sum + (l.carrier_rate || 0), 0);
  const earningsThisMonth = (monthLoads || []).reduce((sum, l) => sum + (l.carrier_rate || 0), 0);

  // Count pending requests
  const { count: pendingRequests } = await supabase
    .from('load_requests')
    .select('id', { count: 'exact', head: true })
    .eq('carrier_id', company.id)
    .eq('status', 'pending');

  const driversOnRoad = (drivers || []).filter(d => d.current_trip_id).length;

  return {
    assignedLoads: (assignedLoads || []).map(l => ({
      id: l.id,
      load_number: l.load_number,
      origin_city: l.origin_city || '',
      origin_state: l.origin_state || '',
      destination_city: l.destination_city || '',
      destination_state: l.destination_state || '',
      pickup_date: l.pickup_date || '',
      load_status: l.load_status || 'pending',
      carrier_rate: l.carrier_rate,
      assigned_driver_name: l.assigned_driver_name,
      source_company_name: l.source_company_name,
    })),
    drivers: (drivers || []).map(d => ({
      id: d.id,
      name: d.full_name || 'Unknown',
      status: d.current_trip_id ? 'on_trip' : (d.status === 'available' ? 'available' : 'off_duty'),
    })),
    availableLoads: (availableLoads || []).map(l => ({
      id: l.id,
      load_number: l.load_number,
      origin_city: l.origin_city || '',
      origin_state: l.origin_state || '',
      destination_city: l.destination_city || '',
      destination_state: l.destination_state || '',
      pickup_date: l.pickup_date || '',
      estimated_cuft: l.estimated_cuft,
    })),
    metrics: {
      activeLoadsCount: activeCount || 0,
      driversOnRoad,
      totalDrivers: (drivers || []).length,
      earningsThisWeek,
      earningsThisMonth,
      pendingRequestsCount: pendingRequests || 0,
    },
  };
}

// ============================================
// OWNER-OPERATOR DASHBOARD DATA
// ============================================

export interface OwnerOperatorDashboardData {
  currentLoad: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    delivery_date: string | null;
    load_status: string;
    carrier_rate: number | null;
    source_company_name: string | null;
    estimated_cuft: number | null;
  } | null;
  upcomingLoads: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    delivery_date: string | null;
    load_status: string;
    carrier_rate: number | null;
    source_company_name: string | null;
    estimated_cuft: number | null;
  }[];
  availableLoads: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    pickup_date: string;
    estimated_cuft: number | null;
  }[];
  metrics: {
    earningsThisWeek: number;
    earningsThisMonth: number;
    completedLoadsThisMonth: number;
    pendingRequestsCount: number;
  };
}

export async function getOwnerOperatorDashboardData(userId: string): Promise<OwnerOperatorDashboardData> {
  const supabase = await createClient();
  const company = await getWorkspaceCompanyForUser(userId);

  if (!company) {
    return {
      currentLoad: null,
      upcomingLoads: [],
      availableLoads: [],
      metrics: {
        earningsThisWeek: 0,
        earningsThisMonth: 0,
        completedLoadsThisMonth: 0,
        pendingRequestsCount: 0,
      },
    };
  }

  // Get all active loads
  const { data: activeLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      delivery_date,
      load_status,
      carrier_rate,
      source_company_name,
      estimated_cuft
    `)
    .eq('assigned_carrier_id', company.id)
    .in('load_status', ['pending', 'accepted', 'loading', 'in_transit'])
    .order('pickup_date', { ascending: true });

  // Current load is the one in transit or loading, or the next one
  const currentLoad = (activeLoads || []).find(l =>
    l.load_status === 'in_transit' || l.load_status === 'loading'
  ) || (activeLoads || [])[0] || null;

  // Upcoming loads are the rest
  const upcomingLoads = (activeLoads || []).filter(l => l.id !== currentLoad?.id);

  // Get available loads
  const { data: availableLoads } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      pickup_date,
      estimated_cuft
    `)
    .eq('posting_status', 'posted')
    .eq('is_marketplace_visible', true)
    .is('assigned_carrier_id', null)
    .neq('company_id', company.id)
    .order('pickup_date', { ascending: true })
    .limit(5);

  // Calculate earnings
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: weekLoads } = await supabase
    .from('loads')
    .select('carrier_rate')
    .eq('assigned_carrier_id', company.id)
    .eq('load_status', 'delivered')
    .gte('updated_at', startOfWeek.toISOString());

  const { data: monthLoads } = await supabase
    .from('loads')
    .select('carrier_rate')
    .eq('assigned_carrier_id', company.id)
    .eq('load_status', 'delivered')
    .gte('updated_at', startOfMonth.toISOString());

  const earningsThisWeek = (weekLoads || []).reduce((sum, l) => sum + (l.carrier_rate || 0), 0);
  const earningsThisMonth = (monthLoads || []).reduce((sum, l) => sum + (l.carrier_rate || 0), 0);

  // Count completed loads this month
  const { count: completedCount } = await supabase
    .from('loads')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_carrier_id', company.id)
    .eq('load_status', 'delivered')
    .gte('updated_at', startOfMonth.toISOString());

  // Count pending requests
  const { count: pendingRequests } = await supabase
    .from('load_requests')
    .select('id', { count: 'exact', head: true })
    .eq('carrier_id', company.id)
    .eq('status', 'pending');

  const mapLoad = (l: any) => ({
    id: l.id,
    load_number: l.load_number,
    origin_city: l.origin_city || '',
    origin_state: l.origin_state || '',
    destination_city: l.destination_city || '',
    destination_state: l.destination_state || '',
    pickup_date: l.pickup_date || '',
    delivery_date: l.delivery_date,
    load_status: l.load_status || 'pending',
    carrier_rate: l.carrier_rate,
    source_company_name: l.source_company_name,
    estimated_cuft: l.estimated_cuft,
  });

  return {
    currentLoad: currentLoad ? mapLoad(currentLoad) : null,
    upcomingLoads: upcomingLoads.map(mapLoad),
    availableLoads: (availableLoads || []).map(l => ({
      id: l.id,
      load_number: l.load_number,
      origin_city: l.origin_city || '',
      origin_state: l.origin_state || '',
      destination_city: l.destination_city || '',
      destination_state: l.destination_state || '',
      pickup_date: l.pickup_date || '',
      estimated_cuft: l.estimated_cuft,
    })),
    metrics: {
      earningsThisWeek,
      earningsThisMonth,
      completedLoadsThisMonth: completedCount || 0,
      pendingRequestsCount: pendingRequests || 0,
    },
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';
import { useAuth } from '../providers/AuthProvider';

interface DashboardStats {
  pendingRequests: number;
  criticalRfd: number;
  activeTrips: number;
  loadsDeliveredToday: number;
  revenueToday: number;
}

interface LoadRequest {
  id: string;
  load_id: string;
  carrier_id: string;
  status: string;
  created_at: string;
  load: {
    load_number: string;
    pickup_city: string | null;
    pickup_state: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
    cubic_feet: number | null;
    rate_per_cuft: number | null;
  };
  carrier: {
    name: string;
    dba_name: string | null;
  };
}

interface CriticalLoad {
  id: string;
  load_number: string;
  pickup_city: string | null;
  pickup_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  rfd_date: string | null;
  cubic_feet: number | null;
  status: string;
  days_until_rfd: number | null;
}

interface ActiveTrip {
  id: string;
  trip_number: string;
  status: string;
  start_date: string | null;
  driver: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  loads_count: number;
}

export function useOwnerDashboardData() {
  const { company } = useOwner();
  const { user } = useAuth();
  const companyId = company?.id;
  const userId = user?.id;

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['owner-dashboard-stats', companyId, userId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!companyId || !userId) {
        return {
          pendingRequests: 0,
          criticalRfd: 0,
          activeTrips: 0,
          loadsDeliveredToday: 0,
          revenueToday: 0,
        };
      }

      // Get pending request count - load_requests filtered through loads
      // First get loads owned by this company, then count pending requests on them
      const { data: companyLoads } = await supabase
        .from('loads')
        .select('id')
        .eq('posted_by_company_id', companyId);

      const loadIds = companyLoads?.map(l => l.id) || [];

      let requestCount = 0;
      if (loadIds.length > 0) {
        const { count } = await supabase
          .from('load_requests')
          .select('*', { count: 'exact', head: true })
          .in('load_id', loadIds)
          .eq('status', 'pending');
        requestCount = count || 0;
      }

      // Get critical RFD count (RFD within 2 days or overdue)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const { count: rfdCount } = await supabase
        .from('loads')
        .select('*', { count: 'exact', head: true })
        .eq('posted_by_company_id', companyId)
        .in('status', ['pending', 'assigned', 'in_transit'])
        .not('rfd_date', 'is', null)
        .lte('rfd_date', twoDaysFromNow.toISOString().split('T')[0]);

      // Get active trips count (trips use owner_id which is user ID)
      const { count: tripCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .in('status', ['scheduled', 'in_progress']);

      // Get today's delivered loads
      const today = new Date().toISOString().split('T')[0];
      const { count: deliveredCount } = await supabase
        .from('loads')
        .select('*', { count: 'exact', head: true })
        .eq('posted_by_company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', today);

      // Get today's revenue (sum of delivered loads)
      const { data: revenueData } = await supabase
        .from('loads')
        .select('cubic_feet, rate_per_cuft')
        .eq('posted_by_company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', today);

      const revenue = revenueData?.reduce((sum, load) => {
        if (load.cubic_feet && load.rate_per_cuft) {
          return sum + (load.cubic_feet * load.rate_per_cuft);
        }
        return sum;
      }, 0) || 0;

      return {
        pendingRequests: requestCount,
        criticalRfd: rfdCount || 0,
        activeTrips: tripCount || 0,
        loadsDeliveredToday: deliveredCount || 0,
        revenueToday: revenue,
      };
    },
    enabled: !!companyId && !!userId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch pending load requests
  const { data: pendingRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['owner-pending-requests', companyId],
    queryFn: async (): Promise<LoadRequest[]> => {
      if (!companyId) return [];

      // First get loads for this company
      const { data: companyLoads } = await supabase
        .from('loads')
        .select('id')
        .eq('posted_by_company_id', companyId);

      const loadIds = companyLoads?.map(l => l.id) || [];
      if (loadIds.length === 0) return [];

      const { data, error } = await supabase
        .from('load_requests')
        .select(`
          id,
          load_id,
          carrier_id,
          status,
          created_at,
          load:loads!load_requests_load_id_fkey(
            load_number,
            pickup_city,
            pickup_state,
            delivery_city,
            delivery_state,
            cubic_feet,
            rate_per_cuft
          ),
          carrier:companies!load_requests_carrier_id_fkey(
            name,
            dba_name
          )
        `)
        .in('load_id', loadIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching requests:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        load: Array.isArray(item.load) ? item.load[0] : item.load,
        carrier: Array.isArray(item.carrier) ? item.carrier[0] : item.carrier,
      }));
    },
    enabled: !!companyId,
    staleTime: 30000,
    refetchInterval: 30000, // More frequent for requests
  });

  // Fetch critical RFD loads
  const { data: criticalLoads, isLoading: loadsLoading } = useQuery({
    queryKey: ['owner-critical-loads', companyId],
    queryFn: async (): Promise<CriticalLoad[]> => {
      if (!companyId) return [];

      const today = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          pickup_city,
          pickup_state,
          delivery_city,
          delivery_state,
          rfd_date,
          cubic_feet,
          status
        `)
        .eq('posted_by_company_id', companyId)
        .in('status', ['pending', 'assigned', 'in_transit'])
        .not('rfd_date', 'is', null)
        .lte('rfd_date', twoDaysFromNow.toISOString().split('T')[0])
        .order('rfd_date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching critical loads:', error);
        return [];
      }

      return (data || []).map(load => {
        const rfdDate = load.rfd_date ? new Date(load.rfd_date) : null;
        const daysUntilRfd = rfdDate
          ? Math.ceil((rfdDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...load,
          days_until_rfd: daysUntilRfd,
        };
      });
    },
    enabled: !!companyId,
    staleTime: 30000,
  });

  // Fetch active trips
  const { data: activeTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ['owner-active-trips', userId],
    queryFn: async (): Promise<ActiveTrip[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          trip_number,
          status,
          start_date,
          driver:drivers(
            first_name,
            last_name
          )
        `)
        .eq('owner_id', userId)
        .in('status', ['scheduled', 'in_progress'])
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching active trips:', error);
        return [];
      }

      return (data || []).map(trip => ({
        id: trip.id,
        trip_number: trip.trip_number,
        status: trip.status,
        start_date: trip.start_date,
        driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
        loads_count: 0, // Simplified - removed trip_loads count query
      }));
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  return {
    stats: stats || {
      pendingRequests: 0,
      criticalRfd: 0,
      activeTrips: 0,
      loadsDeliveredToday: 0,
      revenueToday: 0,
    },
    pendingRequests: pendingRequests || [],
    criticalLoads: criticalLoads || [],
    activeTrips: activeTrips || [],
    isLoading: statsLoading || requestsLoading || loadsLoading || tripsLoading,
    // For tab bar badges
    requestCount: stats?.pendingRequests || 0,
    criticalRfdCount: stats?.criticalRfd || 0,
  };
}

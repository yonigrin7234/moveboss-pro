/**
 * Hook for fetching carrier's outgoing load requests
 * Shows all loads the carrier has requested from the marketplace
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';

export interface MyRequest {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
  request_type: 'accept_listed' | 'counter_offer' | null;
  counter_offer_rate: number | null;
  accepted_company_rate: boolean;
  message: string | null;
  created_at: string;
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
  load: {
    id: string;
    load_number: string;
    pickup_city: string;
    pickup_state: string;
    pickup_zip: string;
    delivery_city: string;
    delivery_state: string;
    delivery_zip: string;
    cubic_feet_estimate: number | null;
    rate_per_cuft: number | null;
    company_rate: number | null;
    company_rate_type: string | null;
    posting_type: 'pickup' | 'load' | null;
    load_subtype: 'live' | 'rfd' | null;
    posted_by_company_id: string | null;
  };
  company: {
    id: string;
    name: string;
    fmcsa_verified: boolean | null;
  } | null;
}

export function useMyRequests() {
  const { company } = useOwner();
  const companyId = company?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-requests', companyId],
    queryFn: async (): Promise<MyRequest[]> => {
      if (!companyId) return [];

      // Fetch all load requests made by this carrier
      const { data: requests, error: requestsError } = await supabase
        .from('load_requests')
        .select(`
          id,
          status,
          request_type,
          counter_offer_rate,
          accepted_company_rate,
          message,
          created_at,
          proposed_load_date_start,
          proposed_load_date_end,
          proposed_delivery_date_start,
          proposed_delivery_date_end,
          load_id
        `)
        .eq('carrier_id', companyId)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('[MyRequests] Error fetching requests:', requestsError);
        throw requestsError;
      }

      if (!requests || requests.length === 0) {
        return [];
      }

      // Fetch load details for all requests
      const loadIds = [...new Set(requests.map((r) => r.load_id).filter(Boolean))] as string[];

      const { data: loads } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          pickup_city,
          pickup_state,
          pickup_zip,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          cubic_feet_estimate,
          rate_per_cuft,
          company_rate,
          company_rate_type,
          posting_type,
          load_subtype,
          posted_by_company_id
        `)
        .in('id', loadIds);

      // Define load type for the map
      type LoadData = {
        id: string;
        load_number: string;
        pickup_city: string | null;
        pickup_state: string | null;
        pickup_zip: string | null;
        delivery_city: string | null;
        delivery_state: string | null;
        delivery_postal_code: string | null;
        cubic_feet_estimate: number | null;
        rate_per_cuft: number | null;
        company_rate: number | null;
        company_rate_type: string | null;
        posting_type: string | null;
        load_subtype: string | null;
        posted_by_company_id: string | null;
      };

      const loadMap = new Map<string, LoadData>();
      if (loads) {
        for (const load of loads) {
          loadMap.set(load.id, load as LoadData);
        }
      }

      // Fetch company info for loads
      const companyIds = [...new Set(loads?.map((l) => l.posted_by_company_id).filter(Boolean) || [])] as string[];

      const companyMap = new Map<string, { id: string; name: string; fmcsa_verified: boolean | null }>();

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, fmcsa_verified')
          .in('id', companyIds);

        if (companies) {
          for (const c of companies) {
            companyMap.set(c.id, c);
          }
        }
      }

      // Map to interface
      return requests
        .map((request) => {
          const load = loadMap.get(request.load_id);
          if (!load) return null;

          return {
            id: request.id,
            status: request.status as MyRequest['status'],
            request_type: request.request_type,
            counter_offer_rate: request.counter_offer_rate,
            accepted_company_rate: request.accepted_company_rate || false,
            message: request.message,
            created_at: request.created_at,
            proposed_load_date_start: request.proposed_load_date_start,
            proposed_load_date_end: request.proposed_load_date_end,
            proposed_delivery_date_start: request.proposed_delivery_date_start,
            proposed_delivery_date_end: request.proposed_delivery_date_end,
            load: {
              id: load.id,
              load_number: load.load_number,
              pickup_city: load.pickup_city || '',
              pickup_state: load.pickup_state || '',
              pickup_zip: load.pickup_zip || '',
              delivery_city: load.delivery_city || '',
              delivery_state: load.delivery_state || '',
              delivery_zip: load.delivery_postal_code || '',
              cubic_feet_estimate: load.cubic_feet_estimate,
              rate_per_cuft: load.rate_per_cuft,
              company_rate: load.company_rate,
              company_rate_type: load.company_rate_type,
              posting_type: load.posting_type,
              load_subtype: load.load_subtype,
              posted_by_company_id: load.posted_by_company_id,
            },
            company: load.posted_by_company_id
              ? companyMap.get(load.posted_by_company_id) || null
              : null,
          };
        })
        .filter((r): r is MyRequest => r !== null);
    },
    enabled: !!companyId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Group requests by status
  const allRequests = data || [];
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const acceptedRequests = allRequests.filter((r) => r.status === 'accepted');
  const declinedRequests = allRequests.filter(
    (r) => r.status === 'declined' || r.status === 'withdrawn' || r.status === 'expired'
  );

  return {
    requests: allRequests,
    pendingRequests,
    acceptedRequests,
    declinedRequests,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for withdrawing a load request
 */
export function useWithdrawMyRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('load_requests')
        .update({ status: 'withdrawn' })
        .eq('id', requestId);

      if (error) {
        console.error('[MyRequests] Error withdrawing request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['load-board'] });
    },
  });

  return {
    withdrawRequest: mutation.mutateAsync,
    isWithdrawing: mutation.isPending,
  };
}

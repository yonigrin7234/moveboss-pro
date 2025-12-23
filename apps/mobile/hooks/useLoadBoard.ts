/**
 * Hook for fetching and filtering marketplace loads (Load Board)
 * Ports existing web logic to mobile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';

export interface LoadBoardLoad {
  id: string;
  load_number: string;
  company_id: string;
  posted_by_company_id: string | null;
  posting_type: 'pickup' | 'load' | null;
  load_subtype: 'live' | 'rfd' | null;

  // Origin
  origin_city: string;
  origin_state: string;
  origin_zip: string;

  // Destination
  destination_city: string;
  destination_state: string;
  destination_zip: string;

  // Size
  estimated_cuft: number | null;
  estimated_weight_lbs: number | null;
  pieces_count: number | null;

  // Rate
  company_rate: number | null;
  company_rate_type: string | null;
  rate_per_cuft: number | null;
  linehaul_amount: number | null;
  is_open_to_counter: boolean;

  // Dates
  rfd_date: string | null;
  pickup_date_start: string | null;
  pickup_date_end: string | null;
  available_date: string | null;
  posted_to_marketplace_at: string | null;

  // Equipment & Requirements
  equipment_type: string | null;
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;

  // Status flags
  is_ready_now: boolean;
  delivery_urgency: string | null;

  // Notes
  notes: string | null;

  // Company info
  company: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
    platform_rating: number | null;
    platform_loads_completed: number;
    fmcsa_verified: boolean | null;
  } | null;

  // Request status (if user has already requested this load)
  my_request_status?: string | null;
  my_request_id?: string | null;
}

export interface LoadBoardFilters {
  origin_state?: string;
  destination_state?: string;
  posting_type?: 'pickup' | 'load';
  equipment_type?: string;
}

export function useLoadBoard(filters?: LoadBoardFilters) {
  const { company } = useOwner();
  const companyId = company?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['load-board', companyId, filters],
    queryFn: async (): Promise<LoadBoardLoad[]> => {
      if (!companyId) return [];

      // Build the query - same logic as web's getMarketplaceLoads()
      let query = supabase
        .from('loads')
        .select(`
          id,
          load_number,
          company_id,
          posted_by_company_id,
          posting_type,
          load_subtype,
          pickup_city,
          pickup_state,
          pickup_zip,
          delivery_city,
          delivery_state,
          delivery_postal_code,
          cubic_feet_estimate,
          weight_lbs_estimate,
          pieces_count,
          company_rate,
          company_rate_type,
          rate_per_cuft,
          linehaul_amount,
          is_open_to_counter,
          rfd_date,
          pickup_date_start,
          pickup_date_end,
          available_date,
          posted_to_marketplace_at,
          equipment_type,
          truck_requirement,
          is_ready_now,
          delivery_urgency,
          notes
        `)
        .eq('is_marketplace_visible', true)
        .eq('posting_status', 'posted')
        .is('assigned_carrier_id', null)
        .neq('posted_by_company_id', companyId) // Exclude own company's loads
        .order('posted_to_marketplace_at', { ascending: false });

      // Apply filters
      if (filters?.posting_type) {
        query = query.eq('posting_type', filters.posting_type);
      }
      if (filters?.origin_state) {
        query = query.eq('pickup_state', filters.origin_state);
      }
      if (filters?.destination_state) {
        query = query.eq('delivery_state', filters.destination_state);
      }
      if (filters?.equipment_type) {
        query = query.eq('equipment_type', filters.equipment_type);
      }

      const { data: loads, error: loadsError } = await query;

      if (loadsError) {
        console.error('[LoadBoard] Error fetching loads:', loadsError);
        throw loadsError;
      }

      if (!loads || loads.length === 0) {
        return [];
      }

      // Fetch company data for the loads (with rating/MC/DOT)
      const companyIds = [...new Set(loads.map(l => l.posted_by_company_id).filter(Boolean))] as string[];
      const companyMap = new Map<string, {
        id: string;
        name: string;
        city: string | null;
        state: string | null;
        mc_number: string | null;
        dot_number: string | null;
        platform_rating: number | null;
        platform_loads_completed: number;
        fmcsa_verified: boolean | null;
      }>();

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, city, state, mc_number, dot_number, platform_rating, platform_loads_completed, fmcsa_verified')
          .in('id', companyIds);

        if (companies) {
          for (const c of companies) {
            companyMap.set(c.id, c);
          }
        }
      }

      // Check if user has pending requests on any of these loads
      const loadIds = loads.map(l => l.id);
      const { data: myRequests } = await supabase
        .from('load_requests')
        .select('id, load_id, status')
        .eq('carrier_id', companyId)
        .in('load_id', loadIds);

      const requestMap = new Map<string, { id: string; status: string }>();
      if (myRequests) {
        for (const r of myRequests) {
          requestMap.set(r.load_id, { id: r.id, status: r.status });
        }
      }

      // Map to interface
      return loads.map(load => {
        const request = requestMap.get(load.id);
        return {
          id: load.id,
          load_number: load.load_number,
          company_id: load.company_id,
          posted_by_company_id: load.posted_by_company_id,
          posting_type: load.posting_type,
          load_subtype: load.load_subtype,
          origin_city: load.pickup_city || '',
          origin_state: load.pickup_state || '',
          origin_zip: load.pickup_zip || '',
          destination_city: load.delivery_city || '',
          destination_state: load.delivery_state || '',
          destination_zip: load.delivery_postal_code || '',
          estimated_cuft: load.cubic_feet_estimate,
          estimated_weight_lbs: load.weight_lbs_estimate,
          pieces_count: load.pieces_count,
          company_rate: load.company_rate,
          company_rate_type: load.company_rate_type,
          rate_per_cuft: load.rate_per_cuft,
          linehaul_amount: load.linehaul_amount,
          is_open_to_counter: load.is_open_to_counter || false,
          rfd_date: load.rfd_date,
          pickup_date_start: load.pickup_date_start,
          pickup_date_end: load.pickup_date_end,
          available_date: load.available_date,
          posted_to_marketplace_at: load.posted_to_marketplace_at,
          equipment_type: load.equipment_type,
          truck_requirement: load.truck_requirement,
          is_ready_now: load.is_ready_now || false,
          delivery_urgency: load.delivery_urgency,
          notes: load.notes,
          company: load.posted_by_company_id ? companyMap.get(load.posted_by_company_id) || null : null,
          my_request_status: request?.status || null,
          my_request_id: request?.id || null,
        };
      });
    },
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    loads: data || [],
    isLoading,
    error,
    refetch,
  };
}

export interface LoadRequestParams {
  loadId: string;
  message?: string;
  counterOfferRate?: number;
  acceptListedRate?: boolean;
  proposedLoadDateStart?: string;
  proposedLoadDateEnd?: string;
  proposedDeliveryDateStart?: string;
  proposedDeliveryDateEnd?: string;
}

/**
 * Hook for requesting a load from the marketplace
 */
export function useRequestLoad() {
  const { company } = useOwner();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      loadId,
      message,
      counterOfferRate,
      acceptListedRate = true,
      proposedLoadDateStart,
      proposedLoadDateEnd,
      proposedDeliveryDateStart,
      proposedDeliveryDateEnd,
    }: LoadRequestParams) => {
      if (!company?.id) throw new Error('No company');

      // Create load request
      const { data, error } = await supabase
        .from('load_requests')
        .insert({
          load_id: loadId,
          carrier_id: company.id,
          carrier_owner_id: company.owner_id,
          status: 'pending',
          message: message || null,
          accepted_company_rate: acceptListedRate,
          request_type: acceptListedRate ? 'accept_listed' : 'counter_offer',
          counter_offer_rate: acceptListedRate ? null : counterOfferRate,
          proposed_load_date_start: proposedLoadDateStart || null,
          proposed_load_date_end: proposedLoadDateEnd || null,
          proposed_delivery_date_start: proposedDeliveryDateStart || null,
          proposed_delivery_date_end: proposedDeliveryDateEnd || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[LoadBoard] Error creating request:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-board'] });
    },
  });

  return {
    requestLoad: mutation.mutateAsync,
    isRequesting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for withdrawing a load request
 */
export function useWithdrawRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('load_requests')
        .update({ status: 'withdrawn' })
        .eq('id', requestId);

      if (error) {
        console.error('[LoadBoard] Error withdrawing request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-board'] });
    },
  });

  return {
    withdrawRequest: mutation.mutateAsync,
    isWithdrawing: mutation.isPending,
  };
}

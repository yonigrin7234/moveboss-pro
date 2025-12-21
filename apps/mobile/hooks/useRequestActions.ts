import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';

interface AcceptRequestParams {
  requestId: string;
  loadId: string;
  carrierId: string;
  carrierRate: number | null;
  carrierRateType?: string;
  cubicFeetEstimate?: number | null;
}

interface DeclineRequestParams {
  requestId: string;
  loadId: string;
  responseMessage?: string;
}

export function useRequestActions() {
  const queryClient = useQueryClient();
  const { company } = useOwner();

  const acceptMutation = useMutation({
    mutationFn: async (params: AcceptRequestParams) => {
      const { requestId, loadId, carrierId, carrierRate, carrierRateType, cubicFeetEstimate } = params;

      // 1. Update the request status to accepted
      const { error: requestError } = await supabase
        .from('load_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 2. Update the load with assigned carrier and rate
      const loadUpdate: Record<string, unknown> = {
        assigned_carrier_id: carrierId,
        carrier_assigned_at: new Date().toISOString(),
        posting_status: 'assigned',
        load_status: 'pending', // Carrier needs to confirm
        is_marketplace_visible: false,
      };

      // Set the carrier rate from the request
      if (carrierRate !== null) {
        loadUpdate.carrier_rate = carrierRate;
        loadUpdate.carrier_rate_type = carrierRateType || 'per_cuft';
      }

      // Copy cubic_feet_estimate to cubic_feet if not already set
      if (cubicFeetEstimate) {
        loadUpdate.cubic_feet = cubicFeetEstimate;
      }

      const { error: loadError } = await supabase
        .from('loads')
        .update(loadUpdate)
        .eq('id', loadId);

      if (loadError) throw loadError;

      // 3. Decline all other pending requests for this load
      const { error: declineError } = await supabase
        .from('load_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
          response_message: 'Another carrier was selected',
        })
        .eq('load_id', loadId)
        .eq('status', 'pending')
        .neq('id', requestId);

      if (declineError) {
        console.error('Error declining other requests:', declineError);
        // Don't throw - the main accept was successful
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['load-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (params: DeclineRequestParams) => {
      const { requestId, responseMessage } = params;

      const { error } = await supabase
        .from('load_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
          response_message: responseMessage,
        })
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['load-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
    },
  });

  const acceptRequest = useCallback(
    (params: AcceptRequestParams) => acceptMutation.mutateAsync(params),
    [acceptMutation]
  );

  const declineRequest = useCallback(
    (params: DeclineRequestParams) => declineMutation.mutateAsync(params),
    [declineMutation]
  );

  return {
    acceptRequest,
    declineRequest,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
    acceptError: acceptMutation.error,
    declineError: declineMutation.error,
  };
}

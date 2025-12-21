import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';
import { useAuth } from '../providers/AuthProvider';
import { haptics } from '../lib/haptics';

/**
 * Real-time subscriptions for owner dashboard
 * Listens to:
 * - loads table changes (RFD updates, status changes)
 * - trips table changes (status updates)
 *
 * Note: load_requests doesn't have a company_id column, so we rely on
 * periodic query refetch and invalidation when loads change.
 */
export function useOwnerRealtime() {
  const { company } = useOwner();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const companyId = company?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!companyId || !userId) return;

    const channel = supabase.channel(`owner-${companyId}`);

    // Subscribe to loads changes (uses posted_by_company_id)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loads',
        filter: `posted_by_company_id=eq.${companyId}`,
      },
      (payload) => {
        console.log('Load change:', payload.eventType);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['loads', companyId] });
        queryClient.invalidateQueries({ queryKey: ['owner-critical-loads', companyId] });
        queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats', companyId, userId] });

        // Also invalidate load requests since a load change might affect pending requests
        queryClient.invalidateQueries({ queryKey: ['load-requests', companyId] });
        queryClient.invalidateQueries({ queryKey: ['owner-pending-requests', companyId] });
      }
    );

    // Subscribe to trips changes (uses owner_id which is user ID)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Trip change:', payload.eventType);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['owner-trips', companyId] });
        queryClient.invalidateQueries({ queryKey: ['owner-active-trips', userId] });
        queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats', companyId, userId] });
      }
    );

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [companyId, userId, queryClient]);
}

/**
 * Hook to subscribe to new load requests specifically
 * Since load_requests doesn't have company_id, we listen to all inserts
 * and filter in the callback based on load ownership (checked via query invalidation)
 */
export function useNewRequestsSubscription(onNewRequest?: (request: any) => void) {
  const { company } = useOwner();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!company?.id) return;

    // Listen to load_requests inserts (no filter - will match all)
    // The actual filtering happens in the queries
    const channel = supabase
      .channel(`new-requests-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_requests',
        },
        (payload) => {
          // Invalidate queries - they will filter properly
          queryClient.invalidateQueries({ queryKey: ['load-requests', company.id] });
          queryClient.invalidateQueries({ queryKey: ['owner-pending-requests', company.id] });

          // Play haptic for any new pending request
          // (the query will filter to only show relevant ones)
          if (payload.new?.status === 'pending') {
            haptics.warning();
            if (onNewRequest) {
              onNewRequest(payload.new);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, onNewRequest, queryClient]);
}

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOwner } from '../providers/OwnerProvider';
import { haptics } from '../lib/haptics';

/**
 * Real-time subscriptions for owner dashboard
 * Listens to:
 * - load_requests table changes (new requests, status changes)
 * - loads table changes (RFD updates, status changes)
 * - trips table changes (status updates)
 */
export function useOwnerRealtime() {
  const { company } = useOwner();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase.channel(`owner-${company.id}`);

    // Subscribe to load_requests changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'load_requests',
        filter: `company_id=eq.${company.id}`,
      },
      (payload) => {
        console.log('Load request change:', payload.eventType);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['load-requests', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-pending-requests', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats', company.id] });

        // Play haptic for new requests
        if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
          haptics.warning();
        }
      }
    );

    // Subscribe to loads changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loads',
        filter: `company_id=eq.${company.id}`,
      },
      (payload) => {
        console.log('Load change:', payload.eventType);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['loads', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-critical-loads', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats', company.id] });
      }
    );

    // Subscribe to trips changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `company_id=eq.${company.id}`,
      },
      (payload) => {
        console.log('Trip change:', payload.eventType);

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['trips', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-active-trips', company.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats', company.id] });
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
  }, [company?.id, queryClient]);
}

/**
 * Hook to subscribe to new load requests specifically
 * Useful for showing notifications/alerts
 */
export function useNewRequestsSubscription(onNewRequest?: (request: any) => void) {
  const { company } = useOwner();

  useEffect(() => {
    if (!company?.id || !onNewRequest) return;

    const channel = supabase
      .channel(`new-requests-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'load_requests',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          if (payload.new?.status === 'pending') {
            onNewRequest(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, onNewRequest]);
}

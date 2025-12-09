import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDriver } from '../providers/DriverProvider';
import type { DeliveryOrderCheck, DriverInfo } from './useLoadActions.types';

export interface LoadActionBaseContext {
  loadId: string;
  onSuccess?: () => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  getDriverInfo: () => Promise<DriverInfo>;
  checkDeliveryOrder: () => Promise<DeliveryOrderCheck>;
  incrementDeliveryIndex: (completedDeliveryOrder: number | null) => Promise<void>;
}

export function useLoadActionBase(loadId: string, onSuccess?: () => void): LoadActionBaseContext {
  const [loading, setLoading] = useState(false);
  const { driverId, ownerId, isReady, error: driverError } = useDriver();

  const getDriverInfo = useCallback(async (): Promise<DriverInfo> => {
    if (driverError) throw new Error(driverError);
    if (!isReady || !driverId || !ownerId) throw new Error('Driver profile not found');
    return { id: driverId, owner_id: ownerId };
  }, [driverError, driverId, ownerId, isReady]);

  /**
   * Check if delivery can start based on delivery order.
   * Returns allowed=true if:
   * - Load has no delivery_order set (null)
   * - Load's delivery_order matches trip's current_delivery_index
   * - No other loads with lower delivery_order are pending delivery
   */
  const checkDeliveryOrder = useCallback(async (): Promise<DeliveryOrderCheck> => {
    try {
      const driver = await getDriverInfo();

      const { data: thisLoad, error: loadError } = await supabase
        .from('loads')
        .select('id, delivery_order, customer_name, delivery_city, delivery_state, load_status')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (loadError || !thisLoad) {
        return { allowed: false, reason: 'Load not found', currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
      }

      if (thisLoad.delivery_order === null || thisLoad.delivery_order === undefined) {
        return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
      }

      const { data: tripLoad, error: tripLoadError } = await supabase
        .from('trip_loads')
        .select('trip_id')
        .eq('load_id', loadId)
        .single();

      if (tripLoadError || !tripLoad) {
        return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: thisLoad.delivery_order };
      }

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, current_delivery_index')
        .eq('id', tripLoad.trip_id)
        .single();

      if (tripError || !trip) {
        return { allowed: false, reason: 'Trip not found', currentDeliveryIndex: null, thisLoadDeliveryOrder: thisLoad.delivery_order };
      }

      const currentIndex = trip.current_delivery_index || 1;

      if (thisLoad.delivery_order === currentIndex) {
        return {
          allowed: true,
          currentDeliveryIndex: currentIndex,
          thisLoadDeliveryOrder: thisLoad.delivery_order,
        };
      }

      if (thisLoad.delivery_order > currentIndex) {
        const { data: tripLoads, error: loadsError } = await supabase
          .from('trip_loads')
          .select(`
            load_id,
            loads:load_id (
              id,
              delivery_order,
              customer_name,
              delivery_city,
              delivery_state,
              load_status
            )
          `)
          .eq('trip_id', tripLoad.trip_id);

        if (loadsError || !tripLoads) {
          return {
            allowed: false,
            reason: 'Could not check delivery order',
            currentDeliveryIndex: currentIndex,
            thisLoadDeliveryOrder: thisLoad.delivery_order,
          };
        }

        const loadsBeforeThis = tripLoads
          .map((tl) => tl.loads as unknown as {
            id: string;
            delivery_order: number | null;
            customer_name: string | null;
            delivery_city: string | null;
            delivery_state: string | null;
            load_status: string;
          })
          .filter(
            (load) =>
              load &&
              load.delivery_order !== null &&
              load.delivery_order < thisLoad.delivery_order &&
              load.load_status !== 'delivered' &&
              load.load_status !== 'storage_completed',
          )
          .sort((a, b) => (a.delivery_order || 0) - (b.delivery_order || 0));

        if (loadsBeforeThis.length > 0) {
          const nextLoad = loadsBeforeThis[0];
          const customerDisplay =
            nextLoad.customer_name ||
            (nextLoad.delivery_city && nextLoad.delivery_state
              ? `${nextLoad.delivery_city}, ${nextLoad.delivery_state}`
              : `Delivery #${nextLoad.delivery_order}`);

          return {
            allowed: false,
            reason: `Complete delivery #${nextLoad.delivery_order} (${customerDisplay}) first`,
            nextLoad: {
              id: nextLoad.id,
              delivery_order: nextLoad.delivery_order!,
              customer_name: nextLoad.customer_name,
              delivery_city: nextLoad.delivery_city,
              delivery_state: nextLoad.delivery_state,
            },
            currentDeliveryIndex: currentIndex,
            thisLoadDeliveryOrder: thisLoad.delivery_order,
          };
        }
      }

      return {
        allowed: true,
        currentDeliveryIndex: currentIndex,
        thisLoadDeliveryOrder: thisLoad.delivery_order,
      };
    } catch {
      return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
    }
  }, [getDriverInfo, loadId]);

  /**
   * Increment trip's current_delivery_index after a delivery is completed
   */
  const incrementDeliveryIndex = useCallback(
    async (completedDeliveryOrder: number | null): Promise<void> => {
      if (completedDeliveryOrder === null) return;

      try {
        const driver = await getDriverInfo();

        const { data: tripLoad } = await supabase
          .from('trip_loads')
          .select('trip_id')
          .eq('load_id', loadId)
          .single();

        if (!tripLoad) return;

        const { data: trip } = await supabase
          .from('trips')
          .select('current_delivery_index')
          .eq('id', tripLoad.trip_id)
          .single();

        if (!trip) return;

        const currentIndex = trip.current_delivery_index || 1;

        if (completedDeliveryOrder === currentIndex) {
          await supabase
            .from('trips')
            .update({ current_delivery_index: currentIndex + 1 })
            .eq('id', tripLoad.trip_id)
            .eq('owner_id', driver.owner_id);
        }
      } catch {
        // Non-critical, don't throw
      }
    },
    [getDriverInfo, loadId],
  );

  return {
    loadId,
    onSuccess,
    loading,
    setLoading,
    getDriverInfo,
    checkDeliveryOrder,
    incrementDeliveryIndex,
  };
}


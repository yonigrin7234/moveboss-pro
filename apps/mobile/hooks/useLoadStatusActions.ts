import type { LoadStatus } from '../types';
import { supabase } from '../lib/supabase';
import {
  notifyOwnerDeliveryCompleted,
  notifyOwnerDeliveryStarted,
  notifyOwnerLoadAccepted,
  notifyOwnerLoadingFinished,
  notifyOwnerLoadingStarted,
} from '../lib/notify-owner';
import type { LoadActionBaseContext } from './useLoadActionBase';
import type { ActionResult } from './useLoadActions.types';

export function useLoadStatusActions(context: LoadActionBaseContext) {
  const { loadId, onSuccess, setLoading, getDriverInfo, checkDeliveryOrder, incrementDeliveryIndex } = context;

  const acceptLoad = async (): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'accepted' as LoadStatus,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      notifyOwnerLoadAccepted(loadId);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to accept load' };
    } finally {
      setLoading(false);
    }
  };

  const startLoading = async (startingCuft?: number, photoUrl?: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'loading' as LoadStatus,
          loading_started_at: new Date().toISOString(),
          starting_cuft: startingCuft || null,
          loading_start_photo: photoUrl || null,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      notifyOwnerLoadingStarted(loadId);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start loading' };
    } finally {
      setLoading(false);
    }
  };

  const finishLoading = async (endingCuft?: number, photoUrl?: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { data: load } = await supabase
        .from('loads')
        .select('starting_cuft')
        .eq('id', loadId)
        .single();

      const actualCuft =
        endingCuft && load?.starting_cuft ? endingCuft - load.starting_cuft : endingCuft || null;

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'loaded' as LoadStatus,
          loading_finished_at: new Date().toISOString(),
          ending_cuft: endingCuft || null,
          actual_cuft_loaded: actualCuft,
          loading_end_photo: photoUrl || null,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      notifyOwnerLoadingFinished(loadId);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to finish loading' };
    } finally {
      setLoading(false);
    }
  };

  const startDelivery = async (data?: { amountCollected?: number; paymentMethod?: string }): Promise<ActionResult> => {
    try {
      setLoading(true);

      const orderCheck = await checkDeliveryOrder();
      if (!orderCheck.allowed) {
        return {
          success: false,
          error: orderCheck.reason || 'Cannot start delivery - check delivery order',
        };
      }

      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'in_transit' as LoadStatus,
          delivery_started_at: new Date().toISOString(),
          amount_collected_on_delivery: data?.amountCollected || null,
          payment_method: data?.paymentMethod || null,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      notifyOwnerDeliveryStarted(loadId);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start delivery' };
    } finally {
      setLoading(false);
    }
  };

  const completeDelivery = async (): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { data: load } = await supabase
        .from('loads')
        .select('delivery_order')
        .eq('id', loadId)
        .single();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'delivered' as LoadStatus,
          delivery_finished_at: new Date().toISOString(),
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      incrementDeliveryIndex(load?.delivery_order || null);
      notifyOwnerDeliveryCompleted(loadId);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete delivery' };
    } finally {
      setLoading(false);
    }
  };

  const requiresContractDetails = async (): Promise<{ required: boolean; loadSource?: string }> => {
    try {
      const driver = await getDriverInfo();

      const { data: load, error } = await supabase
        .from('loads')
        .select('load_source, contract_details_entered_at')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (error) throw error;

      const isPartnerOrMarketplace = load?.load_source === 'partner' || load?.load_source === 'marketplace';
      const notYetEntered = !load?.contract_details_entered_at;

      return {
        required: isPartnerOrMarketplace && notYetEntered,
        loadSource: load?.load_source,
      };
    } catch {
      return { required: false };
    }
  };

  const requiresPickupCompletion = async (): Promise<{ required: boolean; postingType?: string }> => {
    try {
      const driver = await getDriverInfo();

      const { data: load, error } = await supabase
        .from('loads')
        .select('posting_type, pickup_completed_at')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (error) throw error;

      const isPickup = load?.posting_type === 'pickup';
      const notYetCompleted = !load?.pickup_completed_at;

      return {
        required: isPickup && notYetCompleted,
        postingType: load?.posting_type,
      };
    } catch {
      return { required: false };
    }
  };

  return {
    acceptLoad,
    startLoading,
    finishLoading,
    startDelivery,
    completeDelivery,
    requiresContractDetails,
    requiresPickupCompletion,
  };
}


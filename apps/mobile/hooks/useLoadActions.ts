import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadStatus } from '../types';
import { useAuth } from '../providers/AuthProvider';

type ActionResult = { success: boolean; error?: string };

export function useLoadActions(loadId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getDriverInfo = async () => {
    if (!user) throw new Error('Not authenticated');

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, owner_id')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !driver) throw new Error('Driver profile not found');
    return driver;
  };

  // Accept load (pending → accepted)
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
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to accept load' };
    } finally {
      setLoading(false);
    }
  };

  // Start loading (accepted → loading)
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
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start loading' };
    } finally {
      setLoading(false);
    }
  };

  // Finish loading (loading → loaded)
  const finishLoading = async (endingCuft?: number, photoUrl?: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      // Get starting cuft to calculate actual loaded
      const { data: load } = await supabase
        .from('loads')
        .select('starting_cuft')
        .eq('id', loadId)
        .single();

      const actualCuft = endingCuft && load?.starting_cuft
        ? endingCuft - load.starting_cuft
        : endingCuft || null;

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
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to finish loading' };
    } finally {
      setLoading(false);
    }
  };

  // Start delivery / in transit (loaded → in_transit)
  const startDelivery = async (): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'in_transit' as LoadStatus,
          delivery_started_at: new Date().toISOString(),
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start delivery' };
    } finally {
      setLoading(false);
    }
  };

  // Complete delivery (in_transit → delivered)
  const completeDelivery = async (data: {
    amountCollected?: number;
    paymentMethod?: string;
  }): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'delivered' as LoadStatus,
          delivery_finished_at: new Date().toISOString(),
          amount_collected_on_delivery: data.amountCollected || null,
          payment_method: data.paymentMethod || null,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete delivery' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    acceptLoad,
    startLoading,
    finishLoading,
    startDelivery,
    completeDelivery,
  };
}

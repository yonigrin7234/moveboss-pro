import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadStatus } from '../types';
import { useAuth } from '../providers/AuthProvider';
import {
  notifyOwnerLoadAccepted,
  notifyOwnerLoadingStarted,
  notifyOwnerLoadingFinished,
  notifyOwnerDeliveryStarted,
  notifyOwnerDeliveryCompleted,
} from '../lib/notify-owner';

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

      // Notify owner (fire-and-forget)
      notifyOwnerLoadAccepted(loadId);

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

      // Notify owner (fire-and-forget)
      notifyOwnerLoadingStarted(loadId);

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

      // Notify owner (fire-and-forget)
      notifyOwnerLoadingFinished(loadId);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to finish loading' };
    } finally {
      setLoading(false);
    }
  };

  // Start delivery / in transit (loaded → in_transit) with payment collection
  const startDelivery = async (data?: {
    amountCollected?: number;
    paymentMethod?: string;
  }): Promise<ActionResult> => {
    try {
      setLoading(true);
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

      // Notify owner (fire-and-forget)
      notifyOwnerDeliveryStarted(loadId);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start delivery' };
    } finally {
      setLoading(false);
    }
  };

  // Complete delivery (in_transit → delivered) - simple confirmation
  const completeDelivery = async (): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'delivered' as LoadStatus,
          delivery_finished_at: new Date().toISOString(),
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      // Notify owner (fire-and-forget)
      notifyOwnerDeliveryCompleted(loadId);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete delivery' };
    } finally {
      setLoading(false);
    }
  };

  // Save contract details (for partner/marketplace loads after loading)
  const saveContractDetails = async (data: {
    contractBalanceDue: number;
    contractJobNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryAddressFull?: string | null;
    contractLinehaulTotal: number;
    amountCompanyOwes: number;
    accessorials: {
      shuttle: number;
      longCarry: number;
      stairs: number;
      bulky: number;
      packing: number;
      other: number;
      notes?: string | null;
    };
    loadingReportPhotoUrl?: string | null;
    contractPhotoUrl?: string | null;
  }): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const accessorialsTotal =
        data.accessorials.shuttle +
        data.accessorials.longCarry +
        data.accessorials.stairs +
        data.accessorials.bulky +
        data.accessorials.packing +
        data.accessorials.other;

      const { error } = await supabase
        .from('loads')
        .update({
          contract_details_entered_at: new Date().toISOString(),
          contract_balance_due: data.contractBalanceDue,
          contract_job_number: data.contractJobNumber || null,
          customer_name: data.customerName || null,
          customer_phone: data.customerPhone || null,
          delivery_address_full: data.deliveryAddressFull || null,
          contract_linehaul_total: data.contractLinehaulTotal,
          amount_company_owes: data.amountCompanyOwes,
          contract_accessorials_shuttle: data.accessorials.shuttle || null,
          contract_accessorials_stairs: data.accessorials.stairs || null,
          contract_accessorials_long_carry: data.accessorials.longCarry || null,
          contract_accessorials_bulky: data.accessorials.bulky || null,
          contract_accessorials_packing: data.accessorials.packing || null,
          contract_accessorials_other: data.accessorials.other || null,
          contract_accessorials_total: accessorialsTotal || null,
          contract_accessorials_notes: data.accessorials.notes || null,
          loading_report_photo_url: data.loadingReportPhotoUrl || null,
          contract_photo_url: data.contractPhotoUrl || null,
          // Set balance_due_on_delivery for the delivery workflow
          balance_due_on_delivery: data.contractBalanceDue,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save contract details' };
    } finally {
      setLoading(false);
    }
  };

  // Check if load requires contract details entry (partner/marketplace loads)
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

      // Requires contract details if:
      // - load_source is 'partner' or 'marketplace'
      // - AND contract_details_entered_at is null
      const isPartnerOrMarketplace =
        load?.load_source === 'partner' || load?.load_source === 'marketplace';
      const notYetEntered = !load?.contract_details_entered_at;

      return {
        required: isPartnerOrMarketplace && notYetEntered,
        loadSource: load?.load_source,
      };
    } catch {
      return { required: false };
    }
  };

  return {
    loading,
    acceptLoad,
    startLoading,
    finishLoading,
    startDelivery,
    completeDelivery,
    saveContractDetails,
    requiresContractDetails,
  };
}

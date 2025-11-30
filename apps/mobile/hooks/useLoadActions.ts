import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadStatus, PaymentMethod, ZelleRecipient, DamageItem } from '../types';
import { useAuth } from '../providers/AuthProvider';
import {
  notifyOwnerLoadAccepted,
  notifyOwnerLoadingStarted,
  notifyOwnerLoadingFinished,
  notifyOwnerDeliveryStarted,
  notifyOwnerDeliveryCompleted,
  notifyOwnerPickupCompleted,
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

  // Collect payment and start delivery (loaded → in_transit)
  const collectPaymentAndStartDelivery = async (data: {
    paymentMethod: PaymentMethod;
    amountCollected: number;
    zelleRecipient?: ZelleRecipient | null;
    paymentPhotoFrontUrl?: string | null;
    paymentPhotoBackUrl?: string | null;
    paymentNotes?: string | null;
  }): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'in_transit' as LoadStatus,
          delivery_started_at: new Date().toISOString(),
          payment_method: data.paymentMethod,
          amount_collected_on_delivery: data.amountCollected,
          payment_zelle_recipient: data.zelleRecipient || null,
          payment_photo_front_url: data.paymentPhotoFrontUrl || null,
          payment_photo_back_url: data.paymentPhotoBackUrl || null,
          payment_notes: data.paymentNotes || null,
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

  // Check if load requires pickup completion (posting_type = 'pickup')
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

      // Requires pickup completion if:
      // - posting_type is 'pickup'
      // - AND pickup_completed_at is null
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

  // Complete pickup (for posting_type = 'pickup' loads after loading)
  const completePickup = async (data: {
    contractActualCuft: number;
    contractRatePerCuft: number;
    contractLinehaulTotal: number;
    contractBalanceDue: number;
    accessorials?: {
      shuttle?: number;
      longCarry?: number;
      stairs?: number;
      bulky?: number;
      packing?: number;
      other?: number;
      notes?: string | null;
    };
    amountCollectedAtPickup: number;
    paymentMethod?: PaymentMethod | null;
    zelleRecipient?: ZelleRecipient | null;
    paymentPhotoFrontUrl?: string | null;
    paymentPhotoBackUrl?: string | null;
    customerRfdDate: string;
    customerRfdDateEnd?: string | null;
    deliveryNotes?: string | null;
    contractPhotoUrl?: string | null;
    additionalDocsUrls?: string[];
  }): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      // Calculate accessorials total
      const accessorialsTotal =
        (data.accessorials?.shuttle || 0) +
        (data.accessorials?.longCarry || 0) +
        (data.accessorials?.stairs || 0) +
        (data.accessorials?.bulky || 0) +
        (data.accessorials?.packing || 0) +
        (data.accessorials?.other || 0);

      // Calculate remaining balance for delivery
      const remainingBalance = data.contractBalanceDue - data.amountCollectedAtPickup;

      const { error } = await supabase
        .from('loads')
        .update({
          // Status update
          load_status: 'loaded' as LoadStatus,
          loading_finished_at: new Date().toISOString(),
          pickup_completed_at: new Date().toISOString(),
          // Contract details
          actual_cuft_loaded: data.contractActualCuft,
          rate_per_cuft: data.contractRatePerCuft,
          contract_linehaul_total: data.contractLinehaulTotal,
          contract_balance_due: data.contractBalanceDue,
          // Accessorials
          contract_accessorials_shuttle: data.accessorials?.shuttle || null,
          contract_accessorials_long_carry: data.accessorials?.longCarry || null,
          contract_accessorials_stairs: data.accessorials?.stairs || null,
          contract_accessorials_bulky: data.accessorials?.bulky || null,
          contract_accessorials_packing: data.accessorials?.packing || null,
          contract_accessorials_other: data.accessorials?.other || null,
          contract_accessorials_total: accessorialsTotal || null,
          contract_accessorials_notes: data.accessorials?.notes || null,
          // Payment at pickup
          amount_collected_at_pickup: data.amountCollectedAtPickup,
          remaining_balance_for_delivery: remainingBalance,
          payment_method: data.paymentMethod || null,
          payment_zelle_recipient: data.zelleRecipient || null,
          payment_photo_front_url: data.paymentPhotoFrontUrl || null,
          payment_photo_back_url: data.paymentPhotoBackUrl || null,
          // For delivery workflow
          balance_due_on_delivery: remainingBalance,
          // Delivery scheduling
          customer_rfd_date: data.customerRfdDate,
          customer_rfd_date_end: data.customerRfdDateEnd || null,
          delivery_notes: data.deliveryNotes || null,
          // Documentation
          contract_photo_url: data.contractPhotoUrl || null,
          // Note: additional_docs_urls would need to be handled separately if it's a JSON array
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      // Notify owner (fire-and-forget)
      notifyOwnerPickupCompleted(loadId, data.contractActualCuft);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete pickup' };
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PRE-EXISTING DAMAGE FUNCTIONS
  // ============================================

  // Get current damages for the load
  const getDamages = async (): Promise<DamageItem[]> => {
    try {
      const driver = await getDriverInfo();

      const { data: load, error } = await supabase
        .from('loads')
        .select('pre_existing_damages')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (error) throw error;

      return (load?.pre_existing_damages as DamageItem[]) || [];
    } catch {
      return [];
    }
  };

  // Add a damage item
  const addDamageItem = async (item: Omit<DamageItem, 'id' | 'documented_at'>): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      // Get current damages
      const currentDamages = await getDamages();

      // Create new item with generated ID and timestamp
      const newItem: DamageItem = {
        ...item,
        id: crypto.randomUUID(),
        documented_at: new Date().toISOString(),
      };

      // Add to array
      const updatedDamages = [...currentDamages, newItem];

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add damage item' };
    } finally {
      setLoading(false);
    }
  };

  // Remove a damage item by ID
  const removeDamageItem = async (itemId: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      // Get current damages
      const currentDamages = await getDamages();

      // Filter out the item
      const updatedDamages = currentDamages.filter(d => d.id !== itemId);

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove damage item' };
    } finally {
      setLoading(false);
    }
  };

  // Update a damage item
  const updateDamageItem = async (itemId: string, updates: Partial<Omit<DamageItem, 'id' | 'documented_at'>>): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      // Get current damages
      const currentDamages = await getDamages();

      // Find and update the item
      const updatedDamages = currentDamages.map(d =>
        d.id === itemId ? { ...d, ...updates } : d
      );

      const { error } = await supabase
        .from('loads')
        .update({
          pre_existing_damages: updatedDamages,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update damage item' };
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
    collectPaymentAndStartDelivery,
    saveContractDetails,
    requiresContractDetails,
    requiresPickupCompletion,
    completePickup,
    // Damage functions
    getDamages,
    addDamageItem,
    removeDamageItem,
    updateDamageItem,
  };
}

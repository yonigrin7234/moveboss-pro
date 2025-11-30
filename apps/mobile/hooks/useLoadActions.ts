import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadStatus, PaymentMethod, ZelleRecipient, DamageItem, Load } from '../types';
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

// Delivery order check result
export interface DeliveryOrderCheck {
  allowed: boolean;
  reason?: string;
  nextLoad?: {
    id: string;
    delivery_order: number;
    customer_name: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
  };
  currentDeliveryIndex: number | null;
  thisLoadDeliveryOrder: number | null;
}

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

  /**
   * Check if delivery can start based on delivery order.
   * Returns allowed=true if:
   * - Load has no delivery_order set (null)
   * - Load's delivery_order matches trip's current_delivery_index
   * - No other loads with lower delivery_order are pending delivery
   */
  const checkDeliveryOrder = async (): Promise<DeliveryOrderCheck> => {
    try {
      const driver = await getDriverInfo();

      // Get this load's info including delivery_order
      const { data: thisLoad, error: loadError } = await supabase
        .from('loads')
        .select('id, delivery_order, customer_name, delivery_city, delivery_state, load_status')
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .single();

      if (loadError || !thisLoad) {
        return { allowed: false, reason: 'Load not found', currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
      }

      // If this load has no delivery_order, it can be delivered anytime
      if (thisLoad.delivery_order === null || thisLoad.delivery_order === undefined) {
        return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
      }

      // Find the trip this load is associated with
      const { data: tripLoad, error: tripLoadError } = await supabase
        .from('trip_loads')
        .select('trip_id')
        .eq('load_id', loadId)
        .single();

      if (tripLoadError || !tripLoad) {
        // Load not associated with a trip, allow delivery
        return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: thisLoad.delivery_order };
      }

      // Get trip's current_delivery_index
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, current_delivery_index')
        .eq('id', tripLoad.trip_id)
        .single();

      if (tripError || !trip) {
        return { allowed: false, reason: 'Trip not found', currentDeliveryIndex: null, thisLoadDeliveryOrder: thisLoad.delivery_order };
      }

      const currentIndex = trip.current_delivery_index || 1;

      // If this load's delivery_order matches current_delivery_index, allow
      if (thisLoad.delivery_order === currentIndex) {
        return {
          allowed: true,
          currentDeliveryIndex: currentIndex,
          thisLoadDeliveryOrder: thisLoad.delivery_order
        };
      }

      // If this load's delivery_order is higher than current_delivery_index,
      // find which load should be delivered first
      if (thisLoad.delivery_order > currentIndex) {
        // Get all loads for this trip that are not yet delivered and have delivery_order
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
            thisLoadDeliveryOrder: thisLoad.delivery_order
          };
        }

        // Find loads that should be delivered before this one
        const loadsBeforeThis = tripLoads
          .map(tl => tl.loads as unknown as {
            id: string;
            delivery_order: number | null;
            customer_name: string | null;
            delivery_city: string | null;
            delivery_state: string | null;
            load_status: string;
          })
          .filter(load =>
            load &&
            load.delivery_order !== null &&
            load.delivery_order < thisLoad.delivery_order &&
            load.load_status !== 'delivered' &&
            load.load_status !== 'storage_completed'
          )
          .sort((a, b) => (a.delivery_order || 0) - (b.delivery_order || 0));

        if (loadsBeforeThis.length > 0) {
          const nextLoad = loadsBeforeThis[0];
          const customerDisplay = nextLoad.customer_name ||
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

      // If we get here, this load can be delivered (no blocking loads found)
      return {
        allowed: true,
        currentDeliveryIndex: currentIndex,
        thisLoadDeliveryOrder: thisLoad.delivery_order
      };
    } catch (err) {
      console.error('Error checking delivery order:', err);
      // On error, allow delivery to not block the driver
      return { allowed: true, currentDeliveryIndex: null, thisLoadDeliveryOrder: null };
    }
  };

  /**
   * Increment trip's current_delivery_index after a delivery is completed
   */
  const incrementDeliveryIndex = async (completedDeliveryOrder: number | null): Promise<void> => {
    if (completedDeliveryOrder === null) return;

    try {
      const driver = await getDriverInfo();

      // Find the trip this load is associated with
      const { data: tripLoad } = await supabase
        .from('trip_loads')
        .select('trip_id')
        .eq('load_id', loadId)
        .single();

      if (!tripLoad) return;

      // Get current trip state
      const { data: trip } = await supabase
        .from('trips')
        .select('current_delivery_index')
        .eq('id', tripLoad.trip_id)
        .single();

      if (!trip) return;

      const currentIndex = trip.current_delivery_index || 1;

      // Only increment if completed order matches current index
      if (completedDeliveryOrder === currentIndex) {
        await supabase
          .from('trips')
          .update({ current_delivery_index: currentIndex + 1 })
          .eq('id', tripLoad.trip_id)
          .eq('owner_id', driver.owner_id);
      }
    } catch (err) {
      console.error('Error incrementing delivery index:', err);
      // Non-critical, don't throw
    }
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

      // Check delivery order before allowing
      const orderCheck = await checkDeliveryOrder();
      if (!orderCheck.allowed) {
        return {
          success: false,
          error: orderCheck.reason || 'Cannot start delivery - check delivery order'
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

      // Get load's delivery_order before completing
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

      // Increment trip's current_delivery_index (fire-and-forget)
      incrementDeliveryIndex(load?.delivery_order || null);

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

      // Check delivery order before allowing
      const orderCheck = await checkDeliveryOrder();
      if (!orderCheck.allowed) {
        return {
          success: false,
          error: orderCheck.reason || 'Cannot start delivery - check delivery order'
        };
      }

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
    // Delivery order
    checkDeliveryOrder,
    // Damage functions
    getDamages,
    addDamageItem,
    removeDamageItem,
    updateDamageItem,
  };
}

import type { PaymentMethod, ZelleRecipient } from '../types';
import { supabase } from '../lib/supabase';
import {
  notifyOwnerDeliveryStarted,
  notifyOwnerPickupCompleted,
} from '../lib/notify-owner';
import type { LoadActionBaseContext } from './useLoadActionBase';
import type { ActionResult } from './useLoadActions.types';

export function useLoadPaymentActions(context: LoadActionBaseContext) {
  const { loadId, onSuccess, setLoading, getDriverInfo, checkDeliveryOrder } = context;

  const collectPaymentAndStartDelivery = async (data: {
    paymentMethod: PaymentMethod;
    amountCollected: number;
    zelleRecipient?: ZelleRecipient | null;
    paymentPhotoFrontUrl?: string | null;
    paymentPhotoBackUrl?: string | null;
    paymentNotes?: string | null;
    authorizationName?: string | null; // For $0 balance authorization
  }): Promise<ActionResult> => {
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

      // Build notes for $0 balance authorization
      let notes = data.paymentNotes || null;
      if (data.authorizationName && data.amountCollected === 0) {
        notes = `$0 balance authorized by: ${data.authorizationName}`;
      }

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'in_transit',
          delivery_started_at: new Date().toISOString(),
          payment_method: data.paymentMethod,
          amount_collected_on_delivery: data.amountCollected,
          payment_zelle_recipient: data.zelleRecipient || null,
          payment_photo_front_url: data.paymentPhotoFrontUrl || null,
          payment_photo_back_url: data.paymentPhotoBackUrl || null,
          payment_notes: notes,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      if (data.amountCollected > 0 && data.paymentMethod !== 'already_paid') {
        const methodMap: Record<string, string> = {
          cash: 'cash',
          zelle: 'zelle',
          cashier_check: 'check',
          money_order: 'money_order',
          personal_check: 'check',
          venmo: 'venmo',
        };

        await supabase.from('load_payments').insert({
          load_id: loadId,
          owner_id: driver.owner_id,
          payment_type: 'cod',
          amount: data.amountCollected,
          method: methodMap[data.paymentMethod] || 'other',
          collected_by: 'driver',
          collected_at: new Date().toISOString(),
          notes: data.paymentNotes || (data.zelleRecipient ? `Zelle to ${data.zelleRecipient}` : null),
        });
      }

      notifyOwnerDeliveryStarted(loadId);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to start delivery' };
    } finally {
      setLoading(false);
    }
  };

  const saveContractDetails = async (data: {
    contractBalanceDue: number;
    contractRatePerCuft: number;
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
          rate_per_cuft: data.contractRatePerCuft,
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

      const accessorialsTotal =
        (data.accessorials?.shuttle || 0) +
        (data.accessorials?.longCarry || 0) +
        (data.accessorials?.stairs || 0) +
        (data.accessorials?.bulky || 0) +
        (data.accessorials?.packing || 0) +
        (data.accessorials?.other || 0);

      const remainingBalance = data.contractBalanceDue - data.amountCollectedAtPickup;

      const { error } = await supabase
        .from('loads')
        .update({
          load_status: 'loaded',
          loading_finished_at: new Date().toISOString(),
          pickup_completed_at: new Date().toISOString(),
          actual_cuft_loaded: data.contractActualCuft,
          rate_per_cuft: data.contractRatePerCuft,
          contract_linehaul_total: data.contractLinehaulTotal,
          contract_balance_due: data.contractBalanceDue,
          contract_accessorials_shuttle: data.accessorials?.shuttle || null,
          contract_accessorials_long_carry: data.accessorials?.longCarry || null,
          contract_accessorials_stairs: data.accessorials?.stairs || null,
          contract_accessorials_bulky: data.accessorials?.bulky || null,
          contract_accessorials_packing: data.accessorials?.packing || null,
          contract_accessorials_other: data.accessorials?.other || null,
          contract_accessorials_total: accessorialsTotal || null,
          contract_accessorials_notes: data.accessorials?.notes || null,
          amount_collected_at_pickup: data.amountCollectedAtPickup,
          remaining_balance_for_delivery: remainingBalance,
          payment_method: data.paymentMethod || null,
          payment_zelle_recipient: data.zelleRecipient || null,
          payment_photo_front_url: data.paymentPhotoFrontUrl || null,
          payment_photo_back_url: data.paymentPhotoBackUrl || null,
          balance_due_on_delivery: remainingBalance,
          customer_rfd_date: data.customerRfdDate,
          customer_rfd_date_end: data.customerRfdDateEnd || null,
          delivery_notes: data.deliveryNotes || null,
          contract_photo_url: data.contractPhotoUrl || null,
        })
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;

      if (data.amountCollectedAtPickup > 0 && data.paymentMethod && data.paymentMethod !== 'already_paid') {
        const methodMap: Record<string, string> = {
          cash: 'cash',
          zelle: 'zelle',
          cashier_check: 'check',
          money_order: 'money_order',
          personal_check: 'check',
          venmo: 'venmo',
        };

        await supabase.from('load_payments').insert({
          load_id: loadId,
          owner_id: driver.owner_id,
          payment_type: 'customer_balance',
          amount: data.amountCollectedAtPickup,
          method: methodMap[data.paymentMethod] || 'other',
          collected_by: 'driver',
          collected_at: new Date().toISOString(),
          notes: data.zelleRecipient ? `Zelle to ${data.zelleRecipient}` : 'Collected at pickup',
        });
      }

      notifyOwnerPickupCompleted(loadId, data.contractActualCuft);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete pickup' };
    } finally {
      setLoading(false);
    }
  };

  return {
    collectPaymentAndStartDelivery,
    saveContractDetails,
    completePickup,
  };
}











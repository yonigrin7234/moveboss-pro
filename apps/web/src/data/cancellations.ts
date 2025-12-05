import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import {
  notifyRequestWithdrawn,
  notifyLoadGivenBack,
  notifyCarrierCanceled,
} from './notifications';

// Carrier cancels their pending request
export async function withdrawLoadRequest(
  requestId: string,
  carrierOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get request details - use explicit FK syntax
  const { data: request } = await supabase
    .from('load_requests')
    .select(
      `
      *,
      load:loads!load_requests_load_id_fkey(
        id,
        load_number,
        owner_id,
        company_id
      ),
      carrier:companies!load_requests_carrier_id_fkey(id, name)
    `
    )
    .eq('id', requestId)
    .eq('carrier_owner_id', carrierOwnerId)
    .eq('status', 'pending')
    .single();

  if (!request) {
    return { success: false, error: 'Request not found or not pending' };
  }

  // Update request status
  const { error } = await supabase
    .from('load_requests')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error withdrawing request:', error);
    return { success: false, error: error.message };
  }

  // Notify company
  const load = Array.isArray(request.load) ? request.load[0] : request.load;
  const carrier = Array.isArray(request.carrier) ? request.carrier[0] : request.carrier;

  if (load) {
    await notifyRequestWithdrawn(
      load.owner_id,
      load.company_id,
      load.id,
      carrier?.name || 'Carrier',
      load.load_number
    );
  }

  return { success: true };
}

// Carrier gives load back after acceptance
export async function giveLoadBack(
  loadId: string,
  carrierOwnerId: string,
  carrierId: string,
  reasonCode: string,
  reasonDetails?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get load details - avoid joining companies due to RLS
  const { data: load, error: loadQueryError } = await supabase
    .from('loads')
    .select('*, source_company_name')
    .eq('id', loadId)
    .eq('assigned_carrier_id', carrierId)
    .single();

  if (loadQueryError) {
    console.error('[giveLoadBack] Load query error:', loadQueryError);
    return { success: false, error: loadQueryError.message };
  }

  if (!load) {
    return { success: false, error: 'Load not found or not assigned to you' };
  }

  // Get carrier name separately (carrier should be able to read their own company)
  const { data: carrierCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', carrierId)
    .single();

  // Determine load stage
  const loadStage = load.carrier_confirmed_at ? 'confirmed' : 'accepted';

  // Use service role client to bypass RLS for database updates
  // We've already verified the carrier is assigned to this load above
  const adminClient = createServiceRoleClient();

  // Record cancellation
  const { error: cancelError } = await adminClient.from('load_cancellations').insert({
    load_id: loadId,
    load_number: load.load_number,
    canceled_by_type: 'carrier',
    canceled_by_company_id: carrierId,
    canceled_by_user_id: carrierOwnerId,
    affected_company_id: load.company_id,
    reason_code: reasonCode,
    reason_details: reasonDetails,
    fault_party: 'carrier', // Carrier giving back = carrier's fault
    load_stage: loadStage,
  });

  if (cancelError) {
    console.error('Error recording cancellation:', cancelError);
  }

  // Update load - remove carrier, put back on marketplace
  const { error: loadError } = await adminClient
    .from('loads')
    .update({
      assigned_carrier_id: null,
      carrier_assigned_at: null,
      carrier_confirmed_at: null,
      carrier_rate: null,
      carrier_rate_type: null,
      expected_load_date: null,
      assigned_driver_id: null,
      assigned_driver_name: null,
      assigned_driver_phone: null,
      load_status: 'pending',
      posting_status: 'posted', // Reset posting status so it shows on marketplace
      is_marketplace_visible: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId);

  if (loadError) {
    console.error('Error updating load:', loadError);
    return { success: false, error: loadError.message };
  }

  // Update request status - also use admin client
  await adminClient
    .from('load_requests')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('load_id', loadId)
    .eq('carrier_id', carrierId)
    .eq('status', 'accepted');

  // Update carrier stats
  await adminClient.rpc('increment_loads_given_back', { p_company_id: carrierId });

  // Notify company
  const reasonLabels: Record<string, string> = {
    schedule_conflict: 'Schedule conflict',
    equipment_issue: 'Equipment issue',
    found_better_load: 'Found better load',
    emergency: 'Emergency',
    capacity_issue: 'Capacity issue',
    equipment_breakdown: 'Equipment breakdown',
    driver_unavailable: 'Driver unavailable',
    scheduling_conflict: 'Scheduling conflict',
    other: reasonDetails || 'Other',
  };

  await notifyLoadGivenBack(
    load.owner_id,
    load.company_id,
    loadId,
    carrierCompany?.name || 'Carrier',
    load.load_number,
    reasonLabels[reasonCode] || reasonCode
  );

  return { success: true };
}

// Company cancels carrier assignment
export async function cancelCarrierAssignment(
  loadId: string,
  companyOwnerId: string,
  companyId: string,
  reasonCode: string,
  reasonDetails?: string,
  repostToMarketplace: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get load details
  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      *,
      company:companies!loads_company_id_fkey(id, name),
      carrier:companies!loads_assigned_carrier_id_fkey(id, name, owner_id)
    `
    )
    .eq('id', loadId)
    .eq('company_id', companyId)
    .not('assigned_carrier_id', 'is', null)
    .single();

  if (!load) {
    return { success: false, error: 'Load not found or no carrier assigned' };
  }

  // Determine fault party based on reason
  const carrierFaultReasons = ['carrier_not_responding', 'carrier_requested'];
  const faultParty = carrierFaultReasons.includes(reasonCode) ? 'carrier' : 'company';

  // Determine load stage
  const loadStage = load.carrier_confirmed_at ? 'confirmed' : 'accepted';

  // Record cancellation
  const { error: cancelError } = await supabase.from('load_cancellations').insert({
    load_id: loadId,
    load_number: load.load_number,
    canceled_by_type: 'company',
    canceled_by_company_id: companyId,
    canceled_by_user_id: companyOwnerId,
    affected_company_id: load.assigned_carrier_id,
    reason_code: reasonCode,
    reason_details: reasonDetails,
    fault_party: faultParty,
    load_stage: loadStage,
  });

  if (cancelError) {
    console.error('Error recording cancellation:', cancelError);
  }

  const carrierId = load.assigned_carrier_id;

  // Update load
  const { error: loadError } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: null,
      carrier_assigned_at: null,
      carrier_confirmed_at: null,
      carrier_rate: null,
      carrier_rate_type: null,
      expected_load_date: null,
      assigned_driver_id: null,
      assigned_driver_name: null,
      assigned_driver_phone: null,
      load_status: repostToMarketplace ? 'pending' : 'canceled',
      is_marketplace_visible: repostToMarketplace,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId);

  if (loadError) {
    console.error('Error updating load:', loadError);
    return { success: false, error: loadError.message };
  }

  // Update request status
  await supabase
    .from('load_requests')
    .update({
      status: 'canceled',
      response_message: `Canceled: ${reasonCode}`,
      updated_at: new Date().toISOString(),
    })
    .eq('load_id', loadId)
    .eq('carrier_id', carrierId)
    .eq('status', 'accepted');

  // Update stats based on fault
  if (faultParty === 'company') {
    await supabase.rpc('increment_loads_canceled', { p_company_id: companyId });
  } else {
    await supabase.rpc('increment_loads_given_back', { p_company_id: carrierId });
  }

  // Notify carrier
  const reasonLabels: Record<string, string> = {
    customer_changed_dates: 'Customer changed dates',
    customer_canceled: 'Customer canceled',
    load_unavailable: 'Load no longer available',
    carrier_not_responding: 'Not responding',
    carrier_requested: 'By your request',
    found_different_carrier: 'Assigned to different carrier',
    other: reasonDetails || 'Other',
  };

  // Get carrier owner_id
  const carrier = Array.isArray(load.carrier) ? load.carrier[0] : load.carrier;
  const company = Array.isArray(load.company) ? load.company[0] : load.company;

  if (carrier?.owner_id) {
    await notifyCarrierCanceled(
      carrier.owner_id,
      carrierId,
      loadId,
      company?.name || 'Company',
      load.load_number,
      reasonLabels[reasonCode] || reasonCode
    );
  }

  return { success: true };
}

// Get cancellation stats for a company
export async function getCancellationStats(companyId: string): Promise<{
  asCarrier: { givenBack: number; accepted: number; rate: number };
  asCompany: { canceled: number; assigned: number; rate: number };
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('companies')
    .select(
      `
      loads_given_back,
      loads_accepted_total,
      loads_canceled_on_carriers,
      loads_assigned_total
    `
    )
    .eq('id', companyId)
    .single();

  const givenBack = data?.loads_given_back || 0;
  const accepted = data?.loads_accepted_total || 0;
  const canceled = data?.loads_canceled_on_carriers || 0;
  const assigned = data?.loads_assigned_total || 0;

  return {
    asCarrier: {
      givenBack,
      accepted,
      rate: accepted > 0 ? (givenBack / accepted) * 100 : 0,
    },
    asCompany: {
      canceled,
      assigned,
      rate: assigned > 0 ? (canceled / assigned) * 100 : 0,
    },
  };
}

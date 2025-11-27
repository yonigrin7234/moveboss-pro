import { createClient } from '@/lib/supabase-server';

export interface MarketplaceLoad {
  id: string;
  load_number: string;
  company_id: string;
  company: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    platform_loads_completed: number;
    platform_rating: number | null;
  } | null;

  // Origin (ZIP always visible)
  origin_city: string;
  origin_state: string;
  origin_zip: string;

  // Destination (ZIP always visible)
  destination_city: string;
  destination_state: string;
  destination_zip: string;

  // Size
  estimated_cuft: number | null;
  estimated_weight_lbs: number | null;
  pieces_count: number | null;
  pricing_mode: string;

  // Rate
  company_rate: number | null;
  company_rate_type: string;
  rate_is_fixed: boolean;

  // Availability
  is_ready_now: boolean;
  available_date: string | null;
  delivery_urgency: string;

  // Equipment
  equipment_type: string | null;

  // Notes (visible to carriers)
  special_instructions: string | null;

  // Timestamps
  posted_to_marketplace_at: string;
  created_at: string;

  // Request status for current carrier
  my_request_status?: string | null;
  my_request_id?: string | null;
}

export interface LoadRequest {
  id: string;
  load_id: string;
  carrier_id: string;
  carrier_owner_id: string;
  carrier: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    mc_number: string | null;
    dot_number: string | null;
    platform_loads_completed: number;
    platform_rating: number | null;
  } | null;
  is_partner: boolean;
  partnership_id: string | null;
  offered_rate: number | null;
  offered_rate_type: string;
  accepted_company_rate: boolean;
  message: string | null;
  status: string;
  responded_at: string | null;
  response_message: string | null;
  final_rate: number | null;
  final_rate_type: string | null;
  creates_partnership: boolean;
  created_at: string;
}

// Get marketplace loads (all visible loads)
export async function getMarketplaceLoads(filters?: {
  origin_state?: string;
  destination_state?: string;
  equipment_type?: string;
  min_cuft?: number;
  max_cuft?: number;
}): Promise<MarketplaceLoad[]> {
  const supabase = await createClient();

  let query = supabase
    .from('loads')
    .select(`
      id,
      load_number,
      company_id,
      company:companies!loads_company_id_fkey(
        id, name, city, state,
        platform_loads_completed, platform_rating
      ),
      origin_city,
      origin_state,
      origin_zip,
      destination_city,
      destination_state,
      destination_zip,
      estimated_cuft,
      estimated_weight_lbs,
      pieces_count,
      pricing_mode,
      company_rate,
      company_rate_type,
      rate_is_fixed,
      is_ready_now,
      available_date,
      delivery_urgency,
      equipment_type,
      special_instructions,
      posted_to_marketplace_at,
      created_at
    `)
    .eq('is_marketplace_visible', true)
    .eq('load_status', 'pending')
    .is('assigned_carrier_id', null)
    .order('posted_to_marketplace_at', { ascending: false });

  // Apply filters
  if (filters?.origin_state) {
    query = query.eq('origin_state', filters.origin_state);
  }
  if (filters?.destination_state) {
    query = query.eq('destination_state', filters.destination_state);
  }
  if (filters?.equipment_type) {
    query = query.eq('equipment_type', filters.equipment_type);
  }
  if (filters?.min_cuft) {
    query = query.gte('estimated_cuft', filters.min_cuft);
  }
  if (filters?.max_cuft) {
    query = query.lte('estimated_cuft', filters.max_cuft);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching marketplace loads:', error);
    return [];
  }

  return (data || []) as unknown as MarketplaceLoad[];
}

// Get marketplace load with carrier's request status
export async function getMarketplaceLoadWithRequestStatus(
  loadId: string,
  carrierOwnerId: string
): Promise<MarketplaceLoad | null> {
  const supabase = await createClient();

  const { data: load, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      company_id,
      company:companies!loads_company_id_fkey(
        id, name, city, state,
        platform_loads_completed, platform_rating
      ),
      origin_city,
      origin_state,
      origin_zip,
      destination_city,
      destination_state,
      destination_zip,
      estimated_cuft,
      estimated_weight_lbs,
      pieces_count,
      pricing_mode,
      company_rate,
      company_rate_type,
      rate_is_fixed,
      is_ready_now,
      available_date,
      delivery_urgency,
      equipment_type,
      special_instructions,
      posted_to_marketplace_at,
      created_at
    `)
    .eq('id', loadId)
    .eq('is_marketplace_visible', true)
    .single();

  if (error || !load) {
    console.error('Error fetching load:', error);
    return null;
  }

  // Check if carrier has a request on this load
  const { data: request } = await supabase
    .from('load_requests')
    .select('id, status')
    .eq('load_id', loadId)
    .eq('carrier_owner_id', carrierOwnerId)
    .single();

  return {
    ...(load as unknown as MarketplaceLoad),
    my_request_status: request?.status || null,
    my_request_id: request?.id || null,
  };
}

// Get requests for a load (company view)
export async function getLoadRequests(loadId: string): Promise<LoadRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_requests')
    .select(`
      *,
      carrier:companies!load_requests_carrier_id_fkey(
        id, name, city, state, mc_number, dot_number,
        platform_loads_completed, platform_rating
      )
    `)
    .eq('load_id', loadId)
    .order('is_partner', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching load requests:', error);
    return [];
  }

  return (data || []) as unknown as LoadRequest[];
}

// Create a load request (carrier requesting a load)
export async function createLoadRequest(
  carrierOwnerId: string,
  carrierId: string,
  data: {
    load_id: string;
    offered_rate?: number;
    offered_rate_type?: string;
    accepted_company_rate: boolean;
    message?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  // Check if carrier already has a pending request
  const { data: existingRequest } = await supabase
    .from('load_requests')
    .select('id')
    .eq('load_id', data.load_id)
    .eq('carrier_id', carrierId)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return { success: false, error: 'You already have a pending request for this load' };
  }

  // Get load to find company_id
  const { data: load } = await supabase
    .from('loads')
    .select('company_id, owner_id')
    .eq('id', data.load_id)
    .single();

  if (!load) {
    return { success: false, error: 'Load not found' };
  }

  // Check if carrier is a partner
  const { data: partnership } = await supabase
    .from('company_partnerships')
    .select('id')
    .or(
      `and(company_a_id.eq.${load.company_id},company_b_id.eq.${carrierId}),and(company_a_id.eq.${carrierId},company_b_id.eq.${load.company_id})`
    )
    .eq('status', 'active')
    .single();

  const { data: result, error } = await supabase
    .from('load_requests')
    .insert({
      load_id: data.load_id,
      carrier_id: carrierId,
      carrier_owner_id: carrierOwnerId,
      is_partner: !!partnership,
      partnership_id: partnership?.id || null,
      offered_rate: data.offered_rate,
      offered_rate_type: data.offered_rate_type || 'per_cuft',
      accepted_company_rate: data.accepted_company_rate,
      message: data.message,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating load request:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

// Accept a load request (company accepting carrier)
export async function acceptLoadRequest(
  requestId: string,
  responderId: string,
  responseMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the request details
  const { data: request } = await supabase
    .from('load_requests')
    .select('*, load:loads(*)')
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  const loadData = request.load as Record<string, unknown>;

  // Determine final rate
  const finalRate = request.accepted_company_rate
    ? (loadData.company_rate as number)
    : request.offered_rate;
  const finalRateType = request.accepted_company_rate
    ? (loadData.company_rate_type as string)
    : request.offered_rate_type;

  // Update the request
  const { error: requestError } = await supabase
    .from('load_requests')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      responded_by_id: responderId,
      response_message: responseMessage,
      final_rate: finalRate,
      final_rate_type: finalRateType,
      creates_partnership: !request.is_partner,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (requestError) {
    console.error('Error accepting request:', requestError);
    return { success: false, error: requestError.message };
  }

  // Update the load with carrier assignment
  const { error: loadError } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: request.carrier_id,
      carrier_assigned_at: new Date().toISOString(),
      carrier_rate: finalRate,
      carrier_rate_type: finalRateType,
      load_status: 'pending', // Carrier needs to confirm
      is_marketplace_visible: false, // Remove from marketplace
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.load_id);

  if (loadError) {
    console.error('Error updating load:', loadError);
    return { success: false, error: loadError.message };
  }

  // Decline all other pending requests for this load
  await supabase
    .from('load_requests')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
      response_message: 'Load assigned to another carrier',
      updated_at: new Date().toISOString(),
    })
    .eq('load_id', request.load_id)
    .eq('status', 'pending')
    .neq('id', requestId);

  // If new partnership, create it
  if (!request.is_partner) {
    await supabase.from('company_partnerships').insert({
      owner_id: loadData.owner_id as string,
      company_a_id: loadData.company_id as string,
      company_b_id: request.carrier_id,
      relationship_type: 'gives_loads',
      status: 'active',
      payment_terms: 'net_30',
    });
  }

  return { success: true };
}

// Decline a load request
export async function declineLoadRequest(
  requestId: string,
  responderId: string,
  responseMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('load_requests')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
      responded_by_id: responderId,
      response_message: responseMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error declining request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Withdraw a load request (carrier withdrawing)
export async function withdrawLoadRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

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

  return { success: true };
}

// Carrier confirms load (after accepted) - driver is optional
export async function confirmLoadAssignment(
  loadId: string,
  data: {
    expected_load_date: string;
    assigned_driver_id?: string;
    assigned_driver_name?: string;
    assigned_driver_phone?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('loads')
    .update({
      carrier_confirmed_at: new Date().toISOString(),
      expected_load_date: data.expected_load_date,
      assigned_driver_id: data.assigned_driver_id || null,
      assigned_driver_name: data.assigned_driver_name || null,
      assigned_driver_phone: data.assigned_driver_phone || null,
      load_status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error confirming load:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Update driver on a load (carrier can assign driver later)
export async function updateLoadDriver(
  loadId: string,
  data: {
    assigned_driver_id?: string;
    assigned_driver_name: string;
    assigned_driver_phone: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('loads')
    .update({
      assigned_driver_id: data.assigned_driver_id || null,
      assigned_driver_name: data.assigned_driver_name,
      assigned_driver_phone: data.assigned_driver_phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error updating driver:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get carrier's assigned loads (confirmed)
export async function getCarrierAssignedLoads(carrierOwnerId: string): Promise<
  Array<{
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft: number | null;
    carrier_rate: number | null;
    carrier_rate_type: string;
    load_status: string;
    expected_load_date: string | null;
    assigned_driver_name: string | null;
    carrier_confirmed_at: string | null;
    company: { id: string; name: string } | null;
  }>
> {
  const supabase = await createClient();

  // Get carrier's company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .eq('company_type', 'carrier')
    .single();

  if (!carrier) {
    return [];
  }

  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      id, load_number,
      origin_city, origin_state, origin_zip,
      destination_city, destination_state, destination_zip,
      estimated_cuft, carrier_rate, carrier_rate_type,
      load_status, expected_load_date, assigned_driver_name,
      carrier_confirmed_at,
      company:companies!loads_company_id_fkey(id, name)
    `
    )
    .eq('assigned_carrier_id', carrier.id)
    .not('load_status', 'eq', 'cancelled')
    .order('carrier_assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching assigned loads:', error);
    return [];
  }

  return (data || []) as unknown as Array<{
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft: number | null;
    carrier_rate: number | null;
    carrier_rate_type: string;
    load_status: string;
    expected_load_date: string | null;
    assigned_driver_name: string | null;
    carrier_confirmed_at: string | null;
    company: { id: string; name: string } | null;
  }>;
}

// Get single assigned load with full details (for carrier)
export async function getAssignedLoadDetails(
  loadId: string,
  carrierOwnerId: string
): Promise<{
  id: string;
  load_number: string;
  // Origin with full address (revealed after confirm)
  origin_city: string;
  origin_state: string;
  origin_zip: string;
  origin_address: string | null;
  origin_address2: string | null;
  origin_contact_name: string | null;
  origin_contact_phone: string | null;
  origin_contact_email: string | null;
  origin_gate_code: string | null;
  origin_notes: string | null;
  // Destination
  destination_city: string;
  destination_state: string;
  destination_zip: string;
  destination_address: string | null;
  destination_address2: string | null;
  destination_contact_name: string | null;
  destination_contact_phone: string | null;
  destination_contact_email: string | null;
  destination_gate_code: string | null;
  destination_notes: string | null;
  // Size
  estimated_cuft: number | null;
  estimated_weight_lbs: number | null;
  pieces_count: number | null;
  // Rate
  carrier_rate: number | null;
  carrier_rate_type: string;
  // Status
  load_status: string;
  expected_load_date: string | null;
  carrier_confirmed_at: string | null;
  carrier_assigned_at: string | null;
  // Driver
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  assigned_driver_phone: string | null;
  // Instructions
  special_instructions: string | null;
  // Company
  company: { id: string; name: string; phone: string | null } | null;
} | null> {
  const supabase = await createClient();

  // Get carrier's company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .eq('company_type', 'carrier')
    .single();

  if (!carrier) {
    return null;
  }

  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      id, load_number,
      origin_city, origin_state, origin_zip,
      origin_address, origin_address2,
      origin_contact_name, origin_contact_phone, origin_contact_email,
      origin_gate_code, origin_notes,
      destination_city, destination_state, destination_zip,
      destination_address, destination_address2,
      destination_contact_name, destination_contact_phone, destination_contact_email,
      destination_gate_code, destination_notes,
      estimated_cuft, estimated_weight_lbs, pieces_count,
      carrier_rate, carrier_rate_type,
      load_status, expected_load_date,
      carrier_confirmed_at, carrier_assigned_at,
      assigned_driver_id, assigned_driver_name, assigned_driver_phone,
      special_instructions,
      company:companies!loads_company_id_fkey(id, name, phone)
    `
    )
    .eq('id', loadId)
    .eq('assigned_carrier_id', carrier.id)
    .single();

  if (error || !data) {
    console.error('Error fetching assigned load:', error);
    return null;
  }

  return data as unknown as {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    origin_address: string | null;
    origin_address2: string | null;
    origin_contact_name: string | null;
    origin_contact_phone: string | null;
    origin_contact_email: string | null;
    origin_gate_code: string | null;
    origin_notes: string | null;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    destination_address: string | null;
    destination_address2: string | null;
    destination_contact_name: string | null;
    destination_contact_phone: string | null;
    destination_contact_email: string | null;
    destination_gate_code: string | null;
    destination_notes: string | null;
    estimated_cuft: number | null;
    estimated_weight_lbs: number | null;
    pieces_count: number | null;
    carrier_rate: number | null;
    carrier_rate_type: string;
    load_status: string;
    expected_load_date: string | null;
    carrier_confirmed_at: string | null;
    carrier_assigned_at: string | null;
    assigned_driver_id: string | null;
    assigned_driver_name: string | null;
    assigned_driver_phone: string | null;
    special_instructions: string | null;
    company: { id: string; name: string; phone: string | null } | null;
  };
}

// Get carrier's requests
export async function getCarrierRequests(
  carrierOwnerId: string
): Promise<
  Array<{
    id: string;
    status: string;
    offered_rate: number | null;
    accepted_company_rate: boolean;
    created_at: string;
    load: {
      id: string;
      load_number: string;
      origin_city: string;
      origin_state: string;
      origin_zip: string;
      destination_city: string;
      destination_state: string;
      destination_zip: string;
      estimated_cuft: number | null;
      company_rate: number | null;
      company_rate_type: string;
      company: { id: string; name: string } | null;
    };
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_requests')
    .select(
      `
      id,
      status,
      offered_rate,
      accepted_company_rate,
      created_at,
      load:loads(
        id, load_number,
        origin_city, origin_state, origin_zip,
        destination_city, destination_state, destination_zip,
        estimated_cuft, company_rate, company_rate_type,
        company:companies!loads_company_id_fkey(id, name)
      )
    `
    )
    .eq('carrier_owner_id', carrierOwnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier requests:', error);
    return [];
  }

  return (data || []) as unknown as Array<{
    id: string;
    status: string;
    offered_rate: number | null;
    accepted_company_rate: boolean;
    created_at: string;
    load: {
      id: string;
      load_number: string;
      origin_city: string;
      origin_state: string;
      origin_zip: string;
      destination_city: string;
      destination_state: string;
      destination_zip: string;
      estimated_cuft: number | null;
      company_rate: number | null;
      company_rate_type: string;
      company: { id: string; name: string } | null;
    };
  }>;
}

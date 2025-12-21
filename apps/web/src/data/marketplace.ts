import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import {
  notifyLoadRequested,
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifyLoadConfirmed,
  notifyDriverAssigned,
} from './notifications';
import { createComplianceRequestsForPartnership } from './compliance';
import { logAuditEvent } from '@/lib/audit';

export interface MarketplaceStorageLocation {
  id: string;
  name: string;
  location_type: string;
  city: string;
  state: string;
  zip: string;
  address_line1: string | null;
  unit_numbers: string | null;
  gate_code: string | null;
  access_hours: string | null;
  access_instructions: string | null;
  truck_accessibility: string | null;
  accessibility_notes: string | null;
  facility_brand: string | null;
  operating_hours: string | null;
  has_loading_dock: boolean;
  dock_height: string | null;
  appointment_required: boolean;
  appointment_instructions: string | null;
}

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
    dot_number: string | null;
    mc_number: string | null;
  } | null;

  // Storage location for RFD loads
  storage_location: MarketplaceStorageLocation | null;

  // Type identification
  posting_type: 'pickup' | 'load';
  load_subtype: 'live' | 'rfd' | null; // Only for posting_type = 'load'
  load_type: string | null; // live_load or rfd
  current_storage_location: string | null;
  storage_unit: string | null;

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
  is_open_to_counter: boolean;

  // Availability
  is_ready_now: boolean;
  available_date: string | null;
  delivery_urgency: string;
  rfd_date: string | null; // For RFD loads: when ready for pickup

  // For Pickups
  balance_due: number | null;
  pickup_date_start: string | null;
  pickup_date_end: string | null;

  // Equipment
  equipment_type: string | null;
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;

  // Notes (visible to carriers)
  special_instructions: string | null;

  // Rate details
  rate_per_cuft: number | null;
  linehaul_amount: number | null;

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

  // Counter offer fields
  request_type: 'accept_listed' | 'counter_offer';
  counter_offer_rate: number | null;

  // Proposed dates
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
}

// Get marketplace loads (all visible loads)
export async function getMarketplaceLoads(filters?: {
  origin_state?: string;
  destination_state?: string;
  equipment_type?: string;
  min_cuft?: number;
  max_cuft?: number;
  posting_type?: 'pickup' | 'load'; // Filter by type
  excludeCompanyId?: string; // Exclude loads posted by this company (user's own company)
}): Promise<MarketplaceLoad[]> {
  const supabase = await createClient();

  // Query loads without company join first, then fetch company data separately
  // This avoids RLS issues with the company join
  // NOTE: Use actual DB column names (pickup_*, delivery_*, cubic_feet_estimate)
  // not the interface names (origin_*, destination_*, estimated_cuft)
  let query = supabase
    .from('loads')
    .select(`
      id,
      load_number,
      company_id,
      posted_by_company_id,
      posting_type,
      load_subtype,
      pickup_city,
      pickup_state,
      pickup_zip,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      cubic_feet_estimate,
      weight_lbs_estimate,
      pieces_count,
      pricing_mode,
      company_rate,
      company_rate_type,
      rate_is_fixed,
      is_open_to_counter,
      is_ready_now,
      available_date,
      delivery_urgency,
      rfd_date,
      balance_due,
      pickup_date_start,
      pickup_date_end,
      equipment_type,
      truck_requirement,
      notes,
      rate_per_cuft,
      linehaul_amount,
      posted_to_marketplace_at,
      created_at
    `)
    .eq('is_marketplace_visible', true)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null)
    .order('posted_to_marketplace_at', { ascending: false });

  // Exclude user's own company loads - they should only see these in "My Posted Jobs"
  if (filters?.excludeCompanyId) {
    query = query.neq('posted_by_company_id', filters.excludeCompanyId);
  }

  // Apply filters - use actual DB column names
  if (filters?.posting_type) {
    query = query.eq('posting_type', filters.posting_type);
  }
  if (filters?.origin_state) {
    query = query.eq('pickup_state', filters.origin_state);
  }
  if (filters?.destination_state) {
    query = query.eq('delivery_state', filters.destination_state);
  }
  if (filters?.equipment_type) {
    query = query.eq('equipment_type', filters.equipment_type);
  }
  if (filters?.min_cuft) {
    query = query.gte('cubic_feet_estimate', filters.min_cuft);
  }
  if (filters?.max_cuft) {
    query = query.lte('cubic_feet_estimate', filters.max_cuft);
  }

  const { data, error } = await query;

  // Log the query result for debugging
  console.log('[Marketplace] Query result:', {
    dataLength: data?.length ?? 'null',
    error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null
  });
  
  // TEMPORARY: Enhanced logging
  if (error) {
    console.log('[Marketplace] FULL ERROR OBJECT:', JSON.stringify(error, null, 2));
  }
  if (data) {
    console.log('[Marketplace] Data returned:', data.length, 'rows');
    console.log('[Marketplace] First row IDs:', data.slice(0, 5).map((r: any) => r.id));
  }

  if (error) {
    console.error('[Marketplace] Error fetching loads:', error);
    // SUSPECTED RLS ISSUE: The count query returns results but the select query doesn't.
    // This could be because:
    // 1. RLS policy on loads table blocks SELECT for specific columns
    // 2. The count query with head:true bypasses some RLS checks
    // 3. One of the selected columns doesn't exist or has different RLS rules
    //
    // PROPOSED FIX (requires human approval):
    // Check if the loads RLS policy allows reading all columns, or if it's row-level vs column-level
    return [];
  }

  // Debug logging - check what loads exist with marketplace flags
  if (!data || data.length === 0) {
    console.log('[Marketplace] No loads found. Checking database state...');

    // Check loads with is_marketplace_visible = true
    const { data: visibleLoads, error: visibleError } = await supabase
      .from('loads')
      .select('id, is_marketplace_visible, assigned_carrier_id, posting_status, posted_to_marketplace_at')
      .eq('is_marketplace_visible', true)
      .limit(10);
    console.log('[Marketplace] Loads with is_marketplace_visible=true:', visibleLoads, visibleError);

    // Check loads with posting_status = 'posted'
    const { data: postedLoads, error: postedError } = await supabase
      .from('loads')
      .select('id, is_marketplace_visible, assigned_carrier_id, posting_status, posted_to_marketplace_at')
      .eq('posting_status', 'posted')
      .limit(10);
    console.log('[Marketplace] Loads with posting_status=posted:', postedLoads, postedError);

    // Check recent loads
    const { data: recentLoads, error: recentError } = await supabase
      .from('loads')
      .select('id, is_marketplace_visible, assigned_carrier_id, posting_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('[Marketplace] Recent loads:', recentLoads, recentError);

    return [];
  }

  // Fetch company data separately to avoid RLS join issues
  // Get unique company IDs from loads
  const companyIds = [...new Set(data.map(l => l.company_id || l.posted_by_company_id).filter(Boolean))] as string[];

  // Fetch companies using a service role or public data approach
  // For now, create placeholder company data - the UI can handle missing company info
  const companyMap = new Map<string, { id: string; name: string; city: string | null; state: string | null; platform_loads_completed: number; platform_rating: number | null; dot_number: string | null; mc_number: string | null; fmcsa_verified: boolean | null }>();

  if (companyIds.length > 0) {
    // Try to fetch companies - this may be limited by RLS
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, city, state, platform_loads_completed, platform_rating, dot_number, mc_number, fmcsa_verified')
      .in('id', companyIds);

    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, c);
      }
    }
  }

  // Map loads with company data and transform column names to match interface
  const loadsWithCompanies = data.map(load => ({
    id: load.id,
    load_number: load.load_number,
    company_id: load.company_id,
    posted_by_company_id: load.posted_by_company_id,
    posting_type: load.posting_type,
    load_subtype: load.load_subtype,
    // Map DB column names to interface names
    origin_city: load.pickup_city || '',
    origin_state: load.pickup_state || '',
    origin_zip: load.pickup_zip || '',
    destination_city: load.delivery_city || '',
    destination_state: load.delivery_state || '',
    destination_zip: load.delivery_postal_code || '',
    estimated_cuft: load.cubic_feet_estimate,
    estimated_weight_lbs: load.weight_lbs_estimate,
    pieces_count: load.pieces_count,
    pricing_mode: load.pricing_mode,
    company_rate: load.company_rate,
    company_rate_type: load.company_rate_type,
    rate_is_fixed: load.rate_is_fixed,
    is_open_to_counter: load.is_open_to_counter,
    is_ready_now: load.is_ready_now,
    available_date: load.available_date,
    delivery_urgency: load.delivery_urgency,
    rfd_date: load.rfd_date,
    balance_due: load.balance_due,
    pickup_date_start: load.pickup_date_start,
    pickup_date_end: load.pickup_date_end,
    equipment_type: load.equipment_type,
    truck_requirement: load.truck_requirement,
    special_instructions: load.notes,
    rate_per_cuft: load.rate_per_cuft,
    linehaul_amount: load.linehaul_amount,
    posted_to_marketplace_at: load.posted_to_marketplace_at,
    created_at: load.created_at,
    company: companyMap.get(load.company_id || load.posted_by_company_id || '') || {
      id: load.company_id || load.posted_by_company_id || '',
      name: 'Company',
      city: null,
      state: null,
      platform_loads_completed: 0,
      platform_rating: null,
      dot_number: null,
      mc_number: null,
      fmcsa_verified: null,
    }
  }));

  return loadsWithCompanies as unknown as MarketplaceLoad[];
}

// Get counts for load board tabs
export async function getMarketplaceLoadCounts(excludeCompanyId?: string): Promise<{
  all: number;
  pickups: number;
  loads: number;
}> {
  const supabase = await createClient();

  // Get total count - use posting_status='posted' (the actual DB column)
  let allQuery = supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('is_marketplace_visible', true)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null);
  if (excludeCompanyId) {
    allQuery = allQuery.neq('posted_by_company_id', excludeCompanyId);
  }
  const { count: allCount } = await allQuery;

  // Get pickup count
  let pickupQuery = supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('is_marketplace_visible', true)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null)
    .eq('posting_type', 'pickup');
  if (excludeCompanyId) {
    pickupQuery = pickupQuery.neq('posted_by_company_id', excludeCompanyId);
  }
  const { count: pickupCount } = await pickupQuery;

  // Get load count
  let loadQuery = supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('is_marketplace_visible', true)
    .eq('posting_status', 'posted')
    .is('assigned_carrier_id', null)
    .eq('posting_type', 'load');
  if (excludeCompanyId) {
    loadQuery = loadQuery.neq('posted_by_company_id', excludeCompanyId);
  }
  const { count: loadCount } = await loadQuery;

  return {
    all: allCount || 0,
    pickups: pickupCount || 0,
    loads: loadCount || 0,
  };
}

// Get marketplace load with carrier's request status
export async function getMarketplaceLoadWithRequestStatus(
  loadId: string,
  carrierOwnerId: string
): Promise<MarketplaceLoad | null> {
  const supabase = await createClient();

  // Query load data without storage_location join to avoid failures for non-RFD loads
  // We'll fetch storage location separately if needed
  const { data: load, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      company_id,
      posted_by_company_id,
      storage_location_id,
      company:companies!loads_company_id_fkey(
        id, name, city, state,
        platform_loads_completed, platform_rating,
        dot_number, mc_number, fmcsa_verified
      ),
      posting_type,
      load_subtype,
      load_type,
      current_storage_location,
      storage_unit,
      pickup_city,
      pickup_state,
      pickup_zip,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      cubic_feet_estimate,
      weight_lbs_estimate,
      pieces_count,
      pricing_mode,
      company_rate,
      company_rate_type,
      rate_is_fixed,
      is_open_to_counter,
      is_ready_now,
      available_date,
      delivery_urgency,
      rfd_date,
      balance_due,
      pickup_date_start,
      pickup_date_end,
      equipment_type,
      truck_requirement,
      notes,
      rate_per_cuft,
      linehaul_amount,
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

  // Fetch storage location separately only for RFD loads that have a storage_location_id
  let storageLocation = null;
  if (load.storage_location_id) {
    const { data: storageData } = await supabase
      .from('storage_locations')
      .select(`
        id, name, location_type, city, state, zip,
        address_line1, unit_numbers, gate_code, access_hours,
        access_instructions, truck_accessibility, accessibility_notes,
        facility_brand, operating_hours, has_loading_dock, dock_height,
        appointment_required, appointment_instructions
      `)
      .eq('id', load.storage_location_id)
      .single();
    storageLocation = storageData;
  }

  // Check if carrier has a request on this load
  const { data: request } = await supabase
    .from('load_requests')
    .select('id, status')
    .eq('load_id', loadId)
    .eq('carrier_owner_id', carrierOwnerId)
    .single();

  // Transform DB column names to interface names
  // Note: company comes back as an array from Supabase joins
  const company = Array.isArray(load.company) ? load.company[0] : load.company;

  return {
    id: load.id,
    load_number: load.load_number,
    company_id: load.company_id,
    posted_by_company_id: load.posted_by_company_id,
    company: company || null,
    storage_location: storageLocation || null,
    posting_type: load.posting_type,
    load_subtype: load.load_subtype,
    load_type: load.load_type,
    current_storage_location: load.current_storage_location,
    storage_unit: load.storage_unit,
    // Map DB column names to interface names
    origin_city: load.pickup_city || '',
    origin_state: load.pickup_state || '',
    origin_zip: load.pickup_zip || '',
    destination_city: load.delivery_city || '',
    destination_state: load.delivery_state || '',
    destination_zip: load.delivery_postal_code || '',
    estimated_cuft: load.cubic_feet_estimate,
    estimated_weight_lbs: load.weight_lbs_estimate,
    pieces_count: load.pieces_count,
    pricing_mode: load.pricing_mode,
    company_rate: load.company_rate,
    company_rate_type: load.company_rate_type,
    rate_is_fixed: load.rate_is_fixed,
    is_open_to_counter: load.is_open_to_counter,
    is_ready_now: load.is_ready_now,
    available_date: load.available_date,
    delivery_urgency: load.delivery_urgency,
    rfd_date: load.rfd_date,
    balance_due: load.balance_due,
    pickup_date_start: load.pickup_date_start,
    pickup_date_end: load.pickup_date_end,
    equipment_type: load.equipment_type,
    truck_requirement: load.truck_requirement,
    special_instructions: load.notes,
    rate_per_cuft: load.rate_per_cuft,
    linehaul_amount: load.linehaul_amount,
    posted_to_marketplace_at: load.posted_to_marketplace_at,
    created_at: load.created_at,
    my_request_status: request?.status || null,
    my_request_id: request?.id || null,
  } as MarketplaceLoad;
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
        platform_loads_completed, platform_rating,
        loads_given_back, loads_accepted_total
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
    // New fields for counter offers and dates
    request_type?: 'accept_listed' | 'counter_offer';
    counter_offer_rate?: number;
    proposed_load_date_start?: string;
    proposed_load_date_end?: string;
    proposed_delivery_date_start?: string;
    proposed_delivery_date_end?: string;
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

  // Get load to find company_id and check RFD date
  // Use correct DB column names: pickup_*, delivery_*
  const { data: load } = await supabase
    .from('loads')
    .select('company_id, owner_id, load_number, pickup_city, pickup_state, delivery_city, delivery_state, rfd_date, is_open_to_counter')
    .eq('id', data.load_id)
    .single();

  if (!load) {
    return { success: false, error: 'Load not found' };
  }

  // Validate counter offer is allowed
  if (data.request_type === 'counter_offer' && !load.is_open_to_counter) {
    return { success: false, error: 'This load does not accept counter offers' };
  }

  // Validate proposed load date is not before RFD date
  if (load.rfd_date && data.proposed_load_date_start) {
    const rfdDate = new Date(load.rfd_date);
    const proposedDate = new Date(data.proposed_load_date_start);
    if (proposedDate < rfdDate) {
      return { success: false, error: `Load date cannot be before the RFD date (${load.rfd_date})` };
    }
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
      // New fields
      request_type: data.request_type || 'accept_listed',
      counter_offer_rate: data.counter_offer_rate || null,
      proposed_load_date_start: data.proposed_load_date_start || null,
      proposed_load_date_end: data.proposed_load_date_end || null,
      proposed_delivery_date_start: data.proposed_delivery_date_start || null,
      proposed_delivery_date_end: data.proposed_delivery_date_end || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating load request:', error);
    return { success: false, error: error.message };
  }

  // Get carrier name for notification
  const { data: carrier } = await supabase
    .from('companies')
    .select('name')
    .eq('id', carrierId)
    .single();

  // Notify company
  const route = `${load.pickup_city || ''}, ${load.pickup_state || ''} → ${load.delivery_city || ''}, ${load.delivery_state || ''}`;
  await notifyLoadRequested(
    load.owner_id,
    load.company_id,
    data.load_id,
    result.id,
    carrier?.name || 'A carrier',
    load.load_number,
    route
  );

  // AUDIT LOGGING: Log carrier request submitted
  logAuditEvent(supabase, {
    entityType: 'load',
    entityId: data.load_id,
    action: 'carrier_request_submitted',
    performedByUserId: carrierOwnerId,
    newValue: {
      request_id: result.id,
      carrier_id: carrierId,
      request_type: data.request_type || 'accept_listed',
      offered_rate: data.offered_rate,
    },
    metadata: {
      request_id: result.id,
      carrier_name: carrier?.name || null,
      load_number: load.load_number,
      is_counter_offer: data.request_type === 'counter_offer',
    },
  });

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
    .select(`
      *,
      load:loads(
        *,
        company:companies!loads_company_id_fkey(id, name)
      )
    `)
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

  const companyObj = loadData.company as { id: string; name: string } | null;

  // Update the load with carrier assignment and marketplace integration fields
  const { error: loadError } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: request.carrier_id,
      carrier_assigned_at: new Date().toISOString(),
      carrier_rate: finalRate,
      carrier_rate_type: finalRateType,
      load_status: 'pending', // Carrier needs to confirm
      is_marketplace_visible: false, // Remove from marketplace
      // Marketplace integration fields
      marketplace_request_id: requestId,
      is_from_marketplace: true,
      source_company_id: loadData.company_id as string,
      source_company_name: companyObj?.name || 'Company',
      operational_status: 'unassigned',
      last_status_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Load flow type: carrier purchased from marketplace → skips Pickup wizard step
      load_flow_type: 'marketplace_purchase',
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

  // If new partnership, create it and request compliance docs
  if (!request.is_partner) {
    console.log('[Partnership Creation] Starting - broker accepts carrier request');
    console.log('[Partnership Creation] Broker owner_id:', loadData.owner_id);
    console.log('[Partnership Creation] Broker company_id:', loadData.company_id);
    console.log('[Partnership Creation] Carrier company_id:', request.carrier_id);
    console.log('[Partnership Creation] Carrier owner_id:', request.carrier_owner_id);

    // Validate required IDs before attempting partnership creation
    if (!loadData.owner_id || !loadData.company_id || !request.carrier_id || !request.carrier_owner_id) {
      console.error('[Partnership Creation] MISSING REQUIRED IDS:', {
        brokerOwnerId: loadData.owner_id,
        brokerCompanyId: loadData.company_id,
        carrierCompanyId: request.carrier_id,
        carrierOwnerId: request.carrier_owner_id,
      });
      // Continue without partnership - load assignment still succeeded
    } else {
      let adminClient;
      try {
        // Use service role client to bypass RLS for partnership creation
        // (needed because we're creating partnerships for both parties)
        adminClient = createServiceRoleClient();
        console.log('[Partnership Creation] Service role client created successfully');
      } catch (serviceRoleError) {
        console.error('[Partnership Creation] FATAL: Failed to create service role client:', serviceRoleError);
        console.error('[Partnership Creation] Ensure SUPABASE_SERVICE_ROLE_KEY is set in environment variables');
        // Continue without partnership - load assignment still succeeded
        adminClient = null;
      }

      if (adminClient) {
        let brokerPartnershipCreated = false;
        let carrierPartnershipCreated = false;
        let newPartnership: { id: string } | null = null;

        // Check if broker partnership already exists
        const { data: existingBrokerPartnership, error: brokerCheckError } = await adminClient
          .from('company_partnerships')
          .select('id')
          .eq('owner_id', loadData.owner_id as string)
          .eq('company_a_id', loadData.company_id as string)
          .eq('company_b_id', request.carrier_id)
          .maybeSingle();

        if (brokerCheckError) {
          console.error('[Partnership Creation] Error checking broker partnership:', brokerCheckError);
        }

        if (existingBrokerPartnership) {
          console.log('[Partnership Creation] Broker partnership already exists:', existingBrokerPartnership.id);
          newPartnership = existingBrokerPartnership;
          brokerPartnershipCreated = true;

          // Check if this is a reverse transaction - broker previously only received loads
          // If so, upgrade to 'mutual' relationship
          const { data: currentBrokerPartnership } = await adminClient
            .from('company_partnerships')
            .select('relationship_type')
            .eq('id', existingBrokerPartnership.id)
            .single();

          if (currentBrokerPartnership?.relationship_type === 'receives_loads') {
            console.log('[Partnership Creation] Upgrading broker partnership to mutual (was receives_loads, now also gives_loads)');
            await adminClient
              .from('company_partnerships')
              .update({ relationship_type: 'mutual', updated_at: new Date().toISOString() })
              .eq('id', existingBrokerPartnership.id);
          }
        } else {
          // Create partnership for the broker (load owner)
          const { data: createdPartnership, error: partnershipError } = await adminClient
            .from('company_partnerships')
            .insert({
              owner_id: loadData.owner_id as string,
              company_a_id: loadData.company_id as string,
              company_b_id: request.carrier_id,
              relationship_type: 'gives_loads',
              status: 'active',
              payment_terms: 'net_30',
            })
            .select('id')
            .single();

          if (partnershipError) {
            console.error('[Partnership Creation] ERROR creating broker partnership:', partnershipError);
            console.error('[Partnership Creation] Broker partnership insert payload:', {
              owner_id: loadData.owner_id,
              company_a_id: loadData.company_id,
              company_b_id: request.carrier_id,
            });
          } else if (createdPartnership) {
            console.log('[Partnership Creation] SUCCESS - Broker partnership created:', createdPartnership.id);
            newPartnership = createdPartnership;
            brokerPartnershipCreated = true;
          }
        }

        // Check if carrier partnership already exists
        const { data: existingCarrierPartnership, error: carrierCheckError } = await adminClient
          .from('company_partnerships')
          .select('id')
          .eq('owner_id', request.carrier_owner_id)
          .eq('company_a_id', request.carrier_id)
          .eq('company_b_id', loadData.company_id as string)
          .maybeSingle();

        if (carrierCheckError) {
          console.error('[Partnership Creation] Error checking carrier partnership:', carrierCheckError);
        }

        if (existingCarrierPartnership) {
          console.log('[Partnership Creation] Carrier partnership already exists:', existingCarrierPartnership.id);
          carrierPartnershipCreated = true;

          // Check if this is a reverse transaction - carrier previously only gave loads
          // If so, upgrade to 'mutual' relationship
          const { data: currentCarrierPartnership } = await adminClient
            .from('company_partnerships')
            .select('relationship_type')
            .eq('id', existingCarrierPartnership.id)
            .single();

          if (currentCarrierPartnership?.relationship_type === 'gives_loads') {
            console.log('[Partnership Creation] Upgrading carrier partnership to mutual (was gives_loads, now also receives_loads)');
            await adminClient
              .from('company_partnerships')
              .update({ relationship_type: 'mutual', updated_at: new Date().toISOString() })
              .eq('id', existingCarrierPartnership.id);
          }
        } else {
          // Create partnership for the carrier (so they see this in their partnerships)
          const { data: carrierPartnership, error: carrierPartnershipError } = await adminClient
            .from('company_partnerships')
            .insert({
              owner_id: request.carrier_owner_id,
              company_a_id: request.carrier_id,
              company_b_id: loadData.company_id as string,
              relationship_type: 'receives_loads',
              status: 'active',
              payment_terms: 'net_30',
            })
            .select('id')
            .single();

          if (carrierPartnershipError) {
            console.error('[Partnership Creation] ERROR creating carrier partnership:', carrierPartnershipError);
            console.error('[Partnership Creation] Carrier partnership insert payload:', {
              owner_id: request.carrier_owner_id,
              company_a_id: request.carrier_id,
              company_b_id: loadData.company_id,
            });
          } else if (carrierPartnership) {
            console.log('[Partnership Creation] SUCCESS - Carrier partnership created:', carrierPartnership.id);
            carrierPartnershipCreated = true;
          }
        }

        // Log final status
        console.log('[Partnership Creation] SUMMARY:', {
          brokerPartnershipCreated,
          carrierPartnershipCreated,
          newPartnershipId: newPartnership?.id || null,
        });

        // Create compliance document requests for new partnership
        if (newPartnership) {
          try {
            await createComplianceRequestsForPartnership(
              newPartnership.id,
              loadData.company_id as string,
              responderId,
              request.carrier_id
            );
            console.log('[Partnership Creation] Compliance requests created for partnership:', newPartnership.id);
          } catch (complianceError) {
            console.error('[Partnership Creation] Error creating compliance requests:', complianceError);
          }
        }
      }
    }
  } else {
    console.log('[Partnership Creation] Skipped - carrier was already a partner (is_partner=true)');
  }

  // Increment stats
  await supabase.rpc('increment_loads_accepted', { p_company_id: request.carrier_id });
  await supabase.rpc('increment_loads_assigned', { p_company_id: loadData.company_id as string });

  // Notify carrier
  const route = `${loadData.origin_city}, ${loadData.origin_state} → ${loadData.destination_city}, ${loadData.destination_state}`;
  await notifyRequestAccepted(
    request.carrier_owner_id,
    request.carrier_id,
    request.load_id,
    requestId,
    companyObj?.name || 'Company',
    loadData.load_number as string,
    route
  );

  // AUDIT LOGGING: Log carrier request accepted and carrier assigned
  logAuditEvent(supabase, {
    entityType: 'load',
    entityId: request.load_id,
    action: 'carrier_request_accepted',
    performedByUserId: responderId,
    newValue: {
      carrier_id: request.carrier_id,
      final_rate: finalRate,
      final_rate_type: finalRateType,
    },
    metadata: {
      request_id: requestId,
      load_number: loadData.load_number as string,
      carrier_id: request.carrier_id,
      created_partnership: !request.is_partner,
    },
  });

  // Also log carrier assignment
  logAuditEvent(supabase, {
    entityType: 'load',
    entityId: request.load_id,
    action: 'carrier_assigned',
    performedByUserId: responderId,
    newValue: {
      assigned_carrier_id: request.carrier_id,
      carrier_rate: finalRate,
    },
    metadata: {
      load_number: loadData.load_number as string,
      carrier_id: request.carrier_id,
    },
  });

  return { success: true };
}

// Decline a load request
export async function declineLoadRequest(
  requestId: string,
  responderId: string,
  responseMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get request details for notification
  const { data: request } = await supabase
    .from('load_requests')
    .select(`
      *,
      load:loads(
        id, load_number,
        company:companies!loads_company_id_fkey(id, name)
      )
    `)
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

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

  // Notify carrier
  const loadObj = request.load as { id: string; load_number: string; company: { id: string; name: string } | null };
  await notifyRequestDeclined(
    request.carrier_owner_id,
    request.carrier_id,
    request.load_id,
    requestId,
    loadObj?.company?.name || 'Company',
    loadObj?.load_number || 'Load'
  );

  // AUDIT LOGGING: Log carrier request rejected
  logAuditEvent(supabase, {
    entityType: 'load',
    entityId: request.load_id,
    action: 'carrier_request_rejected',
    performedByUserId: responderId,
    previousValue: { carrier_id: request.carrier_id, status: 'pending' },
    newValue: { status: 'declined' },
    metadata: {
      request_id: requestId,
      load_number: loadObj?.load_number || null,
      carrier_id: request.carrier_id,
      response_message: responseMessage || null,
    },
  });

  return { success: true };
}

// Withdraw a load request (carrier withdrawing)
export async function withdrawLoadRequest(
  requestId: string,
  carrierOwnerId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch request details before updating for audit logging
  const { data: requestData } = await supabase
    .from('load_requests')
    .select('load_id, carrier_id, carrier_owner_id')
    .eq('id', requestId)
    .single();

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

  // AUDIT LOGGING: Log carrier request withdrawn
  if (requestData) {
    logAuditEvent(supabase, {
      entityType: 'load',
      entityId: requestData.load_id,
      action: 'carrier_request_withdrawn',
      performedByUserId: carrierOwnerId || requestData.carrier_owner_id,
      previousValue: { status: 'pending' },
      newValue: { status: 'withdrawn' },
      metadata: {
        request_id: requestId,
        carrier_id: requestData.carrier_id,
      },
    });
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

  // Safety check: Ensure partnership exists (fallback if acceptLoadRequest failed to create it)
  try {
    const { data: request } = await supabase
      .from('load_requests')
      .select('id, carrier_id, carrier_owner_id, creates_partnership')
      .eq('load_id', loadId)
      .eq('status', 'accepted')
      .single();

    if (request?.creates_partnership) {
      const { data: loadData } = await supabase
        .from('loads')
        .select('owner_id, company_id')
        .eq('id', loadId)
        .single();

      if (loadData && request.carrier_id && request.carrier_owner_id) {
        // Check if broker partnership exists
        const { data: existingBrokerPartnership } = await supabase
          .from('company_partnerships')
          .select('id')
          .eq('owner_id', loadData.owner_id)
          .eq('company_a_id', loadData.company_id)
          .eq('company_b_id', request.carrier_id)
          .single();

        if (!existingBrokerPartnership) {
          console.log('[confirmLoadAssignment] Creating missing broker partnership');
          const serviceClient = createServiceRoleClient();
          await serviceClient.from('company_partnerships').insert({
            owner_id: loadData.owner_id,
            company_a_id: loadData.company_id,
            company_b_id: request.carrier_id,
            initiated_by_id: loadData.company_id,
            relationship_type: 'gives_loads',
            status: 'active',
            approved_at: new Date().toISOString(),
          });
        }

        // Check if carrier partnership exists
        const { data: existingCarrierPartnership } = await supabase
          .from('company_partnerships')
          .select('id')
          .eq('owner_id', request.carrier_owner_id)
          .eq('company_a_id', request.carrier_id)
          .eq('company_b_id', loadData.company_id)
          .single();

        if (!existingCarrierPartnership) {
          console.log('[confirmLoadAssignment] Creating missing carrier partnership');
          const serviceClient = createServiceRoleClient();
          await serviceClient.from('company_partnerships').insert({
            owner_id: request.carrier_owner_id,
            company_a_id: request.carrier_id,
            company_b_id: loadData.company_id,
            initiated_by_id: loadData.company_id,
            relationship_type: 'receives_loads',
            status: 'active',
            approved_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (partnershipError) {
    // Don't fail the confirmation if partnership check fails - just log it
    console.error('[confirmLoadAssignment] Partnership check failed:', partnershipError);
  }

  // Get load details for notification
  const { data: loadDetails } = await supabase
    .from('loads')
    .select(`
      owner_id,
      company_id,
      load_number,
      carrier:companies!loads_assigned_carrier_id_fkey(name)
    `)
    .eq('id', loadId)
    .single();

  if (loadDetails) {
    const carrierObj = Array.isArray(loadDetails.carrier) ? loadDetails.carrier[0] : loadDetails.carrier;
    await notifyLoadConfirmed(
      loadDetails.owner_id,
      loadDetails.company_id,
      loadId,
      carrierObj?.name || 'Carrier',
      loadDetails.load_number,
      new Date(data.expected_load_date).toLocaleDateString(),
      data.assigned_driver_name
    );

    // AUDIT LOGGING: Log load assignment confirmed
    // Note: We use owner_id as the performer since this is called by the carrier owner
    logAuditEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'load_status_changed',
      performedByUserId: loadDetails.owner_id,
      newValue: {
        load_status: 'accepted',
        expected_load_date: data.expected_load_date,
        assigned_driver_name: data.assigned_driver_name || null,
      },
      metadata: {
        load_number: loadDetails.load_number,
        carrier_name: carrierObj?.name || null,
        expected_load_date: data.expected_load_date,
        driver_assigned: !!data.assigned_driver_name,
      },
    });
  }

  return { success: true };
}

// Update driver on a load (carrier can assign driver later)
// DRIVER ASSIGNMENT RULE UPDATE: Drivers can only be assigned to loads that are on a trip.
// Direct load-level driver assignment is deprecated - drivers are inherited from trips.
export async function updateLoadDriver(
  loadId: string,
  data: {
    assigned_driver_id?: string;
    assigned_driver_name: string;
    assigned_driver_phone: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // DRIVER ASSIGNMENT RULE UPDATE: Check if load has a trip_id
  const { data: loadCheck } = await supabase
    .from('loads')
    .select('trip_id')
    .eq('id', loadId)
    .single();

  if (!loadCheck?.trip_id) {
    // Log warning for deprecated pathway
    console.warn(
      `[DRIVER ASSIGNMENT RULE] Attempted to assign driver to load ${loadId} without trip_id. ` +
      'Drivers should only be assigned via trips. Please assign load to a trip first.'
    );
    return {
      success: false,
      error: 'Cannot assign driver directly to a load. Please assign this load to a trip first, then assign a driver to the trip.'
    };
  }

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

  // Get load details for notification
  const { data: loadDetails } = await supabase
    .from('loads')
    .select(`
      owner_id,
      company_id,
      load_number,
      carrier:companies!loads_assigned_carrier_id_fkey(name)
    `)
    .eq('id', loadId)
    .single();

  if (loadDetails && data.assigned_driver_name) {
    const carrierObj = Array.isArray(loadDetails.carrier) ? loadDetails.carrier[0] : loadDetails.carrier;
    await notifyDriverAssigned(
      loadDetails.owner_id,
      loadDetails.company_id,
      loadId,
      carrierObj?.name || 'Carrier',
      loadDetails.load_number,
      data.assigned_driver_name,
      data.assigned_driver_phone
    );
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

  // Get user's workspace company - use same lookup as createLoadRequest
  // (only requires is_workspace_company, not is_carrier)
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!carrier) {
    return [];
  }

  // Query loads WITHOUT company join to avoid RLS issues
  // The carrier can read the load but may not be able to read the broker's company
  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      id, load_number, company_id,
      pickup_city, pickup_state, pickup_postal_code,
      delivery_city, delivery_state, delivery_postal_code,
      cubic_feet, cubic_feet_estimate, carrier_rate, carrier_rate_type,
      load_status, expected_load_date, assigned_driver_name,
      carrier_confirmed_at, carrier_assigned_at,
      source_company_name
    `
    )
    .eq('assigned_carrier_id', carrier.id)
    .not('load_status', 'eq', 'cancelled')
    .order('carrier_assigned_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching assigned loads:', error);
    return [];
  }

  // Fetch company data separately to avoid RLS issues
  const companyIds = [...new Set((data || []).map(l => l.company_id).filter(Boolean))] as string[];
  const companyMap = new Map<string, { id: string; name: string }>();

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);

    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, c);
      }
    }
  }

  // Map DB field names to interface field names
  // Use cubic_feet if set, otherwise fall back to cubic_feet_estimate
  return (data || []).map((load: any) => {
    // Try to get company from map, fall back to source_company_name
    let company = companyMap.get(load.company_id) || null;
    if (!company && load.source_company_name) {
      company = { id: load.company_id, name: load.source_company_name };
    }

    return {
      id: load.id,
      load_number: load.load_number,
      origin_city: load.pickup_city || '',
      origin_state: load.pickup_state || '',
      origin_zip: load.pickup_postal_code || '',
      destination_city: load.delivery_city || '',
      destination_state: load.delivery_state || '',
      destination_zip: load.delivery_postal_code || '',
      estimated_cuft: load.cubic_feet ? Number(load.cubic_feet) : (load.cubic_feet_estimate ? Number(load.cubic_feet_estimate) : null),
      carrier_rate: load.carrier_rate ? Number(load.carrier_rate) : null,
      carrier_rate_type: load.carrier_rate_type || 'per_cuft',
      load_status: load.load_status || 'pending',
      expected_load_date: load.expected_load_date,
      assigned_driver_name: load.assigned_driver_name,
      carrier_confirmed_at: load.carrier_confirmed_at,
      company: company,
    };
  });
}

// Get confirmed loads that are not yet assigned to a trip
// These loads won't be visible to drivers on mobile until added to a trip
export async function getLoadsNeedingTripAssignment(carrierOwnerId: string): Promise<
  Array<{
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    expected_load_date: string | null;
    load_status: string;
    carrier_rate: number | null;
    carrier_confirmed_at: string | null;
    assigned_driver_name: string | null;
    company: { id: string; name: string } | null;
  }>
> {
  const supabase = await createClient();

  // Get user's workspace company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!carrier) {
    return [];
  }

  // Query confirmed loads without a trip assignment
  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      id, load_number, company_id,
      pickup_city, pickup_state,
      delivery_city, delivery_state,
      expected_load_date, load_status,
      carrier_rate, carrier_confirmed_at,
      assigned_driver_name, source_company_name,
      trip_id
    `
    )
    .eq('assigned_carrier_id', carrier.id)
    .not('carrier_confirmed_at', 'is', null) // Must be confirmed
    .is('trip_id', null) // Not assigned to a trip
    .not('load_status', 'in', '("delivered","cancelled")') // Active loads only
    .order('expected_load_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching loads needing trip assignment:', error);
    return [];
  }

  // Fetch company data separately to avoid RLS issues
  const companyIds = [...new Set((data || []).map(l => l.company_id).filter(Boolean))] as string[];
  const companyMap = new Map<string, { id: string; name: string }>();

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);

    if (companies) {
      for (const c of companies) {
        companyMap.set(c.id, c);
      }
    }
  }

  return (data || []).map((load: any) => {
    let company = companyMap.get(load.company_id) || null;
    if (!company && load.source_company_name) {
      company = { id: load.company_id, name: load.source_company_name };
    }

    return {
      id: load.id,
      load_number: load.load_number,
      origin_city: load.pickup_city || '',
      origin_state: load.pickup_state || '',
      destination_city: load.delivery_city || '',
      destination_state: load.delivery_state || '',
      expected_load_date: load.expected_load_date,
      load_status: load.load_status || 'pending',
      carrier_rate: load.carrier_rate ? Number(load.carrier_rate) : null,
      carrier_confirmed_at: load.carrier_confirmed_at,
      assigned_driver_name: load.assigned_driver_name,
      company: company,
    };
  });
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
  posting_status: string | null;
  expected_load_date: string | null;
  carrier_confirmed_at: string | null;
  carrier_assigned_at: string | null;
  loading_started_at: string | null;
  loaded_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  // Driver
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  assigned_driver_phone: string | null;
  // Equipment (inherited from trip)
  assigned_truck_id: string | null;
  assigned_truck_unit_number: string | null;
  assigned_trailer_id: string | null;
  assigned_trailer_unit_number: string | null;
  // Instructions
  special_instructions: string | null;
  // Company
  company: { id: string; name: string; phone: string | null } | null;
  // Trip assignment
  trip_id: string | null;
} | null> {
  const supabase = await createClient();

  // Get user's workspace company - use same lookup as createLoadRequest
  // (only requires is_workspace_company, not is_carrier)
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!carrier) {
    console.error('getAssignedLoadDetails: No carrier found for owner', carrierOwnerId);
    return null;
  }

  console.log('getAssignedLoadDetails: Looking for load', loadId, 'with carrier', carrier.id);

  // Query load data WITHOUT company join to avoid RLS issues
  // The carrier can read the load but may not be able to read the broker's company
  // DEBUG: Select ALL columns to avoid column name mismatches
  const { data, error } = await supabase
    .from('loads')
    .select('*')
    .eq('id', loadId)
    .eq('assigned_carrier_id', carrier.id)
    .single();

  console.log('getAssignedLoadDetails: Query result', {
    hasData: !!data,
    hasError: !!error,
    errorCode: error?.code,
    errorMessage: error?.message,
    dataId: data?.id,
  });

  if (error || !data) {
    console.error('getAssignedLoadDetails: Error or no data for load', loadId, 'carrier', carrier.id, 'error:', error);
    return null;
  }

  // Fetch company data separately to avoid RLS join issues
  // Use source_company_name as fallback if company fetch fails
  let companyData: { id: string; name: string; phone: string | null } | null = null;
  if (data.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, phone')
      .eq('id', data.company_id)
      .maybeSingle();

    if (company) {
      companyData = company;
    } else if (data.source_company_name) {
      // Use source_company_name as fallback (stored when load was assigned)
      companyData = { id: data.company_id, name: data.source_company_name, phone: null };
    }
  }

  // EQUIPMENT INHERITANCE: Fetch truck and trailer data separately
  let truckData: { id: string; unit_number: string } | null = null;
  let trailerData: { id: string; unit_number: string } | null = null;

  if (data.assigned_truck_id) {
    const { data: truck } = await supabase
      .from('trucks')
      .select('id, unit_number')
      .eq('id', data.assigned_truck_id)
      .maybeSingle();
    if (truck) truckData = truck;
  }

  if (data.assigned_trailer_id) {
    const { data: trailer } = await supabase
      .from('trailers')
      .select('id, unit_number')
      .eq('id', data.assigned_trailer_id)
      .maybeSingle();
    if (trailer) trailerData = trailer;
  }

  // Map DB field names to interface field names
  const load = data as any;
  return {
    id: load.id,
    load_number: load.load_number,
    origin_city: load.pickup_city || '',
    origin_state: load.pickup_state || '',
    origin_zip: load.pickup_postal_code || '',
    origin_address: load.pickup_address_line1,
    origin_address2: load.pickup_address_line2,
    origin_contact_name: load.pickup_contact_name,
    origin_contact_phone: load.pickup_contact_phone,
    origin_contact_email: load.pickup_contact_email,
    origin_gate_code: load.pickup_gate_code,
    origin_notes: load.pickup_notes,
    destination_city: load.delivery_city || '',
    destination_state: load.delivery_state || '',
    destination_zip: load.delivery_postal_code || '',
    destination_address: load.delivery_address_line1,
    destination_address2: load.delivery_address_line2,
    destination_contact_name: load.delivery_contact_name,
    destination_contact_phone: load.delivery_contact_phone,
    destination_contact_email: load.delivery_contact_email,
    destination_gate_code: load.delivery_gate_code,
    destination_notes: load.delivery_notes,
    estimated_cuft: load.cubic_feet ? Number(load.cubic_feet) : (load.cubic_feet_estimate ? Number(load.cubic_feet_estimate) : null),
    estimated_weight_lbs: load.weight_lbs_estimate ? Number(load.weight_lbs_estimate) : null,
    pieces_count: load.pieces_count ? Number(load.pieces_count) : null,
    carrier_rate: load.carrier_rate ? Number(load.carrier_rate) : null,
    carrier_rate_type: load.carrier_rate_type || 'per_cuft',
    load_status: load.load_status || 'pending',
    posting_status: load.posting_status,
    expected_load_date: load.expected_load_date,
    carrier_confirmed_at: load.carrier_confirmed_at,
    carrier_assigned_at: load.carrier_assigned_at,
    loading_started_at: load.loading_started_at,
    loaded_at: load.loaded_at,
    in_transit_at: load.in_transit_at,
    delivered_at: load.delivered_at,
    assigned_driver_id: load.assigned_driver_id,
    assigned_driver_name: load.assigned_driver_name,
    assigned_driver_phone: load.assigned_driver_phone,
    // EQUIPMENT INHERITANCE: Include truck/trailer info
    assigned_truck_id: load.assigned_truck_id || null,
    assigned_truck_unit_number: truckData?.unit_number || null,
    assigned_trailer_id: load.assigned_trailer_id || null,
    assigned_trailer_unit_number: trailerData?.unit_number || null,
    special_instructions: load.special_instructions,
    company: companyData,
    trip_id: load.trip_id || null,
  };
}

// Get carrier's requests
export async function getCarrierRequests(
  carrierOwnerId: string
): Promise<
  Array<{
    id: string;
    status: string;
    request_type: 'accept_listed' | 'counter_offer' | null;
    offered_rate: number | null;
    counter_offer_rate: number | null;
    accepted_company_rate: boolean;
    created_at: string;
    proposed_load_date_start: string | null;
    proposed_load_date_end: string | null;
    proposed_delivery_date_start: string | null;
    proposed_delivery_date_end: string | null;
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
      rate_per_cuft: number | null;
      company_rate: number | null;
      company_rate_type: string;
      company: { id: string; name: string; fmcsa_verified: boolean | null } | null;
    };
  }>
> {
  const supabase = await createClient();

  // Use correct DB column names: pickup_*, delivery_*, cubic_feet_estimate
  // Use explicit foreign key syntax to ensure joins work correctly
  const { data, error } = await supabase
    .from('load_requests')
    .select(
      `
      id,
      status,
      request_type,
      offered_rate,
      counter_offer_rate,
      accepted_company_rate,
      created_at,
      proposed_load_date_start,
      proposed_load_date_end,
      proposed_delivery_date_start,
      proposed_delivery_date_end,
      load:loads!load_requests_load_id_fkey(
        id, load_number,
        pickup_city, pickup_state, pickup_zip,
        delivery_city, delivery_state, delivery_postal_code,
        cubic_feet_estimate, rate_per_cuft, company_rate, company_rate_type,
        company:companies!loads_company_id_fkey(id, name, fmcsa_verified)
      )
    `
    )
    .eq('carrier_owner_id', carrierOwnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier requests:', error);
    return [];
  }

  // Map DB column names to interface names
  return (data || []).map((item: any) => {
    const load = Array.isArray(item.load) ? item.load[0] : item.load;
    const company = load?.company ? (Array.isArray(load.company) ? load.company[0] : load.company) : null;
    return {
      id: item.id,
      status: item.status,
      request_type: item.request_type,
      offered_rate: item.offered_rate,
      counter_offer_rate: item.counter_offer_rate,
      accepted_company_rate: item.accepted_company_rate,
      created_at: item.created_at,
      proposed_load_date_start: item.proposed_load_date_start,
      proposed_load_date_end: item.proposed_load_date_end,
      proposed_delivery_date_start: item.proposed_delivery_date_start,
      proposed_delivery_date_end: item.proposed_delivery_date_end,
      load: load ? {
        id: load.id,
        load_number: load.load_number,
        origin_city: load.pickup_city || '',
        origin_state: load.pickup_state || '',
        origin_zip: load.pickup_zip || '',
        destination_city: load.delivery_city || '',
        destination_state: load.delivery_state || '',
        destination_zip: load.delivery_postal_code || '',
        estimated_cuft: load.cubic_feet_estimate,
        rate_per_cuft: load.rate_per_cuft,
        company_rate: load.company_rate,
        company_rate_type: load.company_rate_type || 'flat',
        company: company,
      } : null,
    };
  }) as any;
}

// Marketplace load interface for carrier view
export interface CarrierMarketplaceLoad {
  id: string;
  load_number: string;
  // Type
  posting_type: 'pickup' | 'load';
  load_subtype: 'live' | 'rfd' | null;
  // Route
  origin_city: string;
  origin_state: string;
  origin_zip: string;
  destination_city: string;
  destination_state: string;
  destination_zip: string;
  // Size & Rate
  estimated_cuft: number | null;
  carrier_rate: number | null;
  carrier_rate_type: string;
  balance_due: number | null;
  // Dates from request
  proposed_load_date_start: string | null;
  proposed_load_date_end: string | null;
  proposed_delivery_date_start: string | null;
  proposed_delivery_date_end: string | null;
  // Status
  operational_status: string;
  load_status: string;
  // Assignment
  trip_id: string | null;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  carrier_assigned_at: string;
  carrier_confirmed_at: string | null;
  // Equipment
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;
  // Source company
  source_company_id: string;
  source_company_name: string;
  source_company: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
  } | null;
  // Trip info if assigned
  trip: {
    id: string;
    trip_number: string;
    driver: { id: string; first_name: string; last_name: string } | null;
  } | null;
}

// Get marketplace loads assigned to carrier (for carrier dashboard)
export async function getCarrierMarketplaceLoads(
  carrierOwnerId: string
): Promise<CarrierMarketplaceLoad[]> {
  const supabase = await createClient();

  // Get carrier's company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .single();

  if (!carrier) {
    return [];
  }

  const { data, error } = await supabase
    .from('loads')
    .select(`
      id, load_number,
      posting_type, load_subtype,
      origin_city, origin_state, origin_zip,
      destination_city, destination_state, destination_zip,
      estimated_cuft, carrier_rate, carrier_rate_type,
      balance_due,
      operational_status, load_status,
      trip_id,
      assigned_driver_id, assigned_driver_name,
      carrier_assigned_at, carrier_confirmed_at,
      truck_requirement,
      source_company_id, source_company_name,
      source_company:companies!loads_source_company_id_fkey(
        id, name, city, state, phone
      ),
      trip:trips(
        id, trip_number,
        driver:drivers(id, first_name, last_name)
      ),
      marketplace_request:load_requests!loads_marketplace_request_id_fkey(
        proposed_load_date_start,
        proposed_load_date_end,
        proposed_delivery_date_start,
        proposed_delivery_date_end
      )
    `)
    .eq('assigned_carrier_id', carrier.id)
    .eq('is_from_marketplace', true)
    .not('load_status', 'eq', 'cancelled')
    .order('carrier_assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier marketplace loads:', error);
    return [];
  }

  // Transform the data to flatten marketplace_request dates
  return (data || []).map((load) => {
    const marketplaceRequest = Array.isArray(load.marketplace_request)
      ? load.marketplace_request[0]
      : load.marketplace_request;
    const trip = Array.isArray(load.trip) ? load.trip[0] : load.trip;
    const sourceCompany = Array.isArray(load.source_company)
      ? load.source_company[0]
      : load.source_company;

    return {
      id: load.id,
      load_number: load.load_number,
      posting_type: load.posting_type || 'load',
      load_subtype: load.load_subtype,
      origin_city: load.origin_city,
      origin_state: load.origin_state,
      origin_zip: load.origin_zip,
      destination_city: load.destination_city,
      destination_state: load.destination_state,
      destination_zip: load.destination_zip,
      estimated_cuft: load.estimated_cuft,
      carrier_rate: load.carrier_rate,
      carrier_rate_type: load.carrier_rate_type,
      balance_due: load.balance_due,
      proposed_load_date_start: marketplaceRequest?.proposed_load_date_start || null,
      proposed_load_date_end: marketplaceRequest?.proposed_load_date_end || null,
      proposed_delivery_date_start: marketplaceRequest?.proposed_delivery_date_start || null,
      proposed_delivery_date_end: marketplaceRequest?.proposed_delivery_date_end || null,
      operational_status: load.operational_status || 'unassigned',
      load_status: load.load_status,
      trip_id: load.trip_id,
      assigned_driver_id: load.assigned_driver_id,
      assigned_driver_name: load.assigned_driver_name,
      carrier_assigned_at: load.carrier_assigned_at,
      carrier_confirmed_at: load.carrier_confirmed_at,
      truck_requirement: load.truck_requirement,
      source_company_id: load.source_company_id,
      source_company_name: load.source_company_name,
      source_company: sourceCompany,
      trip: trip ? {
        id: trip.id,
        trip_number: trip.trip_number,
        driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
      } : null,
    };
  }) as CarrierMarketplaceLoad[];
}

// Get counts for carrier marketplace loads
export async function getCarrierMarketplaceLoadCounts(
  carrierOwnerId: string
): Promise<{ total: number; unassigned: number; assigned: number }> {
  const supabase = await createClient();

  // Get carrier's company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .single();

  if (!carrier) {
    return { total: 0, unassigned: 0, assigned: 0 };
  }

  // Get total count
  const { count: total } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_carrier_id', carrier.id)
    .eq('is_from_marketplace', true)
    .not('load_status', 'in', '("cancelled","completed","delivered")');

  // Get unassigned count
  const { count: unassigned } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_carrier_id', carrier.id)
    .eq('is_from_marketplace', true)
    .is('trip_id', null)
    .not('load_status', 'in', '("cancelled","completed","delivered")');

  return {
    total: total || 0,
    unassigned: unassigned || 0,
    assigned: (total || 0) - (unassigned || 0),
  };
}

// Update operational status for a load
export async function updateLoadOperationalStatus(
  loadId: string,
  userId: string,
  newStatus: string,
  notes?: string,
  location?: { lat: number; lng: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current status
  const { data: load } = await supabase
    .from('loads')
    .select('operational_status, marketplace_request_id')
    .eq('id', loadId)
    .single();

  if (!load) {
    return { success: false, error: 'Load not found' };
  }

  // Update the load
  const { error: updateError } = await supabase
    .from('loads')
    .update({
      operational_status: newStatus,
      last_status_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId);

  if (updateError) {
    console.error('Error updating load status:', updateError);
    return { success: false, error: updateError.message };
  }

  // Log the status change
  const { error: logError } = await supabase
    .from('load_status_updates')
    .insert({
      load_id: loadId,
      marketplace_request_id: load.marketplace_request_id,
      old_status: load.operational_status,
      new_status: newStatus,
      updated_by_user_id: userId,
      notes: notes || null,
      location_lat: location?.lat || null,
      location_lng: location?.lng || null,
    });

  if (logError) {
    console.error('Error logging status update:', logError);
    // Don't fail the operation, just log the error
  }

  // AUDIT LOGGING: Log operational status change
  logAuditEvent(supabase, {
    entityType: 'load',
    entityId: loadId,
    action: 'load_status_changed',
    performedByUserId: userId,
    previousValue: { operational_status: load.operational_status },
    newValue: { operational_status: newStatus },
    metadata: {
      old_status: load.operational_status,
      new_status: newStatus,
      notes: notes || null,
      has_location: !!location,
    },
  });

  return { success: true };
}

// Get single marketplace load detail for carrier
export async function getCarrierMarketplaceLoadDetail(
  loadId: string,
  carrierOwnerId: string
): Promise<CarrierMarketplaceLoad & {
  // Additional details for detail view
  origin_address: string | null;
  origin_address2: string | null;
  origin_contact_name: string | null;
  origin_contact_phone: string | null;
  origin_contact_email: string | null;
  origin_notes: string | null;
  destination_address: string | null;
  destination_address2: string | null;
  destination_contact_name: string | null;
  destination_contact_phone: string | null;
  destination_contact_email: string | null;
  destination_notes: string | null;
  estimated_weight_lbs: number | null;
  pieces_count: number | null;
  special_instructions: string | null;
  last_status_update: string | null;
} | null> {
  const supabase = await createClient();

  // Get carrier's company
  const { data: carrier } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', carrierOwnerId)
    .single();

  if (!carrier) {
    return null;
  }

  const { data, error } = await supabase
    .from('loads')
    .select(`
      id, load_number,
      posting_type, load_subtype,
      origin_city, origin_state, origin_zip,
      origin_address, origin_address2,
      origin_contact_name, origin_contact_phone, origin_contact_email,
      origin_notes,
      destination_city, destination_state, destination_zip,
      destination_address, destination_address2,
      destination_contact_name, destination_contact_phone, destination_contact_email,
      destination_notes,
      estimated_cuft, estimated_weight_lbs, pieces_count,
      carrier_rate, carrier_rate_type,
      balance_due,
      special_instructions,
      operational_status, load_status,
      last_status_update,
      trip_id,
      assigned_driver_id, assigned_driver_name,
      carrier_assigned_at, carrier_confirmed_at,
      truck_requirement,
      source_company_id, source_company_name,
      source_company:companies!loads_source_company_id_fkey(
        id, name, city, state, phone
      ),
      trip:trips(
        id, trip_number,
        driver:drivers(id, first_name, last_name)
      ),
      marketplace_request:load_requests!loads_marketplace_request_id_fkey(
        proposed_load_date_start,
        proposed_load_date_end,
        proposed_delivery_date_start,
        proposed_delivery_date_end
      )
    `)
    .eq('id', loadId)
    .eq('assigned_carrier_id', carrier.id)
    .eq('is_from_marketplace', true)
    .single();

  if (error || !data) {
    console.error('Error fetching marketplace load detail:', error);
    return null;
  }

  const marketplaceRequest = Array.isArray(data.marketplace_request)
    ? data.marketplace_request[0]
    : data.marketplace_request;
  const trip = Array.isArray(data.trip) ? data.trip[0] : data.trip;
  const sourceCompany = Array.isArray(data.source_company)
    ? data.source_company[0]
    : data.source_company;

  return {
    id: data.id,
    load_number: data.load_number,
    posting_type: data.posting_type || 'load',
    load_subtype: data.load_subtype,
    origin_city: data.origin_city,
    origin_state: data.origin_state,
    origin_zip: data.origin_zip,
    origin_address: data.origin_address,
    origin_address2: data.origin_address2,
    origin_contact_name: data.origin_contact_name,
    origin_contact_phone: data.origin_contact_phone,
    origin_contact_email: data.origin_contact_email,
    origin_notes: data.origin_notes,
    destination_city: data.destination_city,
    destination_state: data.destination_state,
    destination_zip: data.destination_zip,
    destination_address: data.destination_address,
    destination_address2: data.destination_address2,
    destination_contact_name: data.destination_contact_name,
    destination_contact_phone: data.destination_contact_phone,
    destination_contact_email: data.destination_contact_email,
    destination_notes: data.destination_notes,
    estimated_cuft: data.estimated_cuft,
    estimated_weight_lbs: data.estimated_weight_lbs,
    pieces_count: data.pieces_count,
    carrier_rate: data.carrier_rate,
    carrier_rate_type: data.carrier_rate_type,
    balance_due: data.balance_due,
    special_instructions: data.special_instructions,
    proposed_load_date_start: marketplaceRequest?.proposed_load_date_start || null,
    proposed_load_date_end: marketplaceRequest?.proposed_load_date_end || null,
    proposed_delivery_date_start: marketplaceRequest?.proposed_delivery_date_start || null,
    proposed_delivery_date_end: marketplaceRequest?.proposed_delivery_date_end || null,
    operational_status: data.operational_status || 'unassigned',
    load_status: data.load_status,
    last_status_update: data.last_status_update,
    trip_id: data.trip_id,
    assigned_driver_id: data.assigned_driver_id,
    assigned_driver_name: data.assigned_driver_name,
    carrier_assigned_at: data.carrier_assigned_at,
    carrier_confirmed_at: data.carrier_confirmed_at,
    truck_requirement: data.truck_requirement,
    source_company_id: data.source_company_id,
    source_company_name: data.source_company_name,
    source_company: sourceCompany,
    trip: trip ? {
      id: trip.id,
      trip_number: trip.trip_number,
      driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
    } : null,
  };
}

// Assign a marketplace load to a trip
export async function assignLoadToTrip(
  loadId: string,
  tripId: string,
  loadOrder: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user to verify ownership
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  console.log('assignLoadToTrip: Starting', { loadId, tripId, userId: user.id });

  // Get trip details for driver info, equipment, and owner_id
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(`
      id,
      owner_id,
      driver_id,
      truck_id,
      trailer_id,
      driver:drivers(id, first_name, last_name)
    `)
    .eq('id', tripId)
    .single();

  console.log('assignLoadToTrip: Trip query result', {
    tripFound: !!trip,
    tripOwnerId: trip?.owner_id,
    currentUserId: user.id,
    ownerMatch: trip?.owner_id === user.id,
    tripError
  });

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  // Verify user owns the trip
  if (trip.owner_id !== user.id) {
    console.error('assignLoadToTrip: User does not own trip', { tripOwnerId: trip.owner_id, userId: user.id });
    return { success: false, error: 'You do not own this trip' };
  }

  const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : null;

  // Check if load is already on another trip
  const { data: existingAssignment } = await supabase
    .from('trip_loads')
    .select('id, trip_id')
    .eq('load_id', loadId)
    .maybeSingle();

  if (existingAssignment) {
    if (existingAssignment.trip_id === tripId) {
      return { success: false, error: 'This load is already on this trip' };
    }
    // Remove from previous trip
    await supabase
      .from('trip_loads')
      .delete()
      .eq('id', existingAssignment.id);
  }

  // Count existing loads on this trip to set sequence_index
  const { count: existingLoadsCount } = await supabase
    .from('trip_loads')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  const sequenceIndex = existingLoadsCount ?? 0;

  // Insert into trip_loads junction table
  console.log('assignLoadToTrip: Inserting into trip_loads', {
    owner_id: user.id,
    trip_id: tripId,
    load_id: loadId,
    sequence_index: sequenceIndex,
  });

  const { data: insertedTripLoad, error: tripLoadsError } = await supabase
    .from('trip_loads')
    .insert({
      owner_id: user.id, // Use current user ID to satisfy RLS
      trip_id: tripId,
      load_id: loadId,
      sequence_index: sequenceIndex,
      role: 'primary',
    })
    .select('id')
    .single();

  if (tripLoadsError) {
    console.error('assignLoadToTrip: Error inserting into trip_loads:', tripLoadsError);
    return { success: false, error: `Failed to create trip_loads: ${tripLoadsError.message}` };
  }

  if (!insertedTripLoad) {
    console.error('assignLoadToTrip: Insert returned no data - RLS may have blocked');
    return { success: false, error: 'Failed to create trip assignment - check permissions' };
  }

  console.log('assignLoadToTrip: Successfully inserted into trip_loads', { id: insertedTripLoad.id });

  // Update the load with trip info, driver, and equipment (equipment inheritance)
  const { data: updatedLoad, error: loadError } = await supabase
    .from('loads')
    .update({
      trip_id: tripId,
      trip_load_order: loadOrder,
      delivery_order: sequenceIndex + 1,
      assigned_driver_id: driver?.id || null,
      assigned_driver_name: driverName,
      marketplace_driver_name: driverName,
      // EQUIPMENT INHERITANCE: Sync equipment from trip (same as addLoadToTrip in trips.ts)
      assigned_truck_id: trip?.truck_id || null,
      assigned_trailer_id: trip?.trailer_id || null,
      operational_status: 'assigned_to_driver',
      last_status_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', loadId)
    .select('id, trip_id')
    .single();

  if (loadError) {
    console.error('assignLoadToTrip: Error updating load:', loadError);
    return { success: false, error: `Failed to update load: ${loadError.message}` };
  }

  if (!updatedLoad || updatedLoad.trip_id !== tripId) {
    console.error('assignLoadToTrip: Load update failed or trip_id not set', { updatedLoad });
    return { success: false, error: 'Failed to update load with trip assignment - check RLS policies' };
  }

  // AUDIT LOGGING: Log load added to trip (from marketplace flow)
  logAuditEvent(supabase, {
    entityType: 'trip',
    entityId: tripId,
    action: 'load_added',
    performedByUserId: user.id,
    newValue: { load_id: loadId, delivery_order: loadOrder },
    metadata: {
      load_id: loadId,
      is_marketplace_load: true,
      driver_name: driverName,
    },
  });

  console.log('assignLoadToTrip: SUCCESS - Load assigned to trip', { loadId, tripId, tripLoadId: insertedTripLoad.id });
  return { success: true };
}

/**
 * Retroactively create partnerships for marketplace transactions that are missing them.
 * This fixes the bug where partnerships were silently not created.
 */
export async function createMissingPartnerships(userId: string): Promise<{
  success: boolean;
  created: number;
  errors: string[];
}> {
  const adminClient = createServiceRoleClient();
  const errors: string[] = [];
  let created = 0;

  // Find all accepted load requests that should have created partnerships
  // but check if partnerships actually exist
  const { data: acceptedRequests, error: queryError } = await adminClient
    .from('load_requests')
    .select(`
      id,
      carrier_id,
      carrier_owner_id,
      creates_partnership,
      load:loads!load_id(
        id,
        owner_id,
        company_id,
        is_from_marketplace
      )
    `)
    .eq('status', 'accepted')
    .eq('creates_partnership', true);

  if (queryError) {
    console.error('[createMissingPartnerships] Query error:', queryError);
    return { success: false, created: 0, errors: [queryError.message] };
  }

  console.log(`[createMissingPartnerships] Found ${acceptedRequests?.length || 0} accepted requests with creates_partnership=true`);

  for (const request of acceptedRequests || []) {
    const loadData = Array.isArray(request.load) ? request.load[0] : request.load;
    if (!loadData) continue;

    const brokerOwnerId = loadData.owner_id;
    const brokerCompanyId = loadData.company_id;
    const carrierOwnerId = request.carrier_owner_id;
    const carrierCompanyId = request.carrier_id;

    // Check if broker partnership exists
    const { data: brokerPartnership } = await adminClient
      .from('company_partnerships')
      .select('id')
      .eq('owner_id', brokerOwnerId)
      .eq('company_a_id', brokerCompanyId)
      .eq('company_b_id', carrierCompanyId)
      .maybeSingle();

    if (!brokerPartnership) {
      const { error: createError } = await adminClient
        .from('company_partnerships')
        .insert({
          owner_id: brokerOwnerId,
          company_a_id: brokerCompanyId,
          company_b_id: carrierCompanyId,
          relationship_type: 'gives_loads',
          status: 'active',
          payment_terms: 'net_30',
        });

      if (createError) {
        errors.push(`Broker partnership for request ${request.id}: ${createError.message}`);
      } else {
        created++;
        console.log(`[createMissingPartnerships] Created broker partnership for load ${loadData.id}`);
      }
    }

    // Check if carrier partnership exists
    const { data: carrierPartnership } = await adminClient
      .from('company_partnerships')
      .select('id')
      .eq('owner_id', carrierOwnerId)
      .eq('company_a_id', carrierCompanyId)
      .eq('company_b_id', brokerCompanyId)
      .maybeSingle();

    if (!carrierPartnership) {
      const { error: createError } = await adminClient
        .from('company_partnerships')
        .insert({
          owner_id: carrierOwnerId,
          company_a_id: carrierCompanyId,
          company_b_id: brokerCompanyId,
          relationship_type: 'receives_loads',
          status: 'active',
          payment_terms: 'net_30',
        });

      if (createError) {
        errors.push(`Carrier partnership for request ${request.id}: ${createError.message}`);
      } else {
        created++;
        console.log(`[createMissingPartnerships] Created carrier partnership for load ${loadData.id}`);
      }
    }
  }

  return { success: errors.length === 0, created, errors };
}

// Types for loads given out
export interface LoadGivenOut {
  id: string;
  load_number: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  estimated_cuft: number | null;
  carrier_rate: number | null;
  load_status: string;
  posting_status: string;
  expected_load_date: string | null;
  expected_delivery_date: string | null;
  assigned_at: string | null;
  carrier_confirmed_at: string | null;
  carrier: {
    id: string;
    name: string;
  } | null;
}

/**
 * Get loads that the current user has given out to external carriers
 * These are loads posted by the user's company that have been assigned to carriers via marketplace
 */
export async function getLoadsGivenOut(userId: string): Promise<LoadGivenOut[]> {
  const supabase = await createClient();

  // First get user's workspace company (same approach as Posted Jobs page)
  const { data: workspaceCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!workspaceCompany) {
    console.log('[getLoadsGivenOut] No workspace company found for user:', userId, 'error:', companyError);
    return [];
  }

  // Query loads that this company posted AND have been assigned to a carrier
  const { data, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      pickup_city,
      pickup_state,
      delivery_city,
      delivery_state,
      cubic_feet,
      cubic_feet_estimate,
      carrier_rate,
      load_status,
      posting_status,
      expected_load_date,
      delivery_date,
      carrier_assigned_at,
      carrier_confirmed_at,
      assigned_carrier_id,
      assigned_carrier:assigned_carrier_id(id, name)
    `)
    .eq('posted_by_company_id', workspaceCompany.id)
    .not('assigned_carrier_id', 'is', null)
    .order('carrier_assigned_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[getLoadsGivenOut] Error querying loads:', error);
    return [];
  }

  return (data || []).map((load: any) => {
    // Handle the assigned_carrier join - could be object or array
    const carrier = Array.isArray(load.assigned_carrier)
      ? load.assigned_carrier[0]
      : load.assigned_carrier;

    return {
      id: load.id,
      load_number: load.load_number,
      origin_city: load.pickup_city,
      origin_state: load.pickup_state,
      destination_city: load.delivery_city,
      destination_state: load.delivery_state,
      estimated_cuft: load.cubic_feet || load.cubic_feet_estimate,
      carrier_rate: load.carrier_rate,
      load_status: load.load_status || 'pending',
      posting_status: load.posting_status || 'assigned',
      expected_load_date: load.expected_load_date,
      expected_delivery_date: load.delivery_date,
      assigned_at: load.carrier_assigned_at,
      carrier_confirmed_at: load.carrier_confirmed_at,
      carrier: carrier || null,
    };
  });
}

/**
 * Debug version that returns diagnostic info - use for troubleshooting
 */
export async function getLoadsGivenOutDebug(userId: string): Promise<{
  loads: LoadGivenOut[];
  debug: {
    userId: string;
    workspaceCompanyId: string | null;
    companyError: string | null;
    queryCount: number;
    queryError: string | null;
    rawData: unknown[];
    // Additional debug info
    authUser: { id: string; email: string } | null;
    byOwnerCount: number;
    byOwnerError: string | null;
    byPostedByCount: number;
    byPostedByError: string | null;
  };
}> {
  const supabase = await createClient();

  // Check auth state in function context
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // First get user's workspace company
  const { data: workspaceCompany, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (!workspaceCompany) {
    return {
      loads: [],
      debug: {
        userId,
        workspaceCompanyId: null,
        companyError: companyError?.message || 'No workspace company found',
        queryCount: 0,
        queryError: null,
        rawData: [],
        authUser: authUser ? { id: authUser.id, email: authUser.email || '' } : null,
        byOwnerCount: 0,
        byOwnerError: null,
        byPostedByCount: 0,
        byPostedByError: null,
      },
    };
  }

  // Test 1: Query by owner_id (should work due to RLS)
  const { data: byOwner, error: byOwnerError } = await supabase
    .from('loads')
    .select('id, load_number, assigned_carrier_id')
    .eq('owner_id', userId)
    .not('assigned_carrier_id', 'is', null)
    .limit(10);

  // Test 2: Query by posted_by_company_id
  const { data: byPostedBy, error: byPostedByError } = await supabase
    .from('loads')
    .select('id, load_number, assigned_carrier_id')
    .eq('posted_by_company_id', workspaceCompany.id)
    .not('assigned_carrier_id', 'is', null)
    .limit(10);

  // Main query for actual data
  const { data, error } = await supabase
    .from('loads')
    .select(`
      id,
      load_number,
      pickup_city,
      pickup_state,
      delivery_city,
      delivery_state,
      cubic_feet,
      cubic_feet_estimate,
      carrier_rate,
      load_status,
      posting_status,
      expected_load_date,
      delivery_date,
      carrier_assigned_at,
      carrier_confirmed_at,
      assigned_carrier_id,
      assigned_carrier:assigned_carrier_id(id, name)
    `)
    .eq('posted_by_company_id', workspaceCompany.id)
    .not('assigned_carrier_id', 'is', null)
    .order('carrier_assigned_at', { ascending: false, nullsFirst: false });

  const loads = (data || []).map((load: any) => {
    const carrier = Array.isArray(load.assigned_carrier)
      ? load.assigned_carrier[0]
      : load.assigned_carrier;

    return {
      id: load.id,
      load_number: load.load_number,
      origin_city: load.pickup_city,
      origin_state: load.pickup_state,
      destination_city: load.delivery_city,
      destination_state: load.delivery_state,
      estimated_cuft: load.cubic_feet || load.cubic_feet_estimate,
      carrier_rate: load.carrier_rate,
      load_status: load.load_status || 'pending',
      posting_status: load.posting_status || 'assigned',
      expected_load_date: load.expected_load_date,
      expected_delivery_date: load.delivery_date,
      assigned_at: load.carrier_assigned_at,
      carrier_confirmed_at: load.carrier_confirmed_at,
      carrier: carrier || null,
    };
  });

  return {
    loads,
    debug: {
      userId,
      workspaceCompanyId: workspaceCompany.id,
      companyError: null,
      queryCount: data?.length || 0,
      queryError: error?.message || null,
      rawData: data || [],
      authUser: authUser ? { id: authUser.id, email: authUser.email || '' } : null,
      byOwnerCount: byOwner?.length || 0,
      byOwnerError: byOwnerError?.message || null,
      byPostedByCount: byPostedBy?.length || 0,
      byPostedByError: byPostedByError?.message || null,
    },
  };
}

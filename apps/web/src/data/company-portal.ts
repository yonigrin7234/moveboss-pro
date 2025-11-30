import { createClient } from '@/lib/supabase-server';

// ===========================================
// COMPANY PORTAL LOGIN
// ===========================================

export interface CompanyPortalLoginResult {
  success: boolean;
  company?: {
    company_id: string;
    name: string;
    email: string;
    owner_id: string;
    is_broker: boolean;
    is_agent: boolean;
    is_carrier: boolean;
  };
  error?: string;
}

export async function verifyCompanyPortalLogin(
  email: string,
  accessCode: string
): Promise<CompanyPortalLoginResult> {
  const supabase = await createClient();

  // Look for company with matching portal credentials
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, owner_id, is_broker, is_agent, is_carrier, portal_email, portal_access_code, portal_enabled')
    .eq('portal_email', email.toLowerCase())
    .eq('portal_enabled', true)
    .single();

  if (error || !company) {
    return { success: false, error: 'Invalid email or access code' };
  }

  // Simple access code check (in production, use proper hashing)
  if (company.portal_access_code !== accessCode) {
    return { success: false, error: 'Invalid email or access code' };
  }

  return {
    success: true,
    company: {
      company_id: company.id,
      name: company.name || 'Company',
      email: company.portal_email,
      owner_id: company.owner_id || '',
      is_broker: company.is_broker || false,
      is_agent: company.is_agent || false,
      is_carrier: company.is_carrier || false,
    },
  };
}

// ===========================================
// DASHBOARD STATS
// ===========================================

export async function getCompanyDashboardStats(companyId: string) {
  const supabase = await createClient();

  const { data: loads } = await supabase
    .from('loads')
    .select('id, load_status, total_revenue, carrier_rate')
    .eq('company_id', companyId);

  const allLoads = loads || [];

  return {
    total_loads: allLoads.length,
    pending: allLoads.filter((l) => l.load_status === 'pending').length,
    in_transit: allLoads.filter((l) =>
      ['loading', 'loaded', 'in_transit'].includes(l.load_status)
    ).length,
    delivered: allLoads.filter((l) => l.load_status === 'delivered').length,
    total_revenue: allLoads.reduce((sum, l) => sum + (l.total_revenue || 0), 0),
  };
}

// ===========================================
// LOAD MANAGEMENT
// ===========================================

// Create a load (company posting a load)
export async function createCompanyLoad(
  companyId: string,
  ownerId: string,
  data: {
    internal_reference?: string;
    storage_location_id?: string;
    storage_unit?: string;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft?: number;
    estimated_weight_lbs?: number;
    pricing_mode: 'cuft' | 'weight';
    rate_per_cuft?: number;
    rate_per_cwt?: number;
    total_revenue: number;
    first_available_date?: string;
    notes?: string;
  }
): Promise<{ success: boolean; id?: string; load_number?: string; error?: string }> {
  const supabase = await createClient();

  // Generate load number
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const load_number = `LD-${timestamp}-${random}`;

  const { data: result, error } = await supabase
    .from('loads')
    .insert({
      company_id: companyId,
      owner_id: ownerId,
      load_number,
      internal_reference: data.internal_reference,
      storage_location_id: data.storage_location_id || null,
      storage_unit: data.storage_unit,
      origin_city: data.origin_city,
      origin_state: data.origin_state,
      origin_zip: data.origin_zip,
      destination_city: data.destination_city,
      destination_state: data.destination_state,
      destination_zip: data.destination_zip,
      estimated_cuft: data.estimated_cuft,
      estimated_weight_lbs: data.estimated_weight_lbs,
      pricing_mode: data.pricing_mode,
      rate_per_cuft: data.rate_per_cuft,
      rate_per_cwt: data.rate_per_cwt,
      total_revenue: data.total_revenue,
      first_available_date: data.first_available_date,
      special_instructions: data.notes,
      load_status: 'pending',
      load_type: 'standard',
    })
    .select('id, load_number')
    .single();

  if (error) {
    console.error('Error creating load:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id, load_number: result.load_number };
}

// Get load detail
export async function getCompanyLoadDetail(companyId: string, loadId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      carrier:companies!loads_assigned_carrier_id_fkey(id, name, mc_number),
      storage_location:storage_locations(id, name, city, state)
    `)
    .eq('id', loadId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    console.error('Error fetching load:', error);
    return null;
  }

  return data;
}

// Assign load to carrier
export async function assignLoadToCarrier(
  loadId: string,
  carrierId: string,
  carrierRate?: number,
  carrierRateType?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: carrierId,
      carrier_assigned_at: new Date().toISOString(),
      carrier_rate: carrierRate,
      carrier_rate_type: carrierRateType,
      load_status: 'pending', // Carrier needs to accept
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error assigning carrier:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Unassign carrier from load (also resets posting_status back to 'posted' if it was marketplace load)
export async function unassignCarrierFromLoad(
  loadId: string,
  options?: { returnToMarketplace?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    assigned_carrier_id: null,
    carrier_assigned_at: null,
    carrier_confirmed_at: null,
    carrier_rate: null,
    carrier_rate_type: null,
    load_status: 'pending',
    assigned_at: null,
  };

  // If returnToMarketplace is true, reset posting_status to 'posted'
  if (options?.returnToMarketplace) {
    updatePayload.posting_status = 'posted';
    updatePayload.marketplace_listed = true;
  }

  const { error } = await supabase
    .from('loads')
    .update(updatePayload)
    .eq('id', loadId);

  if (error) {
    console.error('Error unassigning carrier:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ===========================================
// MARKETPLACE POSTING MANAGEMENT
// ===========================================

/**
 * Release a load back to the marketplace (carrier gives back a claimed load)
 * Transitions: assigned -> posted
 */
export async function releaseLoadToMarketplace(
  loadId: string,
  carrierId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; loadOwnerId?: string }> {
  const supabase = await createClient();

  // First verify the carrier is actually assigned to this load
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, owner_id, assigned_carrier_id, posting_status, load_number, company_id')
    .eq('id', loadId)
    .single();

  if (fetchError || !load) {
    return { success: false, error: 'Load not found' };
  }

  if (load.assigned_carrier_id !== carrierId) {
    return { success: false, error: 'You are not assigned to this load' };
  }

  if (load.posting_status !== 'assigned') {
    return { success: false, error: 'Load is not in assigned status' };
  }

  // Release the load back to marketplace
  const { error } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: null,
      carrier_assigned_at: null,
      carrier_confirmed_at: null,
      carrier_rate: null,
      carrier_rate_type: null,
      assigned_at: null,
      load_status: 'pending',
      posting_status: 'posted', // Back to marketplace
      marketplace_listed: true,
      release_reason: reason || null,
      released_at: new Date().toISOString(),
      released_by_carrier_id: carrierId,
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error releasing load:', error);
    return { success: false, error: error.message };
  }

  // Update carrier's loads_given_back count
  await supabase.rpc('increment_carrier_loads_given_back', { carrier_id: carrierId });

  return { success: true, loadOwnerId: load.owner_id };
}

/**
 * Unpublish a load from marketplace (posted -> draft)
 * Owner takes it off the marketplace
 */
export async function unpublishLoad(
  loadId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify ownership
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, owner_id, posting_status')
    .eq('id', loadId)
    .eq('owner_id', ownerId)
    .single();

  if (fetchError || !load) {
    return { success: false, error: 'Load not found or you do not have permission' };
  }

  if (load.posting_status !== 'posted') {
    return { success: false, error: 'Load must be in posted status to unpublish' };
  }

  const { error } = await supabase
    .from('loads')
    .update({
      posting_status: 'draft',
      marketplace_listed: false,
      posted_at: null,
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error unpublishing load:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel a load (any status -> cancelled)
 * Can be done by owner
 */
export async function cancelPostedLoad(
  loadId: string,
  ownerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; previousCarrierId?: string }> {
  const supabase = await createClient();

  // Verify ownership
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, owner_id, posting_status, assigned_carrier_id')
    .eq('id', loadId)
    .eq('owner_id', ownerId)
    .single();

  if (fetchError || !load) {
    return { success: false, error: 'Load not found or you do not have permission' };
  }

  // Don't allow cancelling completed loads
  if (load.posting_status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed load' };
  }

  const previousCarrierId = load.assigned_carrier_id;

  const { error } = await supabase
    .from('loads')
    .update({
      posting_status: 'cancelled',
      marketplace_listed: false,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null,
      // Clear carrier assignment if any
      assigned_carrier_id: null,
      carrier_assigned_at: null,
      carrier_confirmed_at: null,
      assigned_at: null,
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error cancelling load:', error);
    return { success: false, error: error.message };
  }

  return { success: true, previousCarrierId };
}

/**
 * Repost a cancelled or draft load to marketplace
 */
export async function repostLoadToMarketplace(
  loadId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify ownership
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, owner_id, posting_status')
    .eq('id', loadId)
    .eq('owner_id', ownerId)
    .single();

  if (fetchError || !load) {
    return { success: false, error: 'Load not found or you do not have permission' };
  }

  if (!['draft', 'cancelled'].includes(load.posting_status || '')) {
    return { success: false, error: 'Load must be in draft or cancelled status to repost' };
  }

  const { error } = await supabase
    .from('loads')
    .update({
      posting_status: 'posted',
      marketplace_listed: true,
      posted_at: new Date().toISOString(),
      cancelled_at: null,
      cancellation_reason: null,
      released_at: null,
      released_by_carrier_id: null,
      release_reason: null,
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error reposting load:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get carrier partners for a company
export async function getCompanyCarrierPartners(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      id,
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, mc_number, city, state, compliance_status, is_carrier
      ),
      total_loads,
      status
    `)
    .eq('company_a_id', companyId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching carrier partners:', error);
    return [];
  }

  // Also check reverse direction (company_b is this company)
  const { data: reverseData } = await supabase
    .from('company_partnerships')
    .select(`
      id,
      company_a:companies!company_partnerships_company_a_id_fkey(
        id, name, mc_number, city, state, compliance_status, is_carrier
      ),
      total_loads,
      status
    `)
    .eq('company_b_id', companyId)
    .eq('status', 'active');

  // Combine and filter for carriers only
  const partners: Array<{
    id: string;
    partner: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    total_loads: number;
  }> = [];

  (data as unknown as Array<{
    id: string;
    company_b: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    total_loads: number;
  }>)?.forEach((d) => {
    if (d.company_b?.is_carrier) {
      partners.push({ ...d, partner: d.company_b });
    }
  });

  (reverseData as unknown as Array<{
    id: string;
    company_a: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    total_loads: number;
  }>)?.forEach((d) => {
    if (d.company_a?.is_carrier) {
      partners.push({ ...d, partner: d.company_a });
    }
  });

  return partners;
}

// Get storage locations for a company
export async function getCompanyStorageLocations(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_locations')
    .select('id, name, city, state, address_line1')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching storage locations:', error);
    return [];
  }

  return data || [];
}

// Get loads grouped by status for dashboard
export async function getCompanyLoadsByStatusGroups(companyId: string): Promise<{
  pending: Array<Record<string, unknown>>;
  assigned: Array<Record<string, unknown>>;
  in_transit: Array<Record<string, unknown>>;
  delivered: Array<Record<string, unknown>>;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      carrier:companies!loads_assigned_carrier_id_fkey(id, name),
      storage_location:storage_locations(id, name, city, state)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching loads:', error);
    return { pending: [], assigned: [], in_transit: [], delivered: [] };
  }

  const loads = (data || []) as Array<Record<string, unknown>>;

  return {
    pending: loads.filter(
      (l) => l.load_status === 'pending' && !l.assigned_carrier_id
    ),
    assigned: loads.filter(
      (l) =>
        ['pending', 'accepted'].includes(l.load_status as string) &&
        l.assigned_carrier_id
    ),
    in_transit: loads.filter((l) =>
      ['loading', 'loaded', 'in_transit'].includes(l.load_status as string)
    ),
    delivered: loads.filter((l) => l.load_status === 'delivered'),
  };
}

// Get all loads for company
export async function getCompanyLoads(companyId: string, status?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('loads')
    .select(`
      *,
      carrier:companies!loads_assigned_carrier_id_fkey(id, name),
      storage_location:storage_locations(id, name, city, state)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    if (status === 'in_transit') {
      query = query.in('load_status', ['loading', 'loaded', 'in_transit']);
    } else {
      query = query.eq('load_status', status);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching loads:', error);
    return [];
  }

  return data || [];
}

// Get payment summary (what company owes carriers)
export async function getCompanyPaymentSummary(companyId: string): Promise<{
  total_owed: number;
  by_carrier: { carrier_name: string; amount: number; loads_count: number }[];
}> {
  const supabase = await createClient();

  const { data: loads } = await supabase
    .from('loads')
    .select(`
      carrier_rate,
      assigned_carrier_id,
      carrier:companies!loads_assigned_carrier_id_fkey(id, name)
    `)
    .eq('company_id', companyId)
    .eq('load_status', 'delivered')
    .not('assigned_carrier_id', 'is', null);

  if (!loads) {
    return { total_owed: 0, by_carrier: [] };
  }

  // Group by carrier
  const byCarrier = new Map<
    string,
    { name: string; amount: number; count: number }
  >();

  (loads as unknown as Array<{
    carrier_rate: number | null;
    assigned_carrier_id: string;
    carrier: { id: string; name: string } | null;
  }>).forEach((load) => {
    const carrierId = load.assigned_carrier_id;
    const carrierName = load.carrier?.name || 'Unknown';
    const amount = load.carrier_rate || 0;

    if (byCarrier.has(carrierId)) {
      const existing = byCarrier.get(carrierId)!;
      existing.amount += amount;
      existing.count += 1;
    } else {
      byCarrier.set(carrierId, { name: carrierName, amount, count: 1 });
    }
  });

  const by_carrier = Array.from(byCarrier.values()).map((c) => ({
    carrier_name: c.name,
    amount: c.amount,
    loads_count: c.count,
  }));

  const total_owed = by_carrier.reduce((sum, c) => sum + c.amount, 0);

  return { total_owed, by_carrier };
}

// ===========================================
// LOAD REQUESTS
// ===========================================

// Get count of pending requests for company's loads
export async function getCompanyPendingRequestsCount(companyId: string): Promise<number> {
  const supabase = await createClient();

  // Get all load IDs for this company
  const { data: loads } = await supabase
    .from('loads')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_marketplace_visible', true);

  if (!loads || loads.length === 0) return 0;

  const loadIds = loads.map((l) => l.id);

  const { count, error } = await supabase
    .from('load_requests')
    .select('*', { count: 'exact', head: true })
    .in('load_id', loadIds)
    .eq('status', 'pending');

  if (error) {
    console.error('Error counting requests:', error);
    return 0;
  }

  return count || 0;
}

// Get all loads with their request counts
export async function getCompanyLoadsWithRequests(companyId: string): Promise<
  Array<{
    id: string;
    load_number: string;
    internal_reference: string | null;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft: number | null;
    company_rate: number | null;
    company_rate_type: string | null;
    rate_is_fixed: boolean;
    is_ready_now: boolean;
    available_date: string | null;
    equipment_type: string | null;
    load_status: string;
    is_marketplace_visible: boolean;
    posted_to_marketplace_at: string | null;
    assigned_carrier_id: string | null;
    carrier: { id: string; name: string } | null;
    request_count: number;
    pending_request_count: number;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      id,
      load_number,
      internal_reference,
      origin_city,
      origin_state,
      origin_zip,
      destination_city,
      destination_state,
      destination_zip,
      estimated_cuft,
      company_rate,
      company_rate_type,
      rate_is_fixed,
      is_ready_now,
      available_date,
      equipment_type,
      load_status,
      is_marketplace_visible,
      posted_to_marketplace_at,
      assigned_carrier_id,
      carrier:companies!loads_assigned_carrier_id_fkey(id, name)
    `
    )
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching loads:', error);
    return [];
  }

  // Get request counts for each load
  const loadIds = data?.map((l) => l.id) || [];

  if (loadIds.length === 0) return [];

  const { data: requestCounts } = await supabase
    .from('load_requests')
    .select('load_id, status')
    .in('load_id', loadIds);

  // Count requests per load
  const countsMap = new Map<string, { total: number; pending: number }>();
  requestCounts?.forEach((r) => {
    const current = countsMap.get(r.load_id) || { total: 0, pending: 0 };
    current.total++;
    if (r.status === 'pending') current.pending++;
    countsMap.set(r.load_id, current);
  });

  // Merge counts into loads
  return (data || []).map((load) => ({
    ...load,
    carrier: Array.isArray(load.carrier) ? load.carrier[0] : load.carrier,
    request_count: countsMap.get(load.id)?.total || 0,
    pending_request_count: countsMap.get(load.id)?.pending || 0,
  })) as Array<{
    id: string;
    load_number: string;
    internal_reference: string | null;
    origin_city: string;
    origin_state: string;
    origin_zip: string;
    destination_city: string;
    destination_state: string;
    destination_zip: string;
    estimated_cuft: number | null;
    company_rate: number | null;
    company_rate_type: string | null;
    rate_is_fixed: boolean;
    is_ready_now: boolean;
    available_date: string | null;
    equipment_type: string | null;
    load_status: string;
    is_marketplace_visible: boolean;
    posted_to_marketplace_at: string | null;
    assigned_carrier_id: string | null;
    carrier: { id: string; name: string } | null;
    request_count: number;
    pending_request_count: number;
  }>;
}

// Get requests for a specific load
export async function getLoadRequestsForCompany(loadId: string): Promise<
  Array<{
    id: string;
    load_id: string;
    carrier_id: string;
    carrier_owner_id: string;
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
    created_at: string;
    // Counter offer fields
    request_type: 'accept_listed' | 'counter_offer';
    counter_offer_rate: number | null;
    // Proposed dates
    proposed_load_date_start: string | null;
    proposed_load_date_end: string | null;
    proposed_delivery_date_start: string | null;
    proposed_delivery_date_end: string | null;
    carrier: {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
      mc_number: string | null;
      dot_number: string | null;
      phone: string | null;
      email: string | null;
      platform_loads_completed: number;
      platform_rating: number | null;
      platform_member_since: string | null;
      loads_given_back: number | null;
      loads_accepted_total: number | null;
    } | null;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_requests')
    .select(
      `
      *,
      carrier:companies!load_requests_carrier_id_fkey(
        id,
        name,
        city,
        state,
        mc_number,
        dot_number,
        phone,
        email,
        platform_loads_completed,
        platform_rating,
        platform_member_since,
        loads_given_back,
        loads_accepted_total
      )
    `
    )
    .eq('load_id', loadId)
    .order('is_partner', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  return (data || []).map((r) => ({
    ...r,
    carrier: Array.isArray(r.carrier) ? r.carrier[0] : r.carrier,
  })) as Array<{
    id: string;
    load_id: string;
    carrier_id: string;
    carrier_owner_id: string;
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
    created_at: string;
    request_type: 'accept_listed' | 'counter_offer';
    counter_offer_rate: number | null;
    proposed_load_date_start: string | null;
    proposed_load_date_end: string | null;
    proposed_delivery_date_start: string | null;
    proposed_delivery_date_end: string | null;
    carrier: {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
      mc_number: string | null;
      dot_number: string | null;
      phone: string | null;
      email: string | null;
      platform_loads_completed: number;
      platform_rating: number | null;
      platform_member_since: string | null;
      loads_given_back: number | null;
      loads_accepted_total: number | null;
    } | null;
  }>;
}

// Get load details for company (includes full pickup info)
export async function getCompanyLoadWithDetails(
  companyId: string,
  loadId: string
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('loads')
    .select(
      `
      *,
      storage_location:storage_locations(id, name, city, state),
      carrier:companies!loads_assigned_carrier_id_fkey(id, name, phone)
    `
    )
    .eq('id', loadId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    console.error('Error fetching load:', error);
    return null;
  }

  return {
    ...data,
    carrier: Array.isArray(data.carrier) ? data.carrier[0] : data.carrier,
    storage_location: Array.isArray(data.storage_location) ? data.storage_location[0] : data.storage_location,
  };
}

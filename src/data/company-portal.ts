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

// Unassign carrier from load
export async function unassignCarrierFromLoad(
  loadId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('loads')
    .update({
      assigned_carrier_id: null,
      carrier_assigned_at: null,
      carrier_rate: null,
      carrier_rate_type: null,
      load_status: 'pending',
    })
    .eq('id', loadId);

  if (error) {
    console.error('Error unassigning carrier:', error);
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
      default_rate_type,
      default_rate_amount,
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
      default_rate_type,
      default_rate_amount,
      total_loads,
      status
    `)
    .eq('company_b_id', companyId)
    .eq('status', 'active');

  // Combine and filter for carriers only
  const partners: Array<{
    id: string;
    partner: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    default_rate_type: string | null;
    default_rate_amount: number | null;
    total_loads: number;
  }> = [];

  (data as unknown as Array<{
    id: string;
    company_b: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    default_rate_type: string | null;
    default_rate_amount: number | null;
    total_loads: number;
  }>)?.forEach((d) => {
    if (d.company_b?.is_carrier) {
      partners.push({ ...d, partner: d.company_b });
    }
  });

  (reverseData as unknown as Array<{
    id: string;
    company_a: { id: string; name: string; mc_number?: string; city?: string; state?: string; is_carrier?: boolean } | null;
    default_rate_type: string | null;
    default_rate_amount: number | null;
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

import { createClient } from '@/lib/supabase-server';

export interface PartnerCompany {
  id: string;
  name: string;
  is_broker: boolean;
  is_agent: boolean;
  is_carrier: boolean;
  mc_number: string | null;
  dot_number: string | null;
  compliance_status: string;
  city: string | null;
  state: string | null;
}

export interface Partnership {
  id: string;
  company_a_id: string;
  company_b_id: string;
  owner_id: string;
  initiated_by_id: string | null;
  relationship_type: 'gives_loads' | 'takes_loads' | 'mutual';
  status: 'pending' | 'active' | 'paused' | 'terminated';
  requested_at: string;
  approved_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  terminated_at: string | null;
  terminated_reason: string | null;
  default_rate_type: string | null;
  default_rate_amount: number | null;
  payment_terms: string;
  total_loads: number;
  total_revenue: number;
  last_load_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  company_a?: PartnerCompany;
  company_b?: PartnerCompany;
}

export interface PartnershipInvitation {
  id: string;
  from_company_id: string;
  from_owner_id: string;
  to_company_id: string | null;
  to_email: string | null;
  to_company_name: string | null;
  relationship_type: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  sent_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  expires_at: string;
  invitation_token: string;
  // Joined
  from_company?: { id: string; name: string };
  to_company?: { id: string; name: string } | null;
}

// Get all partnerships for an owner
export async function getPartnerships(ownerId: string): Promise<Partnership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      *,
      company_a:companies!company_partnerships_company_a_id_fkey(
        id, name, is_broker, is_agent, is_carrier, mc_number, dot_number, compliance_status, city, state
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_broker, is_agent, is_carrier, mc_number, dot_number, compliance_status, city, state
      )
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partnerships:', error);
    return [];
  }

  return data || [];
}

// Get partnerships by status
export async function getPartnershipsByStatus(
  ownerId: string,
  status: 'pending' | 'active' | 'paused' | 'terminated'
): Promise<Partnership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      *,
      company_a:companies!company_partnerships_company_a_id_fkey(
        id, name, is_broker, is_agent, is_carrier, mc_number, dot_number, compliance_status, city, state
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_broker, is_agent, is_carrier, mc_number, dot_number, compliance_status, city, state
      )
    `)
    .eq('owner_id', ownerId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partnerships:', error);
    return [];
  }

  return data || [];
}

// Get active carrier partners (for dropdowns when assigning loads)
export async function getActiveCarrierPartners(ownerId: string): Promise<PartnerCompany[]> {
  const supabase = await createClient();

  // Get owner's company first
  const { data: ownerCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', ownerId);

  const ownerCompanyIds = ownerCompanies?.map((c) => c.id) || [];

  // Get active partnerships where partner is a carrier
  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      company_a:companies!company_partnerships_company_a_id_fkey(
        id, name, is_carrier, mc_number, city, state, compliance_status, is_broker, is_agent, dot_number
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_carrier, mc_number, city, state, compliance_status, is_broker, is_agent, dot_number
      )
    `)
    .eq('owner_id', ownerId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching carrier partners:', error);
    return [];
  }

  // Extract carrier partners (the company that is NOT the owner's company)
  const carriers: PartnerCompany[] = [];
  (data as unknown as Array<{ company_a: PartnerCompany | null; company_b: PartnerCompany | null }>)?.forEach((p) => {
    if (p.company_a && !ownerCompanyIds.includes(p.company_a.id) && p.company_a.is_carrier) {
      carriers.push(p.company_a);
    }
    if (p.company_b && !ownerCompanyIds.includes(p.company_b.id) && p.company_b.is_carrier) {
      carriers.push(p.company_b);
    }
  });

  // Remove duplicates
  const unique = carriers.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  return unique;
}

// Get active companies that give loads (for carriers)
export async function getActiveCompanyPartners(ownerId: string): Promise<PartnerCompany[]> {
  const supabase = await createClient();

  const { data: ownerCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', ownerId);

  const ownerCompanyIds = ownerCompanies?.map((c) => c.id) || [];

  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      company_a:companies!company_partnerships_company_a_id_fkey(
        id, name, is_broker, is_agent, city, state, compliance_status, is_carrier, mc_number, dot_number
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_broker, is_agent, city, state, compliance_status, is_carrier, mc_number, dot_number
      )
    `)
    .eq('owner_id', ownerId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching company partners:', error);
    return [];
  }

  const companies: PartnerCompany[] = [];
  (data as unknown as Array<{ company_a: PartnerCompany | null; company_b: PartnerCompany | null }>)?.forEach((p) => {
    if (
      p.company_a &&
      !ownerCompanyIds.includes(p.company_a.id) &&
      (p.company_a.is_broker || p.company_a.is_agent)
    ) {
      companies.push(p.company_a);
    }
    if (
      p.company_b &&
      !ownerCompanyIds.includes(p.company_b.id) &&
      (p.company_b.is_broker || p.company_b.is_agent)
    ) {
      companies.push(p.company_b);
    }
  });

  const unique = companies.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  return unique;
}

// Get partnership by ID
export async function getPartnershipById(
  id: string,
  ownerId: string
): Promise<Partnership | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_partnerships')
    .select(`
      *,
      company_a:companies!company_partnerships_company_a_id_fkey(*),
      company_b:companies!company_partnerships_company_b_id_fkey(*)
    `)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();

  if (error) {
    console.error('Error fetching partnership:', error);
    return null;
  }

  return data;
}

// Create partnership (when both companies exist)
export async function createPartnership(
  ownerId: string,
  data: {
    company_a_id: string;
    company_b_id: string;
    relationship_type: string;
    payment_terms?: string;
    internal_notes?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('company_partnerships')
    .insert({
      owner_id: ownerId,
      company_a_id: data.company_a_id,
      company_b_id: data.company_b_id,
      initiated_by_id: data.company_a_id,
      relationship_type: data.relationship_type,
      status: 'active', // Auto-approve when owner creates
      approved_at: new Date().toISOString(),
      payment_terms: data.payment_terms || 'net_30',
      internal_notes: data.internal_notes,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating partnership:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

// Update partnership status
export async function updatePartnershipStatus(
  id: string,
  ownerId: string,
  status: 'active' | 'paused' | 'terminated',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'paused') {
    updateData.paused_at = new Date().toISOString();
    updateData.paused_reason = reason;
  } else if (status === 'terminated') {
    updateData.terminated_at = new Date().toISOString();
    updateData.terminated_reason = reason;
  } else if (status === 'active') {
    updateData.approved_at = new Date().toISOString();
    updateData.paused_at = null;
    updateData.paused_reason = null;
  }

  const { error } = await supabase
    .from('company_partnerships')
    .update(updateData)
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error updating partnership:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Update partnership payment terms
export async function updatePartnershipTerms(
  id: string,
  ownerId: string,
  data: {
    payment_terms?: string;
    internal_notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('company_partnerships')
    .update({
      payment_terms: data.payment_terms,
      internal_notes: data.internal_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error updating partnership terms:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get invitations
export async function getInvitations(ownerId: string): Promise<PartnershipInvitation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partnership_invitations')
    .select(`
      *,
      from_company:companies!partnership_invitations_from_company_id_fkey(id, name),
      to_company:companies!partnership_invitations_to_company_id_fkey(id, name)
    `)
    .eq('from_owner_id', ownerId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data || [];
}

// Create invitation
export async function createInvitation(
  ownerId: string,
  data: {
    from_company_id: string;
    to_company_id?: string;
    to_email?: string;
    to_company_name?: string;
    relationship_type: string;
    message?: string;
  }
): Promise<{ success: boolean; id?: string; token?: string; error?: string }> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('partnership_invitations')
    .insert({
      from_company_id: data.from_company_id,
      from_owner_id: ownerId,
      to_company_id: data.to_company_id,
      to_email: data.to_email,
      to_company_name: data.to_company_name,
      relationship_type: data.relationship_type,
      message: data.message,
      status: 'pending',
    })
    .select('id, invitation_token')
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id, token: result.invitation_token };
}

// Cancel invitation
export async function cancelInvitation(
  id: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('partnership_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('from_owner_id', ownerId);

  if (error) {
    console.error('Error cancelling invitation:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Delete partnership (soft delete by terminating)
export async function deletePartnership(
  id: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  return updatePartnershipStatus(id, ownerId, 'terminated', 'Deleted by owner');
}

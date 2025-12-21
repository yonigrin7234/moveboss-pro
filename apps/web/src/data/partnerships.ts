import { createClient } from '@/lib/supabase-server';
import { sendPartnershipInvitationEmail } from '@/lib/email/notifications';
import { logAuditEvent } from '@/lib/audit';

export interface PartnerCompany {
  id: string;
  name: string;
  is_broker: boolean;
  is_agent: boolean;
  is_carrier: boolean;
  is_workspace_company: boolean;
  mc_number: string | null;
  dot_number: string | null;
  compliance_status: string;
  city: string | null;
  state: string | null;
  // FMCSA verification fields
  fmcsa_verified?: boolean;
  fmcsa_verified_at?: string | null;
  fmcsa_last_checked?: string | null;
  fmcsa_legal_name?: string | null;
  fmcsa_dba_name?: string | null;
  fmcsa_status_code?: string | null;
  fmcsa_allowed_to_operate?: boolean;
  fmcsa_common_authority?: string | null;
  fmcsa_contract_authority?: string | null;
  fmcsa_broker_authority?: string | null;
  fmcsa_bipd_insurance_on_file?: number | null;
  fmcsa_total_drivers?: number | null;
  fmcsa_total_power_units?: number | null;
  fmcsa_operation_type?: string | null;
  fmcsa_hhg_authorized?: boolean;
  fmcsa_cargo_carried?: Array<{ cargoCarriedId: number; cargoCarriedDesc: string }>;
}

/**
 * Check if a company is a real MoveBoss member (has their own workspace)
 * vs. a manually-added external company record.
 */
export function isMoveBossMemberCompany(company: PartnerCompany | null | undefined): boolean {
  return company?.is_workspace_company === true;
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
        id, name, is_broker, is_agent, is_carrier, is_workspace_company, mc_number, dot_number, compliance_status, city, state
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_broker, is_agent, is_carrier, is_workspace_company, mc_number, dot_number, compliance_status, city, state
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
        id, name, is_broker, is_agent, is_carrier, is_workspace_company, mc_number, dot_number, compliance_status, city, state
      ),
      company_b:companies!company_partnerships_company_b_id_fkey(
        id, name, is_broker, is_agent, is_carrier, is_workspace_company, mc_number, dot_number, compliance_status, city, state
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

  // Log audit event
  await logAuditEvent(supabase, {
    entityType: 'partnership',
    entityId: result.id,
    action: 'partnership_created',
    performedByUserId: ownerId,
    newValue: {
      company_a_id: data.company_a_id,
      company_b_id: data.company_b_id,
      relationship_type: data.relationship_type,
      status: 'active',
    },
    metadata: {
      relationship_type: data.relationship_type,
      payment_terms: data.payment_terms || 'net_30',
    },
  });

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

  // Fetch current state for audit log
  const { data: currentData } = await supabase
    .from('company_partnerships')
    .select('status')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();

  const previousStatus = currentData?.status;

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

  // Log audit event
  const action = status === 'active' ? 'partnership_upgraded' : 'partnership_deactivated';
  await logAuditEvent(supabase, {
    entityType: 'partnership',
    entityId: id,
    action,
    performedByUserId: ownerId,
    previousValue: { status: previousStatus },
    newValue: { status, reason: reason || null },
    metadata: {
      previous_status: previousStatus,
      new_status: status,
      reason: reason || null,
    },
  });

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

  // Fetch current state for audit log
  const { data: currentData } = await supabase
    .from('company_partnerships')
    .select('payment_terms, internal_notes')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();

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

  // Log audit event
  await logAuditEvent(supabase, {
    entityType: 'partnership',
    entityId: id,
    action: 'updated',
    performedByUserId: ownerId,
    previousValue: {
      payment_terms: currentData?.payment_terms,
      internal_notes: currentData?.internal_notes,
    },
    newValue: {
      payment_terms: data.payment_terms,
      internal_notes: data.internal_notes,
    },
  });

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

  // Send invitation email if we have an email address
  if (data.to_email && result.invitation_token) {
    const emailResult = await sendPartnershipInvitationEmail({
      toEmail: data.to_email,
      toCompanyName: data.to_company_name,
      fromCompanyId: data.from_company_id,
      fromOwnerId: ownerId,
      relationshipType: data.relationship_type,
      message: data.message,
      invitationToken: result.invitation_token,
    });

    if (!emailResult.success) {
      console.error('Error sending invitation email:', emailResult.error);
      // We still return success since the invitation was created
      // The email error is logged but doesn't fail the whole operation
    }
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

// Get invitation by token (for accepting)
export async function getInvitationByToken(token: string): Promise<{
  invitation: (PartnershipInvitation & { from_company: { id: string; name: string } }) | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partnership_invitations')
    .select(
      `
      *,
      from_company:companies!partnership_invitations_from_company_id_fkey(id, name)
    `
    )
    .eq('invitation_token', token)
    .single();

  if (error) {
    console.error('Error fetching invitation:', error);
    return { invitation: null, error: 'Invitation not found' };
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return { invitation: null, error: 'This invitation has expired' };
  }

  // Check status
  if (data.status !== 'pending') {
    return { invitation: null, error: `This invitation has already been ${data.status}` };
  }

  return { invitation: data };
}

// Accept partnership invitation
export async function acceptPartnershipInvitation(
  token: string,
  acceptingUserId: string,
  acceptingCompanyId: string
): Promise<{ success: boolean; partnershipId?: string; error?: string }> {
  const supabase = await createClient();

  // Get invitation
  const { invitation, error: fetchError } = await getInvitationByToken(token);

  if (!invitation || fetchError) {
    return { success: false, error: fetchError || 'Invitation not found' };
  }

  // Create the partnership
  const { data: partnership, error: partnershipError } = await supabase
    .from('company_partnerships')
    .insert({
      owner_id: acceptingUserId,
      company_a_id: invitation.from_company_id,
      company_b_id: acceptingCompanyId,
      initiated_by_id: invitation.from_company_id,
      relationship_type: invitation.relationship_type,
      status: 'active',
      approved_at: new Date().toISOString(),
      payment_terms: 'net_30',
    })
    .select('id')
    .single();

  if (partnershipError) {
    console.error('Error creating partnership:', partnershipError);
    return { success: false, error: 'Failed to create partnership' };
  }

  // Also create a reverse partnership for the inviting company
  await supabase.from('company_partnerships').insert({
    owner_id: invitation.from_owner_id,
    company_a_id: invitation.from_company_id,
    company_b_id: acceptingCompanyId,
    initiated_by_id: invitation.from_company_id,
    relationship_type: invitation.relationship_type,
    status: 'active',
    approved_at: new Date().toISOString(),
    payment_terms: 'net_30',
  });

  // Update invitation status
  await supabase
    .from('partnership_invitations')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      to_company_id: acceptingCompanyId,
    })
    .eq('id', invitation.id);

  // Log audit event for the accepting user's partnership
  await logAuditEvent(supabase, {
    entityType: 'partnership',
    entityId: partnership.id,
    action: 'partnership_created',
    performedByUserId: acceptingUserId,
    newValue: {
      company_a_id: invitation.from_company_id,
      company_b_id: acceptingCompanyId,
      relationship_type: invitation.relationship_type,
      status: 'active',
    },
    metadata: {
      relationship_type: invitation.relationship_type,
      from_invitation: true,
      from_company_name: invitation.from_company?.name,
    },
  });

  return { success: true, partnershipId: partnership.id };
}

// Decline partnership invitation
export async function declinePartnershipInvitation(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { invitation, error: fetchError } = await getInvitationByToken(token);

  if (!invitation || fetchError) {
    return { success: false, error: fetchError || 'Invitation not found' };
  }

  const { error } = await supabase
    .from('partnership_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  if (error) {
    console.error('Error declining invitation:', error);
    return { success: false, error: 'Failed to decline invitation' };
  }

  return { success: true };
}

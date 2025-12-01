'use server';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getInvitationByToken } from '@/data/partnerships';

export async function acceptPartnershipAction(
  token: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabase = await createClient();

  // Get invitation
  const { invitation, error: fetchError } = await getInvitationByToken(token);

  if (!invitation || fetchError) {
    return { success: false, error: fetchError || 'Invitation not found' };
  }

  // Verify the company belongs to the user
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('owner_id', user.id)
    .single();

  if (!company) {
    return { success: false, error: 'Invalid company selection' };
  }

  // Prevent self-partnership (same company ID)
  if (companyId === invitation.from_company_id) {
    return { success: false, error: 'This invitation was sent from the same company you selected. You cannot create a partnership between a company and itself. Please select a different company or log into the account that should receive this invitation.' };
  }

  // Check if partnership already exists for this user
  const { data: existingPartnership } = await supabase
    .from('company_partnerships')
    .select('id')
    .eq('owner_id', user.id)
    .or(`and(company_a_id.eq.${invitation.from_company_id},company_b_id.eq.${companyId}),and(company_a_id.eq.${companyId},company_b_id.eq.${invitation.from_company_id})`)
    .maybeSingle();

  if (existingPartnership) {
    return { success: false, error: 'A partnership with this company already exists' };
  }

  // Create the partnership for the accepting user
  const { error: partnershipError } = await supabase.from('company_partnerships').insert({
    owner_id: user.id,
    company_a_id: invitation.from_company_id,
    company_b_id: companyId,
    initiated_by_id: invitation.from_company_id,
    relationship_type: invitation.relationship_type,
    status: 'active',
    approved_at: new Date().toISOString(),
    payment_terms: 'net_30',
  });

  if (partnershipError) {
    console.error('Error creating partnership:', partnershipError);
    return { success: false, error: 'Failed to create partnership' };
  }

  // Also create a reverse partnership for the inviting company
  await supabase.from('company_partnerships').insert({
    owner_id: invitation.from_owner_id,
    company_a_id: invitation.from_company_id,
    company_b_id: companyId,
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
      to_company_id: companyId,
    })
    .eq('id', invitation.id);

  return { success: true };
}

export async function declinePartnershipAction(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

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

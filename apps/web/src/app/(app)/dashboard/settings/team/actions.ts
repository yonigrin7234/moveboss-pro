'use server';

import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import type { PermissionKey, PermissionPreset } from '@/lib/permissions';

// Helper to get user's company - checks workspace company (owner) or membership (team member)
async function getUserCompanyId(userId: string): Promise<{ companyId: string | null; isAdmin: boolean }> {
  const supabase = await createClient();

  // First check if user owns a workspace company
  const { data: ownedCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .maybeSingle();

  if (ownedCompany) {
    // Company owners are always admins
    return { companyId: ownedCompany.id, isAdmin: true };
  }

  // Check company_memberships for team members
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (membership?.company_id) {
    // Check if user is admin via profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    return { companyId: membership.company_id, isAdmin: profile?.is_admin === true };
  }

  return { companyId: null, isAdmin: false };
}

export interface TeamMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  permission_preset: PermissionPreset | null;
  can_post_pickups: boolean;
  can_post_loads: boolean;
  can_manage_carrier_requests: boolean;
  can_manage_drivers: boolean;
  can_manage_vehicles: boolean;
  can_manage_trips: boolean;
  can_manage_loads: boolean;
  can_view_financials: boolean;
  can_manage_settlements: boolean;
  invited_at: string | null;
  invited_by: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  permission_preset: PermissionPreset | null;
  permissions: Record<PermissionKey, boolean>;
  expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

// Get team members for the current user's company
export async function getTeamMembers(): Promise<{ members: TeamMember[]; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { members: [], error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId } = await getUserCompanyId(user.id);

  if (!companyId) {
    return { members: [], error: 'No company found' };
  }

  // Get all team members via company_memberships
  const { data: memberships, error: membershipError } = await supabase
    .from('company_memberships')
    .select('user_id')
    .eq('company_id', companyId);

  if (membershipError) {
    return { members: [], error: membershipError.message };
  }

  const userIds = memberships?.map(m => m.user_id) || [];

  // Also include the company owner
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .single();

  if (company?.owner_id && !userIds.includes(company.owner_id)) {
    userIds.push(company.owner_id);
  }

  if (userIds.length === 0) {
    return { members: [] };
  }

  // Get profile details for all team members
  const { data: members, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      avatar_url,
      is_admin,
      permission_preset,
      can_post_pickups,
      can_post_loads,
      can_manage_carrier_requests,
      can_manage_drivers,
      can_manage_vehicles,
      can_manage_trips,
      can_manage_loads,
      can_view_financials,
      can_manage_settlements,
      invited_at,
      invited_by
    `)
    .in('id', userIds)
    .order('is_admin', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    return { members: [], error: error.message };
  }

  // Mark company owner as admin
  const membersWithOwnerFlag = (members || []).map(m => ({
    ...m,
    is_admin: m.id === company?.owner_id ? true : m.is_admin,
  }));

  return { members: membersWithOwnerFlag };
}

// Get pending invitations for the current user's company
export async function getPendingInvitations(): Promise<{ invitations: PendingInvitation[]; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { invitations: [], error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId) {
    return { invitations: [], error: 'No company found' };
  }

  if (!isAdmin) {
    return { invitations: [], error: 'Not authorized' };
  }

  const profile = { company_id: companyId };

  // Get pending invitations (not yet accepted, not expired)
  const { data: invitations, error } = await supabase
    .from('team_invitations')
    .select(`
      id,
      email,
      permission_preset,
      permissions,
      expires_at,
      created_at,
      invited_by
    `)
    .eq('company_id', profile.company_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { invitations: [], error: error.message };
  }

  // Get inviter names
  const inviterIds = [...new Set(invitations?.map(i => i.invited_by) || [])];
  const { data: inviters } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', inviterIds);

  const inviterMap = new Map(inviters?.map(i => [i.id, `${i.first_name || ''} ${i.last_name || ''}`.trim() || 'Unknown']) || []);

  return {
    invitations: (invitations || []).map(inv => ({
      ...inv,
      permissions: inv.permissions as Record<PermissionKey, boolean>,
      invited_by_name: inviterMap.get(inv.invited_by) || null,
    })),
  };
}

// Invite a new team member
export async function inviteTeamMember(
  email: string,
  preset: PermissionPreset,
  permissions: Record<PermissionKey, boolean>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId) {
    return { success: false, error: 'No company found' };
  }

  if (!isAdmin) {
    return { success: false, error: 'Only admins can invite team members' };
  }

  const profile = { company_id: companyId };

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('email', email.toLowerCase())
    .single();

  if (existingMember) {
    return { success: false, error: 'This person is already a team member' };
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingInvite) {
    return { success: false, error: 'An invitation has already been sent to this email' };
  }

  // Generate invitation token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  // Create invitation
  const { error: insertError } = await supabase
    .from('team_invitations')
    .insert({
      company_id: profile.company_id,
      email: email.toLowerCase(),
      invited_by: user.id,
      permission_preset: preset,
      permissions,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // TODO: Send invitation email with token link
  // For now, we'll just create the invitation record

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Update team member permissions
export async function updateMemberPermissions(
  memberId: string,
  preset: PermissionPreset,
  permissions: Record<PermissionKey, boolean>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId || !isAdmin) {
    return { success: false, error: 'Not authorized' };
  }

  // Make sure member belongs to same company (via membership or ownership)
  const { data: memberCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('owner_id', memberId)
    .maybeSingle();

  const { data: memberMembership } = await supabase
    .from('company_memberships')
    .select('company_id')
    .eq('user_id', memberId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!memberCompany && !memberMembership) {
    return { success: false, error: 'Member not found' };
  }

  // Don't allow demoting yourself if you're the company owner
  if (memberId === user.id) {
    const { data: company } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', companyId)
      .single();

    if (company?.owner_id === user.id) {
      return { success: false, error: 'Cannot change permissions for the company owner' };
    }
  }

  // Update member permissions
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      permission_preset: preset,
      is_admin: preset === 'admin',
      can_post_pickups: permissions.can_post_pickups,
      can_post_loads: permissions.can_post_loads,
      can_manage_carrier_requests: permissions.can_manage_carrier_requests,
      can_manage_drivers: permissions.can_manage_drivers,
      can_manage_vehicles: permissions.can_manage_vehicles,
      can_manage_trips: permissions.can_manage_trips,
      can_manage_loads: permissions.can_manage_loads,
      can_view_financials: permissions.can_view_financials,
      can_manage_settlements: permissions.can_manage_settlements,
    })
    .eq('id', memberId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Remove team member
export async function removeTeamMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId || !isAdmin) {
    return { success: false, error: 'Not authorized' };
  }

  // Can't remove yourself
  if (memberId === user.id) {
    return { success: false, error: 'Cannot remove yourself from the team' };
  }

  // Can't remove the company owner
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .single();

  if (company?.owner_id === memberId) {
    return { success: false, error: 'Cannot remove the company owner' };
  }

  // Make sure member belongs to same company (via membership)
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('user_id', memberId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!membership) {
    return { success: false, error: 'Member not found' };
  }

  // Remove membership
  const { error: deleteError } = await supabase
    .from('company_memberships')
    .delete()
    .eq('user_id', memberId)
    .eq('company_id', companyId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Reset profile permissions
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_admin: false,
      permission_preset: null,
      can_post_pickups: false,
      can_post_loads: false,
      can_manage_carrier_requests: false,
      can_manage_drivers: false,
      can_manage_vehicles: false,
      can_manage_trips: false,
      can_manage_loads: false,
      can_view_financials: false,
      can_manage_settlements: false,
    })
    .eq('id', memberId);

  if (updateError) {
    console.error('Error resetting profile permissions:', updateError);
    // Don't fail - membership was already removed
  }

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Cancel pending invitation
export async function cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId || !isAdmin) {
    return { success: false, error: 'Not authorized' };
  }

  // Delete invitation
  const { error: deleteError } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('company_id', companyId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Resend invitation
export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's company using workspace company model
  const { companyId, isAdmin } = await getUserCompanyId(user.id);

  if (!companyId || !isAdmin) {
    return { success: false, error: 'Not authorized' };
  }

  // Generate new token and extend expiration
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({
      token,
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', invitationId)
    .eq('company_id', companyId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // TODO: Resend invitation email

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Get invitation by token (for accept page)
export async function getInvitationByToken(token: string): Promise<{
  invitation: {
    id: string;
    email: string;
    company_name: string;
    permission_preset: PermissionPreset | null;
    expires_at: string;
  } | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select(`
      id,
      email,
      permission_preset,
      expires_at,
      company_id,
      companies!inner(name)
    `)
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !invitation) {
    return { invitation: null, error: 'Invitation not found or expired' };
  }

  // companies is a single object when using !inner join with .single()
  const companies = invitation.companies as unknown as { name: string } | null;

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email,
      company_name: companies?.name || 'Unknown Company',
      permission_preset: invitation.permission_preset as PermissionPreset | null,
      expires_at: invitation.expires_at,
    },
  };
}

// Accept invitation
export async function acceptInvitation(token: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Please sign in to accept the invitation' };
  }

  // Get the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    return { success: false, error: 'Invitation not found or expired' };
  }

  // Check email matches
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return { success: false, error: 'This invitation was sent to a different email address' };
  }

  // Check if user already belongs to a company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profile?.company_id) {
    return { success: false, error: 'You already belong to a company' };
  }

  const permissions = invitation.permissions as Record<PermissionKey, boolean>;

  // Update profile with company and permissions
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      company_id: invitation.company_id,
      permission_preset: invitation.permission_preset,
      is_admin: invitation.permission_preset === 'admin',
      can_post_pickups: permissions.can_post_pickups || false,
      can_post_loads: permissions.can_post_loads || false,
      can_manage_carrier_requests: permissions.can_manage_carrier_requests || false,
      can_manage_drivers: permissions.can_manage_drivers || false,
      can_manage_vehicles: permissions.can_manage_vehicles || false,
      can_manage_trips: permissions.can_manage_trips || false,
      can_manage_loads: permissions.can_manage_loads || false,
      can_view_financials: permissions.can_view_financials || false,
      can_manage_settlements: permissions.can_manage_settlements || false,
      invited_by: invitation.invited_by,
      invited_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Mark invitation as accepted
  await supabase
    .from('team_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  revalidatePath('/dashboard/settings/team');
  return { success: true };
}

// Check if current user is admin
export async function checkIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) return false;

  const { isAdmin } = await getUserCompanyId(user.id);
  return isAdmin;
}

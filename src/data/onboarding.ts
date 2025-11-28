import { createClient } from '@/lib/supabase-server';

export type UserRole = 'company' | 'carrier' | 'owner_operator' | 'driver';

export interface OnboardingState {
  role: UserRole | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_data: Record<string, unknown>;
}

// ============================================
// GET ONBOARDING STATE
// ============================================

export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('role, onboarding_completed, onboarding_step, onboarding_data')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    role: data.role as UserRole | null,
    onboarding_completed: data.onboarding_completed ?? false,
    onboarding_step: data.onboarding_step ?? 0,
    onboarding_data: (data.onboarding_data as Record<string, unknown>) ?? {},
  };
}

// ============================================
// SET USER ROLE
// ============================================

export async function setUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First check if profile exists
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (selectError || !existingProfile) {
    // Profile doesn't exist, create it first
    const { data: user } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email: user?.user?.email || null,
      full_name: user?.user?.user_metadata?.full_name || user?.user?.user_metadata?.name || '',
      role,
      onboarding_step: 1,
      onboarding_completed: false,
    });

    if (insertError) {
      console.error('setUserRole insert error:', insertError);
      return { success: false, error: insertError.message };
    }
    return { success: true };
  }

  // Profile exists, update it
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      role,
      onboarding_step: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('setUserRole update error:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

// ============================================
// UPDATE ONBOARDING PROGRESS
// ============================================

export async function updateOnboardingStep(
  userId: string,
  step: number,
  data?: Record<string, unknown>
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    onboarding_step: step,
    updated_at: new Date().toISOString(),
  };

  if (data) {
    // Merge with existing onboarding data
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_data')
      .eq('id', userId)
      .single();

    updates.onboarding_data = {
      ...((profile?.onboarding_data as Record<string, unknown>) || {}),
      ...data,
    };
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

  return !error;
}

// ============================================
// COMPLETE ONBOARDING
// ============================================

export async function completeOnboarding(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return !error;
}

// ============================================
// CREATE COMPANY (FOR COMPANY/CARRIER/OWNER-OPERATOR)
// ============================================

export interface CreateCompanyData {
  name: string;
  dot_number?: string;
  mc_number?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  is_carrier: boolean;
  is_broker: boolean;
}

export async function createCompanyForUser(
  userId: string,
  data: CreateCompanyData
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  const supabase = await createClient();

  // Determine company_type and relationship_role based on is_carrier/is_broker flags
  let companyType: 'customer' | 'carrier' | 'both' = 'customer';
  let relationshipRole: 'takes_loads_from' | 'gives_loads_to' | 'both' = 'both';

  if (data.is_carrier && data.is_broker) {
    companyType = 'both';
    relationshipRole = 'both';
  } else if (data.is_carrier) {
    companyType = 'carrier';
    relationshipRole = 'takes_loads_from'; // Carriers take loads from companies
  } else {
    companyType = 'customer';
    relationshipRole = 'gives_loads_to'; // Companies/brokers give loads to carriers
  }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      owner_id: userId,
      name: data.name,
      company_type: companyType,
      relationship_role: relationshipRole,
      dot_number: data.dot_number || null,
      mc_number: data.mc_number || null,
      phone: data.phone || null,
      email: data.email || null,
      street: data.street || null,
      city: data.city || null,
      state: data.state || null,
      postal_code: data.postal_code || null,
      is_carrier: data.is_carrier,
      is_broker: data.is_broker,
      is_workspace_company: true,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, companyId: company.id };
}

// ============================================
// CREATE DRIVER PROFILE (FOR OWNER-OPERATOR OR DRIVER)
// ============================================

export interface CreateDriverData {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  license_state?: string;
  license_expiration?: string;
  company_id?: string; // The company this driver works for
}

export async function createDriverProfile(
  ownerId: string,
  data: CreateDriverData
): Promise<{ success: boolean; driverId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: driver, error } = await supabase
    .from('drivers')
    .insert({
      owner_id: ownerId,
      company_id: data.company_id || null,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      email: data.email || null,
      license_number: data.license_number || null,
      license_state: data.license_state || null,
      license_expiration: data.license_expiration || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, driverId: driver.id };
}

// ============================================
// CREATE TRUCK (FOR CARRIER/OWNER-OPERATOR)
// ============================================

export interface CreateTruckData {
  unit_number: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  plate_number?: string;
  plate_state?: string;
  cubic_capacity?: number;
}

export async function createTruck(
  ownerId: string,
  data: CreateTruckData
): Promise<{ success: boolean; truckId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: truck, error } = await supabase
    .from('trucks')
    .insert({
      owner_id: ownerId,
      unit_number: data.unit_number,
      year: data.year || null,
      make: data.make || null,
      model: data.model || null,
      vin: data.vin || null,
      plate_number: data.plate_number || null,
      plate_state: data.plate_state || null,
      cubic_capacity: data.cubic_capacity || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, truckId: truck.id };
}

// ============================================
// DRIVER INVITE CODES
// ============================================

export async function createInviteCode(
  carrierId: string,
  createdBy: string,
  maxUses: number = 1,
  expiresInDays?: number
): Promise<{ success: boolean; code?: string; error?: string }> {
  const supabase = await createClient();

  // Generate unique code
  const { data: codeData } = await supabase.rpc('generate_invite_code');
  const code =
    (codeData as string) ||
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from('driver_invite_codes').insert({
    carrier_id: carrierId,
    code,
    created_by: createdBy,
    expires_at: expiresAt,
    max_uses: maxUses,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, code };
}

export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; carrierId?: string; carrierName?: string; error?: string }> {
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from('driver_invite_codes')
    .select(
      `
      id,
      carrier_id,
      max_uses,
      uses,
      expires_at,
      is_active,
      carrier:companies(name)
    `
    )
    .eq('code', code.toUpperCase())
    .single();

  if (error || !invite) {
    return { valid: false, error: 'Invalid invite code' };
  }

  if (!invite.is_active) {
    return { valid: false, error: 'This invite code is no longer active' };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: 'This invite code has expired' };
  }

  if (invite.max_uses && invite.uses >= invite.max_uses) {
    return { valid: false, error: 'This invite code has reached its maximum uses' };
  }

  // Handle carrier data (could be array due to Supabase join)
  const carrierData = invite.carrier;
  const carrier = Array.isArray(carrierData) ? carrierData[0] : carrierData;

  return {
    valid: true,
    carrierId: invite.carrier_id,
    carrierName: carrier?.name,
  };
}

export async function useInviteCode(code: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('increment_invite_uses', {
    invite_code: code.toUpperCase(),
  });

  return !error;
}

// ============================================
// GET DASHBOARD ROUTE FOR ROLE
// ============================================

export function getDashboardRouteForRole(role: UserRole): string {
  switch (role) {
    case 'company':
      return '/dashboard'; // Company owners use main dashboard
    case 'carrier':
      return '/dashboard';
    case 'owner_operator':
      return '/dashboard';
    case 'driver':
      return '/driver';
    default:
      return '/onboarding';
  }
}

// ============================================
// GET USER'S COMPANY
// ============================================

export async function getUserCompany(
  userId: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .eq('owner_id', userId)
    .single();

  return data;
}

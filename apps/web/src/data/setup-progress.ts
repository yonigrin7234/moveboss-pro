import { createClient } from '@/lib/supabase-server';

// ============================================
// TYPES
// ============================================

export interface SetupProgress {
  id: string;
  company_id: string;
  first_driver_added: boolean;
  first_vehicle_added: boolean;
  first_partner_added: boolean;
  first_load_created: boolean;
  compliance_verified: boolean;
  first_driver_added_at: string | null;
  first_vehicle_added_at: string | null;
  first_partner_added_at: string | null;
  first_load_created_at: string | null;
  compliance_verified_at: string | null;
  checklist_dismissed: boolean;
  checklist_dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupCounts {
  drivers: number;
  vehicles: number;
  partners: number;
  loads: number;
}

export type SetupProgressField =
  | 'first_driver_added'
  | 'first_vehicle_added'
  | 'first_partner_added'
  | 'first_load_created'
  | 'compliance_verified'
  | 'checklist_dismissed';

// ============================================
// GET USER'S COMPANY ID
// ============================================

export async function getUserCompanyId(userId: string): Promise<string | null> {
  const supabase = await createClient();

  // First try to get company where user is owner
  const { data: ownedCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_workspace_company', true)
    .single();

  if (ownedCompany) {
    return ownedCompany.id;
  }

  // Then try company memberships
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single();

  return membership?.company_id || null;
}

// ============================================
// GET SETUP PROGRESS
// ============================================

export async function getSetupProgress(
  userId: string
): Promise<{ progress: SetupProgress | null; counts: SetupCounts; error?: string }> {
  const supabase = await createClient();

  // Get user's company
  const companyId = await getUserCompanyId(userId);

  if (!companyId) {
    return {
      progress: null,
      counts: { drivers: 0, vehicles: 0, partners: 0, loads: 0 },
      error: 'No company found',
    };
  }

  // Get or create setup progress
  let { data: progress, error } = await supabase
    .from('setup_progress')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (!progress && !error) {
    // Create if doesn't exist
    const { data: newProgress, error: createError } = await supabase
      .from('setup_progress')
      .insert({ company_id: companyId })
      .select()
      .single();

    if (createError) {
      return {
        progress: null,
        counts: { drivers: 0, vehicles: 0, partners: 0, loads: 0 },
        error: createError.message,
      };
    }
    progress = newProgress;
  }

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned"
    return {
      progress: null,
      counts: { drivers: 0, vehicles: 0, partners: 0, loads: 0 },
      error: error.message,
    };
  }

  // If still no progress (row not found), create it
  if (!progress) {
    const { data: newProgress, error: createError } = await supabase
      .from('setup_progress')
      .insert({ company_id: companyId })
      .select()
      .single();

    if (createError) {
      return {
        progress: null,
        counts: { drivers: 0, vehicles: 0, partners: 0, loads: 0 },
        error: createError.message,
      };
    }
    progress = newProgress;
  }

  // Fetch actual counts to verify progress
  const [driversResult, vehiclesResult, partnersResult, loadsResult] = await Promise.all([
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('trucks').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('partnerships').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('loads').select('id', { count: 'exact', head: true }).eq('posted_by_company_id', companyId),
  ]);

  const counts: SetupCounts = {
    drivers: driversResult.count || 0,
    vehicles: vehiclesResult.count || 0,
    partners: partnersResult.count || 0,
    loads: loadsResult.count || 0,
  };

  // Auto-update progress based on actual data
  const updates: Partial<SetupProgress> = {};
  const now = new Date().toISOString();

  if (counts.drivers > 0 && !progress.first_driver_added) {
    updates.first_driver_added = true;
    updates.first_driver_added_at = now;
  }
  if (counts.vehicles > 0 && !progress.first_vehicle_added) {
    updates.first_vehicle_added = true;
    updates.first_vehicle_added_at = now;
  }
  if (counts.partners > 0 && !progress.first_partner_added) {
    updates.first_partner_added = true;
    updates.first_partner_added_at = now;
  }
  if (counts.loads > 0 && !progress.first_load_created) {
    updates.first_load_created = true;
    updates.first_load_created_at = now;
  }

  if (Object.keys(updates).length > 0) {
    const { data: updatedProgress } = await supabase
      .from('setup_progress')
      .update({ ...updates, updated_at: now })
      .eq('company_id', companyId)
      .select()
      .single();

    if (updatedProgress) {
      progress = updatedProgress;
    }
  }

  return { progress: progress as SetupProgress, counts };
}

// ============================================
// UPDATE SETUP PROGRESS
// ============================================

export async function updateSetupProgress(
  userId: string,
  field: SetupProgressField,
  value: boolean
): Promise<{ progress: SetupProgress | null; error?: string }> {
  const supabase = await createClient();

  const allowedFields: SetupProgressField[] = [
    'first_driver_added',
    'first_vehicle_added',
    'first_partner_added',
    'first_load_created',
    'compliance_verified',
    'checklist_dismissed',
  ];

  if (!allowedFields.includes(field)) {
    return { progress: null, error: 'Invalid field' };
  }

  const companyId = await getUserCompanyId(userId);

  if (!companyId) {
    return { progress: null, error: 'No company found' };
  }

  const now = new Date().toISOString();
  const timestampField = `${field}_at` as keyof SetupProgress;

  const updates: Record<string, unknown> = {
    [field]: value,
    [timestampField]: value ? now : null,
    updated_at: now,
  };

  const { data: progress, error } = await supabase
    .from('setup_progress')
    .update(updates)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) {
    return { progress: null, error: error.message };
  }

  return { progress: progress as SetupProgress };
}

// ============================================
// MARK SETUP ITEM COMPLETE (HELPER)
// ============================================

export async function markSetupItemComplete(
  userId: string,
  field: Exclude<SetupProgressField, 'checklist_dismissed'>
): Promise<boolean> {
  const result = await updateSetupProgress(userId, field, true);
  return !result.error;
}

// ============================================
// DISMISS CHECKLIST
// ============================================

export async function dismissSetupChecklist(userId: string): Promise<boolean> {
  const result = await updateSetupProgress(userId, 'checklist_dismissed', true);
  return !result.error;
}

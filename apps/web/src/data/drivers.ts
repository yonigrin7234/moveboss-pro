import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { normalizePhoneToE164 } from '@/lib/utils';
import {
  driverStatusSchema,
  driverPayModeSchema,
  newDriverInputSchema,
  updateDriverInputSchema,
  type DriverStatus,
  type DriverPayMode,
  type NewDriverInput,
  type UpdateDriverInput,
  formatPayMode,
  driverLoginMethodSchema,
  type DriverLoginMethod,
} from '@/data/driver-shared';
import { type DriverType } from '@/data/domain-types';

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getSessionAndDbClients() {
  const sessionClient = await createClient();
  const dbClient = hasServiceRoleKey ? createServiceRoleClient() : sessionClient;
  return { sessionClient, dbClient };
}

async function getDbClient() {
  return hasServiceRoleKey ? createServiceRoleClient() : await createClient();
}

function validatePasswordStrength(password: string) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

async function createAuthUserForDriver(params: {
  login_method: DriverLoginMethod;
  email?: string | null;
  phone?: string | null;
  password: string;
}): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  console.log('CREATE_AUTH_USER_FOR_DRIVER_DEBUG', {
    email: params.email,
    phone: params.phone,
    login_method: params.login_method,
    usingServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });

  if (!hasServiceRoleKey) {
    return { success: false, error: 'Service role key is required to create driver login users.' };
  }

  try {
    const admin = createServiceRoleClient();
    validatePasswordStrength(params.password);

    if (params.login_method === 'email') {
      if (!params.email) {
        return { success: false, error: 'Email is required for email login.' };
      }
      const { data, error } = await admin.auth.admin.createUser({
        email: params.email,
        password: params.password,
        email_confirm: true,
        user_metadata: { role: 'driver' },
      });
      if (error || !data?.user) {
        return { success: false, error: `Failed to create auth user (email): ${error?.message || 'unknown error'}` };
      }
      return { success: true, userId: data.user.id };
    }

    if (!params.phone) {
      return { success: false, error: 'Phone is required for phone login.' };
    }
    // Normalize phone to E.164 format for Supabase
    const normalizedPhone = normalizePhoneToE164(params.phone);
    const { data, error } = await admin.auth.admin.createUser({
      phone: normalizedPhone,
      password: params.password,
      phone_confirm: true,
      user_metadata: { role: 'driver' },
    });
    if (error || !data?.user) {
      return { success: false, error: `Failed to create auth user (phone): ${error?.message || 'unknown error'}` };
    }
    return { success: true, userId: data.user.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error creating auth user';
    return { success: false, error: errorMessage };
  }
}

async function updateAuthUserContact(authUserId: string, fields: { email?: string | null; phone?: string | null }) {
  if (!hasServiceRoleKey) return;
  const admin = createServiceRoleClient();
  const update: Record<string, any> = {};
  if (fields.email !== undefined) update.email = fields.email || undefined;
  if (fields.phone !== undefined) {
    // Normalize phone to E.164 format for Supabase
    update.phone = fields.phone ? normalizePhoneToE164(fields.phone) : undefined;
  }
  if (Object.keys(update).length === 0) return;
  const { error } = await admin.auth.admin.updateUserById(authUserId, update);
  if (error) {
    throw new Error(`Failed to update auth user contact: ${error.message}`);
  }
}

export interface Driver {
  id: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  start_date: string | null;
  has_login: boolean;
  auth_user_id: string | null;
  login_method?: 'email' | 'phone' | null;
  license_number: string;
  license_state: string | null;
  license_expiry: string;
  medical_card_expiry: string;
  status: DriverStatus;
  archived_at: string | null;
  driver_type: DriverType;
  company_id: string | null;
  leased_to_company_id: string | null;
  assigned_truck_id: string | null;
  assigned_trailer_id: string | null;
  // Default equipment (for auto-populating trips)
  default_truck_id: string | null;
  default_trailer_id: string | null;
  // Compensation fields
  pay_mode: DriverPayMode;
  rate_per_mile: number | null;
  rate_per_cuft: number | null;
  percent_of_revenue: number | null;
  flat_daily_rate: number | null;
  pay_notes: string | null;
  notes: string | null;
  // Location & capacity settings
  location_sharing_enabled: boolean;
  auto_post_capacity: boolean;
  capacity_visibility: 'private' | 'partners_only' | 'public';
}

// Filter interface
export interface DriverFilters {
  search?: string;
  status?: DriverStatus | 'all';
  companyId?: string;
}

export { formatPayMode, driverPayModeSchema, driverStatusSchema, newDriverInputSchema, updateDriverInputSchema };
export type { DriverStatus, DriverPayMode, DriverLoginMethod, NewDriverInput, UpdateDriverInput };

export async function getDriversForUser(
  userId: string,
  filters?: DriverFilters
): Promise<Driver[]> {
  const { sessionClient, dbClient } = await getSessionAndDbClients();
  
  // Debug: Verify auth session
  const { data: { user: authUser }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authUser) {
    console.warn(`[getDriversForUser] Auth check failed: ${authError?.message || 'No authenticated user'}. UserId provided: ${userId}`);
  } else if (authUser.id !== userId) {
    console.warn(`[getDriversForUser] User ID mismatch: auth.uid()=${authUser.id}, provided userId=${userId}`);
  }

  let query = dbClient.from('drivers').select('*').eq('owner_id', userId);

  if (filters?.companyId) {
    // Include legacy rows missing company_id but owned by the user
    query = query.or(`company_id.eq.${filters.companyId},company_id.is.null`);
  }

  // Apply filters
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`
    );
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  query = query.order('last_name', { ascending: true }).order('first_name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error(`[getDriversForUser] Query failed:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      userId,
      authUserId: authUser?.id,
    });
    throw new Error(`Failed to fetch drivers: ${error.message}`);
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[getDriversForUser] Found ${data?.length || 0} drivers for userId=${userId}, auth.uid()=${authUser?.id}, filters=`, filters);
  }

  return (data || []) as Driver[];
}

export async function getDriverById(id: string, userId: string, companyId?: string): Promise<Driver | null> {
  const supabase = await getDbClient();
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .eq(companyId ? 'company_id' : 'owner_id', companyId ?? userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch driver: ${error.message}`);
  }

  return data as Driver;
}

export async function getDriversCountForUser(userId: string): Promise<number> {
  const supabase = await getDbClient();
  const { count, error } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to count drivers: ${error.message}`);
  }

  return count || 0;
}

export async function getActiveDriversCountForUser(userId: string): Promise<number> {
  const supabase = await getDbClient();
  const { count, error } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to count active drivers: ${error.message}`);
  }

  return count || 0;
}

export async function getSuspendedDriversCountForUser(userId: string): Promise<number> {
  const supabase = await getDbClient();
  const { count, error } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'suspended');

  if (error) {
    throw new Error(`Failed to count suspended drivers: ${error.message}`);
  }

  return count || 0;
}

export async function getDriverStatsForUser(
  userId: string,
  companyId?: string
): Promise<{
  totalDrivers: number;
  activeDrivers: number;
  suspendedDrivers: number;
}> {
  if (!companyId) {
    const [totalDrivers, activeDrivers, suspendedDrivers] = await Promise.all([
      getDriversCountForUser(userId),
      getActiveDriversCountForUser(userId),
      getSuspendedDriversCountForUser(userId),
    ]);

    return {
      totalDrivers,
      activeDrivers,
      suspendedDrivers,
    };
  }

  const supabase = await getDbClient();
  const base = supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .or(`company_id.eq.${companyId},company_id.is.null`);

  const [{ count: totalDrivers }, { count: activeDrivers }, { count: suspendedDrivers }] = await Promise.all([
    base,
    supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('status', 'active'),
    supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('status', 'suspended'),
  ]);

  return {
    totalDrivers: totalDrivers || 0,
    activeDrivers: activeDrivers || 0,
    suspendedDrivers: suspendedDrivers || 0,
  };
}

export async function createDriver(
  input: NewDriverInput,
  userId: string,
  options?: {
    effectiveHasLogin?: boolean;
    login_method?: 'email' | 'phone';
    email?: string | null;
    phone?: string | null;
    password?: string | null;
  }
): Promise<Driver> {
  const { sessionClient, dbClient } = await getSessionAndDbClients();

  console.log('CREATE_OR_UPDATE_DRIVER_DEBUG', {
    effectiveHasLogin: options?.effectiveHasLogin,
    payload_has_login: input.has_login,
  });

  // Debug: Verify auth session
  const { data: { user: authUser }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authUser) {
    const errorMsg = `Auth check failed: ${authError?.message || 'No authenticated user'}. UserId provided: ${userId}`;
    console.error('[createDriver]', errorMsg);
    throw new Error(errorMsg);
  }
  if (authUser.id !== userId) {
    const errorMsg = `User ID mismatch: auth.uid()=${authUser.id}, provided userId=${userId}`;
    console.error('[createDriver]', errorMsg);
    throw new Error(errorMsg);
  }

  // Portal access provisioning
  const effectiveHasLogin = options?.effectiveHasLogin ?? false;
  const loginMethod = options?.login_method ?? input.login_method ?? 'email';
  let authUserId: string | null = null;

  // DRIVER DEFAULT EQUIPMENT VALIDATION
  // Validate truck/trailer compatibility for default equipment
  let finalDefaultTruckId = input.default_truck_id;
  let finalDefaultTrailerId = input.default_trailer_id;

  if (finalDefaultTruckId) {
    // Fetch the default truck's vehicle_type
    const { data: truckData } = await dbClient
      .from('trucks')
      .select('vehicle_type')
      .eq('id', finalDefaultTruckId)
      .eq('owner_id', userId)
      .single();

    if (!truckData) {
      throw new Error('Default truck not found or you do not own it.');
    }

    const vehicleType = truckData.vehicle_type;

    if (vehicleType && vehicleType !== 'tractor') {
      // Non-tractor (box truck): force default_trailer_id to null
      finalDefaultTrailerId = null;
    } else if (vehicleType === 'tractor' && !finalDefaultTrailerId) {
      // Tractor requires a default trailer
      throw new Error('Tractor defaults require a trailer. Please select a default trailer.');
    }
  } else {
    // No default truck means no default trailer either
    finalDefaultTrailerId = null;
  }

  // Insert driver first with has_login from input (which should already be validated)
  const insertPayload = {
    ...input,
    owner_id: userId,
    company_id: input.company_id ?? null,
    leased_to_company_id: input.leased_to_company_id ?? null,
    driver_type: input.driver_type ?? 'company_driver',
    login_method: loginMethod,
    has_login: input.has_login, // Use input.has_login directly (already validated)
    auth_user_id: null, // Will be set after auth user creation
    // Use validated default equipment values
    default_truck_id: finalDefaultTruckId ?? null,
    default_trailer_id: finalDefaultTrailerId ?? null,
  };

  const { data, error } = await dbClient
    .from('drivers')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[createDriver] Driver insert failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      insertPayload: { 
        ...insertPayload, 
        first_name: insertPayload.first_name?.substring(0, 10) + '...',
        owner_id: insertPayload.owner_id,
      },
    });
    throw new Error(`Failed to create driver: ${error.message}`);
  }

  if (!data) {
    throw new Error('Driver insert succeeded but no data returned. Check RLS policies.');
  }

  const driver = data as Driver;

  // Create auth user after driver is created (if needed)
  if (effectiveHasLogin) {
    if (!options?.password) {
      throw new Error('Driver portal password is required when enabling portal access.');
    }
    const email = options.email ?? input.email;
    const phone = options.phone ?? input.phone;
    if (loginMethod === 'email' && !email) {
      throw new Error('Email is required when enabling portal access with email login.');
    }
    if (loginMethod === 'phone' && !phone) {
      throw new Error('Phone is required when enabling portal access with phone login.');
    }
    
    const authResult = await createAuthUserForDriver({
      login_method: loginMethod as DriverLoginMethod,
      email,
      phone,
      password: options.password,
    });

    if (!authResult.success) {
      // Delete the driver row if auth user creation failed
      await dbClient.from('drivers').delete().eq('id', driver.id);
      throw new Error(authResult.error || 'Failed to create driver login user.');
    }

    // Update driver with auth_user_id
    const { error: updateError } = await dbClient
      .from('drivers')
      .update({ auth_user_id: authResult.userId })
      .eq('id', driver.id);

    if (updateError) {
      console.error('[createDriver] Failed to update driver with auth_user_id:', updateError);
      // Don't throw here - the driver exists, just without auth_user_id
    } else {
      driver.auth_user_id = authResult.userId;
    }
  }


  // Update equipment assignments if provided
  if (driver.assigned_truck_id) {
    await dbClient
      .from('trucks')
      .update({ assigned_driver_id: driver.id })
      .eq('id', driver.assigned_truck_id)
      .eq('owner_id', userId);
  }
  if (driver.assigned_trailer_id) {
    await dbClient
      .from('trailers')
      .update({ assigned_driver_id: driver.id })
      .eq('id', driver.assigned_trailer_id)
      .eq('owner_id', userId);
  }

  return driver;
}

export async function updateDriver(
  id: string,
  input: UpdateDriverInput,
  userId: string,
  companyId?: string,
  options?: {
    effectiveHasLogin?: boolean;
    login_method?: 'email' | 'phone';
    email?: string | null;
    phone?: string | null;
    password?: string | null;
    resetPassword?: boolean;
  }
): Promise<Driver> {
  const supabase = await getDbClient();

  console.log('CREATE_OR_UPDATE_DRIVER_DEBUG', {
    effectiveHasLogin: options?.effectiveHasLogin,
    payload_has_login: input.has_login,
  });

  // Fetch current driver to reconcile assignments
  const { data: existing, error: fetchError } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .eq(companyId ? 'company_id' : 'owner_id', companyId ?? userId)
    .single();
  if (fetchError) {
    throw new Error(`Failed to fetch driver: ${fetchError.message}`);
  }

  const loginMethod = options?.login_method ?? (input.login_method as DriverLoginMethod | undefined) ?? (existing as any).login_method ?? 'email';
  const effectiveHasLogin = options?.effectiveHasLogin ?? false;
  const existingHasLogin = (existing as any).has_login;
  const existingAuthUserId = (existing as any).auth_user_id as string | null;

  // DRIVER DEFAULT EQUIPMENT VALIDATION
  // Validate truck/trailer compatibility for default equipment
  let finalDefaultTruckId = 'default_truck_id' in input ? (input.default_truck_id ?? null) : (existing as any).default_truck_id;
  let finalDefaultTrailerId = 'default_trailer_id' in input ? (input.default_trailer_id ?? null) : (existing as any).default_trailer_id;

  if (finalDefaultTruckId) {
    // Fetch the default truck's vehicle_type
    const { data: truckData } = await supabase
      .from('trucks')
      .select('vehicle_type')
      .eq('id', finalDefaultTruckId)
      .eq('owner_id', userId)
      .single();

    if (!truckData) {
      throw new Error('Default truck not found or you do not own it.');
    }

    const vehicleType = truckData.vehicle_type;

    if (vehicleType && vehicleType !== 'tractor') {
      // Non-tractor (box truck): force default_trailer_id to null
      finalDefaultTrailerId = null;
    } else if (vehicleType === 'tractor' && !finalDefaultTrailerId) {
      // Tractor requires a default trailer
      throw new Error('Tractor defaults require a trailer. Please select a default trailer.');
    }
  } else {
    // No default truck means no default trailer either
    finalDefaultTrailerId = null;
  }

  // Build update payload
  const updatePayload: Record<string, any> = {
    ...input,
    login_method: loginMethod,
    has_login: input.has_login, // Use input.has_login directly (already validated)
    // Use validated default equipment values
    default_truck_id: finalDefaultTruckId,
    default_trailer_id: finalDefaultTrailerId,
    // EXPLICITLY include location settings (Zod partial() may strip these)
    location_sharing_enabled: input.location_sharing_enabled === true,
    auto_post_capacity: input.auto_post_capacity === true,
    capacity_visibility: input.capacity_visibility || 'private',
  };

  // Debug: Log location settings in update payload
  console.log('UPDATE_DRIVER_PAYLOAD_DEBUG', {
    input_location_sharing: input.location_sharing_enabled,
    input_auto_post: input.auto_post_capacity,
    input_capacity_visibility: input.capacity_visibility,
    payload_location_sharing: updatePayload.location_sharing_enabled,
    payload_auto_post: updatePayload.auto_post_capacity,
    payload_capacity_visibility: updatePayload.capacity_visibility,
    full_payload_keys: Object.keys(updatePayload),
    full_payload: JSON.stringify(updatePayload),
  });

  // Handle auth user creation/updates
  if (effectiveHasLogin && !existingAuthUserId) {
    // Creating new auth user
    if (!options?.password) {
      throw new Error('Driver portal password is required when enabling portal access.');
    }
    const email = options.email ?? input.email ?? (existing as any).email;
    const phone = options.phone ?? input.phone ?? (existing as any).phone;
    if (loginMethod === 'email' && !email) {
      throw new Error('Email is required to enable portal access.');
    }
    if (loginMethod === 'phone' && !phone) {
      throw new Error('Phone is required to enable portal access.');
    }
    
    const authResult = await createAuthUserForDriver({
      login_method: loginMethod as DriverLoginMethod,
      email,
      phone,
      password: options.password,
    });

    if (!authResult.success) {
      throw new Error(authResult.error || 'Failed to create driver login user.');
    }

    updatePayload.auth_user_id = authResult.userId;
    updatePayload.has_login = true;
  } else if (existingHasLogin && existingAuthUserId) {
    // Updating existing auth user
    updatePayload.has_login = effectiveHasLogin;
    // Sync contact info to auth user if provided
    if (input.email !== undefined || input.phone !== undefined) {
      await updateAuthUserContact(existingAuthUserId, { email: input.email, phone: input.phone });
    }
    if (options?.resetPassword) {
      if (!options.password) {
        throw new Error('New portal password is required to reset.');
      }
      validatePasswordStrength(options.password);
      const admin = createServiceRoleClient();
      const { error: pwError } = await admin.auth.admin.updateUserById(existingAuthUserId, {
        password: options.password,
      });
      if (pwError) {
        throw new Error(`Failed to reset driver portal password: ${pwError.message}`);
      }
    }
  } else if (effectiveHasLogin && existingAuthUserId && !existingHasLogin) {
    // Re-enabling access for an existing auth user
    updatePayload.has_login = true;
    if (options?.password) {
      validatePasswordStrength(options.password);
      const admin = createServiceRoleClient();
      const { error: pwError } = await admin.auth.admin.updateUserById(existingAuthUserId, {
        password: options.password,
      });
      if (pwError) {
        throw new Error(`Failed to reset driver portal password: ${pwError.message}`);
      }
    }
  } else {
    // Disabling portal access or no change
    updatePayload.has_login = effectiveHasLogin;
  }

  // DEBUG: Log right before Supabase update
  console.log('SUPABASE_UPDATE_CALL', {
    table: 'drivers',
    id,
    companyId,
    userId,
    filter_column: companyId ? 'company_id' : 'owner_id',
    filter_value: companyId ?? userId,
    payload_loc_sharing: updatePayload.location_sharing_enabled,
    payload_auto_post: updatePayload.auto_post_capacity,
  });

  const { data, error } = await supabase
    .from('drivers')
    .update(updatePayload)
    .eq('id', id)
    .eq(companyId ? 'company_id' : 'owner_id', companyId ?? userId)
    .select()
    .single();

  if (error) {
    console.error('UPDATE_DRIVER_ERROR', {
      error_message: error.message,
      error_code: error.code,
      error_details: error.details,
      error_hint: error.hint,
    });
    if (error.code === 'PGRST116') {
      throw new Error('Driver not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update driver: ${error.message}`);
  }

  const updated = data as Driver;

  // Debug: Log what was returned after update
  console.log('UPDATE_DRIVER_RESULT', {
    updated_location_sharing: (updated as any).location_sharing_enabled,
    updated_auto_post: (updated as any).auto_post_capacity,
    updated_capacity_visibility: (updated as any).capacity_visibility,
    raw_data: JSON.stringify(data),
  });

  // Clear previous truck/trailer assignments if changed
  if (existing?.assigned_truck_id && existing.assigned_truck_id !== updated.assigned_truck_id) {
    await supabase
      .from('trucks')
      .update({ assigned_driver_id: null })
      .eq('id', existing.assigned_truck_id)
      .eq('owner_id', userId);
  }
  if (existing?.assigned_trailer_id && existing.assigned_trailer_id !== updated.assigned_trailer_id) {
    await supabase
      .from('trailers')
      .update({ assigned_driver_id: null })
      .eq('id', existing.assigned_trailer_id)
      .eq('owner_id', userId);
  }

  // Apply new assignments
  if (updated.assigned_truck_id) {
    await supabase
      .from('trucks')
      .update({ assigned_driver_id: updated.id })
      .eq('id', updated.assigned_truck_id)
      .eq('owner_id', userId);
  }
  if (updated.assigned_trailer_id) {
    await supabase
      .from('trailers')
      .update({ assigned_driver_id: updated.id })
      .eq('id', updated.assigned_trailer_id)
      .eq('owner_id', userId);
  }

  return updated;
}

export async function deleteDriver(id: string, userId: string): Promise<void> {
  const supabase = await getDbClient();
  const { error } = await supabase.from('drivers').delete().eq('id', id).eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to delete driver: ${error.message}`);
  }
}

// ===========================================
// STATUS MANAGEMENT FUNCTIONS
// ===========================================

interface ActiveAssignment {
  hasActiveAssignment: boolean;
  tripId?: string;
  tripNumber?: string;
  loadId?: string;
  loadNumber?: string;
}

/**
 * Check if a driver is assigned to an active trip or load
 */
export async function checkDriverActiveAssignment(
  driverId: string,
  userId: string
): Promise<ActiveAssignment> {
  const supabase = await getDbClient();

  // Check for active trips (status not 'completed' or 'cancelled')
  const { data: activeTrip } = await supabase
    .from('trips')
    .select('id, trip_number')
    .eq('driver_id', driverId)
    .eq('owner_id', userId)
    .not('status', 'in', '("completed","cancelled")')
    .limit(1)
    .maybeSingle();

  if (activeTrip) {
    return {
      hasActiveAssignment: true,
      tripId: activeTrip.id,
      tripNumber: activeTrip.trip_number,
    };
  }

  // Check for active loads (assigned_driver_id and load not completed)
  const { data: activeLoad } = await supabase
    .from('loads')
    .select('id, load_number')
    .eq('assigned_driver_id', driverId)
    .eq('owner_id', userId)
    .not('load_status', 'in', '("delivered","cancelled")')
    .limit(1)
    .maybeSingle();

  if (activeLoad) {
    return {
      hasActiveAssignment: true,
      loadId: activeLoad.id,
      loadNumber: activeLoad.load_number,
    };
  }

  return { hasActiveAssignment: false };
}

/**
 * Deactivate a driver (set status to 'inactive')
 * Fails if driver is assigned to an active trip or load
 */
export async function deactivateDriver(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkDriverActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    const assignedTo = assignment.tripNumber
      ? `trip ${assignment.tripNumber}`
      : `load ${assignment.loadNumber || assignment.loadId}`;
    return {
      success: false,
      error: `Cannot deactivate driver: assigned to active ${assignedTo}`,
    };
  }

  const supabase = await getDbClient();
  const { error } = await supabase
    .from('drivers')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Archive a driver (soft delete)
 * Fails if driver is assigned to an active trip or load
 */
export async function archiveDriver(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkDriverActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    const assignedTo = assignment.tripNumber
      ? `trip ${assignment.tripNumber}`
      : `load ${assignment.loadNumber || assignment.loadId}`;
    return {
      success: false,
      error: `Cannot archive driver: assigned to active ${assignedTo}`,
    };
  }

  const supabase = await getDbClient();
  const { error } = await supabase
    .from('drivers')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      assigned_truck_id: null, // Clear equipment assignment
      assigned_trailer_id: null,
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a driver (set status to 'active')
 */
export async function reactivateDriver(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getDbClient();
  const { error } = await supabase
    .from('drivers')
    .update({
      status: 'active',
      archived_at: null,
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

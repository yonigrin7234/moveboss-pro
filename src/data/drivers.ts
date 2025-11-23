import { createClient } from '@/lib/supabase-server';
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
} from '@/data/driver-shared';
import { type DriverType } from '@/data/domain-types';

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
  license_number: string;
  license_state: string | null;
  license_expiry: string;
  medical_card_expiry: string;
  status: DriverStatus;
  driver_type: DriverType;
  company_id: string | null;
  leased_to_company_id: string | null;
  assigned_truck_id: string | null;
  assigned_trailer_id: string | null;
  // Compensation fields
  pay_mode: DriverPayMode;
  rate_per_mile: number | null;
  rate_per_cuft: number | null;
  percent_of_revenue: number | null;
  flat_daily_rate: number | null;
  pay_notes: string | null;
  notes: string | null;
}

// Filter interface
export interface DriverFilters {
  search?: string;
  status?: DriverStatus | 'all';
  companyId?: string;
}

export { formatPayMode, driverPayModeSchema, driverStatusSchema, newDriverInputSchema, updateDriverInputSchema };

export async function getDriversForUser(
  userId: string,
  filters?: DriverFilters
): Promise<Driver[]> {
  const supabase = await createClient();
  
  // Debug: Verify auth session
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    console.warn(`[getDriversForUser] Auth check failed: ${authError?.message || 'No authenticated user'}. UserId provided: ${userId}`);
  } else if (authUser.id !== userId) {
    console.warn(`[getDriversForUser] User ID mismatch: auth.uid()=${authUser.id}, provided userId=${userId}`);
  }

  let query = supabase.from('drivers').select('*').eq('owner_id', userId);

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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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

  const supabase = await createClient();
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

export async function createDriver(input: NewDriverInput, userId: string): Promise<Driver> {
  const supabase = await createClient();

  // Debug: Verify auth session
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
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

  // Test RLS by attempting a simple query first
  const { data: testData, error: testError } = await supabase
    .from('drivers')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);
  
  if (testError) {
    console.error('[createDriver] RLS test query failed:', {
      message: testError.message,
      code: testError.code,
      details: testError.details,
    });
    // Don't throw here - the insert might still work, but log it
  } else {
    console.log('[createDriver] RLS test query succeeded, found', testData?.length || 0, 'existing drivers');
  }

  // Insert driver
  const insertPayload = {
    ...input,
    owner_id: userId,
    company_id: input.company_id ?? null,
    leased_to_company_id: input.leased_to_company_id ?? null,
    driver_type: input.driver_type ?? 'company_driver',
  };

  const { data, error } = await supabase
    .from('drivers')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    // Enhanced error details for debugging - include full error object
    const errorDetails = {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      authUserId: authUser.id,
      insertPayload: { 
        ...insertPayload, 
        first_name: insertPayload.first_name?.substring(0, 10) + '...',
        owner_id: insertPayload.owner_id,
      },
    };
    console.error('[createDriver] Driver insert failed:', JSON.stringify(errorDetails, null, 2));
    
    // Build a detailed error message for the UI
    let errorMessage = `Failed to create driver: ${error.message}`;
    if (error.code) {
      errorMessage += `\nError Code: ${error.code}`;
    }
    if (error.hint) {
      errorMessage += `\nHint: ${error.hint}`;
    }
    if (error.details) {
      errorMessage += `\nDetails: ${error.details}`;
    }
    errorMessage += `\n\nDebug Info:\n- User ID: ${userId}\n- Auth UID: ${authUser.id}\n- Owner ID in payload: ${insertPayload.owner_id}`;
    
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error('Driver insert succeeded but no data returned. Check RLS policies.');
  }

  const driver = data as Driver;

  // Verify the driver can be read back (RLS check)
  const { data: verifyData, error: verifyError } = await supabase
    .from('drivers')
    .select('id, owner_id, first_name, last_name')
    .eq('id', driver.id)
    .eq('owner_id', userId)
    .single();

  if (verifyError || !verifyData) {
    console.error('[createDriver] Driver created but cannot be read back:', {
      driverId: driver.id,
      verifyError: verifyError?.message,
      verifyCode: verifyError?.code,
    });
    throw new Error(`Driver was created but cannot be retrieved. This may indicate an RLS policy issue. Error: ${verifyError?.message || 'No data returned'}`);
  }

  // Update equipment assignments if provided
  if (driver.assigned_truck_id) {
    await supabase
      .from('trucks')
      .update({ assigned_driver_id: driver.id })
      .eq('id', driver.assigned_truck_id)
      .eq('owner_id', userId);
  }
  if (driver.assigned_trailer_id) {
    await supabase
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
  companyId?: string
): Promise<Driver> {
  const supabase = await createClient();

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

  const { data, error } = await supabase
    .from('drivers')
    .update(input)
    .eq('id', id)
    .eq(companyId ? 'company_id' : 'owner_id', companyId ?? userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Driver not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update driver: ${error.message}`);
  }

  const updated = data as Driver;

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
  const supabase = await createClient();
  const { error } = await supabase.from('drivers').delete().eq('id', id).eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to delete driver: ${error.message}`);
  }
}

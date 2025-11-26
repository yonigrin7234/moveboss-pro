import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { updateTrip } from '@/data/trips';
import { addLoadToTrip } from '@/data/trips';
import type { AddTripLoadInput, TripExpense, TripLoad, TripWithDetails } from '@/data/trips';

const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getDbClient(): Promise<SupabaseClient> {
  if (hasServiceRoleKey) return createServiceRoleClient();
  return createClient();
}

export async function getDriverDbClientForActions(): Promise<SupabaseClient> {
  return getDbClient();
}
export async function getCurrentDriverForSession() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return null;

  const supabase = await getDbClient();
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('has_login', true)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getCurrentDriverForSession] failed', error);
    return null;
  }

  return data;
}

export async function requireCurrentDriver() {
  const driver = await getCurrentDriverForSession();
  if (!driver) throw new Error('Driver not found or not authenticated');
  return driver;
}

export async function getDriverTripsForDriver(driverId: string, ownerId: string) {
  const supabase = await getDbClient();
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      id, owner_id, trip_number, status, driver_id, truck_id, trailer_id,
      origin_city, origin_state, origin_postal_code,
      destination_city, destination_state, destination_postal_code,
      start_date, end_date, odometer_start, odometer_end, actual_miles,
      updated_at
    `
    )
    .eq('driver_id', driverId)
    .eq('owner_id', ownerId)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch trips for driver: ${error.message}`);
  }

  return data || [];
}

export async function getDriverTripDetail(
  tripId: string,
  driver: { id: string; owner_id: string }
): Promise<{ trip: TripWithDetails; loads: TripLoad[]; expenses: TripExpense[] } | null> {
  const supabase = await getDbClient();

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      *,
      truck:trucks!trips_truck_id_fkey(id, unit_number),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number)
    `
    )
    .eq('id', tripId)
    .eq('owner_id', driver.owner_id)
    .eq('driver_id', driver.id)
    .maybeSingle();

  if (tripError) {
    throw new Error(`Failed to fetch trip: ${tripError.message}`);
  }
  if (!trip) return null;

  const [{ data: tripLoads, error: loadError }, { data: expenses, error: expenseError }] = await Promise.all([
    supabase
      .from('trip_loads')
      .select(
        `
        *,
        load:loads(
          *,
          company:companies(id, name)
        )
      `
      )
      .eq('trip_id', tripId)
      .eq('owner_id', driver.owner_id)
      .order('sequence_index', { ascending: true }),
    supabase
      .from('trip_expenses')
      .select('*')
      .eq('trip_id', tripId)
      .eq('owner_id', driver.owner_id)
      .order('incurred_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (loadError) {
    throw new Error(`Failed to fetch trip loads: ${loadError.message}`);
  }
  if (expenseError) {
    throw new Error(`Failed to fetch trip expenses: ${expenseError.message}`);
  }

  return {
    trip: trip as unknown as TripWithDetails,
    loads: (tripLoads || []) as TripLoad[],
    expenses: (expenses || []) as TripExpense[],
  };
}

export async function getDriverLoadDetail(
  loadId: string,
  driver: { id: string; owner_id: string }
): Promise<{ load: any; tripId: string; loadOrder: number } | null> {
  const supabase = await getDbClient();
  const { data: tripLoad, error: tlError } = await supabase
    .from('trip_loads')
    .select(
      `
      *,
      trip:trips(id, driver_id, owner_id, trip_number)
    `
    )
    .eq('load_id', loadId)
    .eq('owner_id', driver.owner_id)
    .limit(1)
    .maybeSingle();

  if (tlError) {
    throw new Error(`Failed to fetch trip load: ${tlError.message}`);
  }
  if (!tripLoad || tripLoad.trip?.driver_id !== driver.id) return null;

  const { data: load, error: loadError } = await supabase
    .from('loads')
    .select(
      `
      *,
      company:companies(
        id,
        name,
        trust_level,
        dispatch_contact_name,
        dispatch_contact_phone,
        dispatch_contact_email,
        address,
        city,
        state,
        zip
      )
    `
    )
    .eq('id', loadId)
    .eq('owner_id', driver.owner_id)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to fetch load: ${loadError.message}`);
  }
  if (!load) return null;

  // Get load order from trip_load
  const loadOrder = (tripLoad as any).load_order ?? (tripLoad as any).sequence_index ?? 1;

  return { load, tripId: (tripLoad as any).trip_id as string, loadOrder };
}

// Driver-side trip start (planned -> active)
export async function driverStartTrip(tripId: string, userId: string, payload: {
  odometer_start: number;
  odometer_start_photo_url: string;
  driver_id?: string;
  truck_id?: string;
  trailer_id?: string;
}) {
  const supabase = await getDbClient();
  return updateTrip(
    tripId,
    {
      status: 'active',
      odometer_start: payload.odometer_start,
      odometer_start_photo_url: payload.odometer_start_photo_url,
      driver_id: payload.driver_id,
      truck_id: payload.truck_id,
      trailer_id: payload.trailer_id,
    } as any,
    userId,
    supabase,
  );
}

// Driver attaches a load to trip (future use)
export async function driverAttachLoad(tripId: string, input: AddTripLoadInput, userId: string) {
  return addLoadToTrip(tripId, input, userId);
}

// Driver marks load pickup
export async function driverMarkLoadPickup(loadId: string, userId: string, payload: {
  actual_cuft_loaded: number;
  contract_rate_per_cuft: number;
  contract_accessorials_shuttle?: number;
  contract_accessorials_stairs?: number;
  contract_accessorials_long_carry?: number;
  contract_accessorials_bulky?: number;
  contract_accessorials_other?: number;
  balance_due_on_delivery?: number;
  origin_arrival_at?: string;
  contract_photo_url?: string;
  load_report_photo_url?: string;
}) {
  const supabase = await getDbClient();
  const accessorials =
    (payload.contract_accessorials_shuttle || 0) +
    (payload.contract_accessorials_stairs || 0) +
    (payload.contract_accessorials_long_carry || 0) +
    (payload.contract_accessorials_bulky || 0) +
    (payload.contract_accessorials_other || 0);

  if (!payload.actual_cuft_loaded || payload.actual_cuft_loaded <= 0) {
    throw new Error('actual_cuft_loaded must be greater than zero to mark load as loaded');
  }

  const { error } = await supabase
    .from('loads')
    .update({
      actual_cuft_loaded: payload.actual_cuft_loaded,
      contract_rate_per_cuft: payload.contract_rate_per_cuft,
      contract_accessorials_shuttle: payload.contract_accessorials_shuttle ?? 0,
      contract_accessorials_stairs: payload.contract_accessorials_stairs ?? 0,
      contract_accessorials_long_carry: payload.contract_accessorials_long_carry ?? 0,
      contract_accessorials_bulky: payload.contract_accessorials_bulky ?? 0,
      contract_accessorials_other: payload.contract_accessorials_other ?? 0,
      contract_accessorials_total: accessorials,
      balance_due_on_delivery: payload.balance_due_on_delivery ?? null,
      origin_arrival_at: payload.origin_arrival_at ?? null,
      contract_photo_url: payload.contract_photo_url ?? null,
      load_report_photo_url: payload.load_report_photo_url ?? null,
      load_status: 'loaded',
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to mark load pickup: ${error.message}`);
  }
}

// Driver marks load delivered
export async function driverMarkLoadDelivered(loadId: string, userId: string, payload: {
  destination_arrival_at?: string;
  amount_collected_on_delivery?: number;
  amount_paid_directly_to_company?: number;
  payment_method?: 'cash' | 'card' | 'certified_check' | 'customer_paid_directly_to_company';
  payment_method_notes?: string;
  extra_shuttle?: number;
  extra_stairs?: number;
  extra_long_carry?: number;
  extra_packing?: number;
  extra_bulky?: number;
  extra_other?: number;
  delivery_report_photo_url?: string;
  delivery_photos?: string[];
}) {
  const supabase = await getDbClient();
  const extraTotal =
    (payload.extra_shuttle || 0) +
    (payload.extra_stairs || 0) +
    (payload.extra_long_carry || 0) +
    (payload.extra_packing || 0) +
    (payload.extra_bulky || 0) +
    (payload.extra_other || 0);

  const { error } = await supabase
    .from('loads')
    .update({
      destination_arrival_at: payload.destination_arrival_at ?? null,
      amount_collected_on_delivery: payload.amount_collected_on_delivery ?? null,
      amount_paid_directly_to_company: payload.amount_paid_directly_to_company ?? null,
      payment_method: payload.payment_method ?? null,
      payment_method_notes: payload.payment_method_notes ?? null,
      extra_shuttle: payload.extra_shuttle ?? 0,
      extra_stairs: payload.extra_stairs ?? 0,
      extra_long_carry: payload.extra_long_carry ?? 0,
      extra_packing: payload.extra_packing ?? 0,
      extra_bulky: payload.extra_bulky ?? 0,
      extra_other: payload.extra_other ?? 0,
      extra_accessorials_total: extraTotal,
      delivery_report_photo_url: payload.delivery_report_photo_url ?? null,
      delivery_photos: payload.delivery_photos ?? null,
      load_status: 'delivered',
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to mark load delivered: ${error.message}`);
  }
}

// Driver sets storage drop info
export async function driverSetStorageDrop(loadId: string, userId: string, payload: {
  storage_drop: boolean;
  storage_location_name?: string;
  storage_location_address?: string;
  storage_unit_number?: string;
  storage_move_in_fee?: number;
  storage_daily_fee?: number;
  storage_days_billed?: number;
  storage_notes?: string;
  company_approved_exception_delivery?: boolean;
}) {
  const supabase = await getDbClient();
  const updatePayload: Record<string, any> = {
    storage_drop: payload.storage_drop,
    storage_location_name: payload.storage_location_name ?? null,
    storage_location_address: payload.storage_location_address ?? null,
    storage_unit_number: payload.storage_unit_number ?? null,
    storage_move_in_fee: payload.storage_move_in_fee ?? null,
    storage_daily_fee: payload.storage_daily_fee ?? null,
    storage_days_billed: payload.storage_days_billed ?? null,
    storage_notes: payload.storage_notes ?? null,
    company_approved_exception_delivery: payload.company_approved_exception_delivery ?? false,
  };

  if (payload.storage_drop) {
    updatePayload.load_status = 'storage_completed';
  }

  const { error } = await supabase
    .from('loads')
    .update(updatePayload)
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to set storage drop info: ${error.message}`);
  }
}

// Driver accepts a load (pending -> accepted)
export async function driverAcceptLoad(loadId: string, userId: string) {
  const supabase = await getDbClient();
  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', loadId)
    .eq('owner_id', userId)
    .eq('load_status', 'pending');

  if (error) {
    throw new Error(`Failed to accept load: ${error.message}`);
  }
}

// Driver starts loading (accepted -> loading)
export async function driverStartLoading(loadId: string, userId: string, payload: {
  starting_cuft: number;
  loading_start_photo: string;
}) {
  const supabase = await getDbClient();
  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'loading',
      loading_started_at: new Date().toISOString(),
      starting_cuft: payload.starting_cuft,
      loading_start_photo: payload.loading_start_photo,
    })
    .eq('id', loadId)
    .eq('owner_id', userId)
    .eq('load_status', 'accepted');

  if (error) {
    throw new Error(`Failed to start loading: ${error.message}`);
  }
}

// Driver finishes loading (loading -> loaded)
export async function driverFinishLoading(loadId: string, userId: string, payload: {
  ending_cuft: number;
  loading_end_photo: string;
  actual_cuft_loaded?: number;
}) {
  const supabase = await getDbClient();

  // First get the starting CUFT to calculate actual loaded
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('starting_cuft')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch load: ${fetchError.message}`);
  }

  const startingCuft = Number(load?.starting_cuft) || 0;
  const endingCuft = payload.ending_cuft;
  const actualCuftLoaded = payload.actual_cuft_loaded ?? (endingCuft - startingCuft);

  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'loaded',
      loading_finished_at: new Date().toISOString(),
      ending_cuft: endingCuft,
      loading_end_photo: payload.loading_end_photo,
      actual_cuft_loaded: actualCuftLoaded,
    })
    .eq('id', loadId)
    .eq('owner_id', userId)
    .eq('load_status', 'loading');

  if (error) {
    throw new Error(`Failed to finish loading: ${error.message}`);
  }
}

// Driver completes load details (after loading, before delivery)
export async function driverCompleteLoadDetails(loadId: string, userId: string, payload: {
  actual_cuft_loaded?: number;
  contract_rate_per_cuft?: number;
  contract_accessorials_shuttle?: number;
  contract_accessorials_stairs?: number;
  contract_accessorials_long_carry?: number;
  contract_accessorials_bulky?: number;
  contract_accessorials_other?: number;
  balance_due_on_delivery?: number;
  first_available_date?: string;
  load_report_photo_url?: string;
}) {
  const supabase = await getDbClient();

  const accessorials =
    (payload.contract_accessorials_shuttle || 0) +
    (payload.contract_accessorials_stairs || 0) +
    (payload.contract_accessorials_long_carry || 0) +
    (payload.contract_accessorials_bulky || 0) +
    (payload.contract_accessorials_other || 0);

  const { error } = await supabase
    .from('loads')
    .update({
      actual_cuft_loaded: payload.actual_cuft_loaded ?? null,
      contract_rate_per_cuft: payload.contract_rate_per_cuft ?? null,
      contract_accessorials_shuttle: payload.contract_accessorials_shuttle ?? 0,
      contract_accessorials_stairs: payload.contract_accessorials_stairs ?? 0,
      contract_accessorials_long_carry: payload.contract_accessorials_long_carry ?? 0,
      contract_accessorials_bulky: payload.contract_accessorials_bulky ?? 0,
      contract_accessorials_other: payload.contract_accessorials_other ?? 0,
      contract_accessorials_total: accessorials,
      balance_due_on_delivery: payload.balance_due_on_delivery ?? null,
      first_available_date: payload.first_available_date ?? null,
      load_report_photo_url: payload.load_report_photo_url ?? null,
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to complete load details: ${error.message}`);
  }
}

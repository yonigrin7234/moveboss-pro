import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { updateTrip } from '@/data/trips';
import { addLoadToTrip } from '@/data/trips';
import type { AddTripLoadInput, TripExpense, TripLoad, TripWithDetails } from '@/data/trips';
import { logActivity } from '@/data/activity-log';
import {
  logStructuredUploadEvent,
  createPhotoUploadMetadata,
  createPaperworkMetadata,
} from '@/lib/audit';
import { recordStructuredUploadMessage } from '@/lib/messaging';

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

  // First try with truck/trailer joins
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      id, owner_id, trip_number, status, driver_id, truck_id, trailer_id,
      origin_city, origin_state, origin_postal_code,
      destination_city, destination_state, destination_postal_code,
      start_date, end_date, odometer_start, odometer_end, actual_miles,
      updated_at,
      truck:trucks(id, unit_number),
      trailer:trailers(id, unit_number)
    `
    )
    .eq('driver_id', driverId)
    .eq('owner_id', ownerId)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    // If join fails, try without joins
    console.warn('[getDriverTripsForDriver] Query with joins failed, trying without:', error.message);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('trips')
      .select('*')
      .eq('driver_id', driverId)
      .eq('owner_id', ownerId)
      .order('status', { ascending: true })
      .order('updated_at', { ascending: false });

    if (fallbackError) {
      throw new Error(`Failed to fetch trips for driver: ${fallbackError.message}`);
    }
    return fallbackData || [];
  }

  return data || [];
}

export async function getDriverTripDetail(
  tripId: string,
  driver: { id: string; owner_id: string }
): Promise<{ trip: TripWithDetails; loads: TripLoad[]; expenses: TripExpense[] } | null> {
  const supabase = await getDbClient();

  // First try with truck/trailer joins
  let trip: any = null;
  const { data: tripWithJoins, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      *,
      truck:trucks(id, unit_number, make, model, year),
      trailer:trailers(id, unit_number, type, length)
    `
    )
    .eq('id', tripId)
    .eq('owner_id', driver.owner_id)
    .eq('driver_id', driver.id)
    .maybeSingle();

  if (tripError) {
    // If join fails, try without joins and fetch truck/trailer separately
    console.warn('[getDriverTripDetail] Query with joins failed, trying without:', tripError.message);
    const { data: tripBasic, error: basicError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('owner_id', driver.owner_id)
      .eq('driver_id', driver.id)
      .maybeSingle();

    if (basicError) {
      throw new Error(`Failed to fetch trip: ${basicError.message}`);
    }
    if (!tripBasic) return null;

    // Fetch truck and trailer separately if IDs exist
    let truck = null;
    let trailer = null;
    if (tripBasic.truck_id) {
      const { data } = await supabase
        .from('trucks')
        .select('id, unit_number, make, model, year')
        .eq('id', tripBasic.truck_id)
        .maybeSingle();
      truck = data;
    }
    if (tripBasic.trailer_id) {
      const { data } = await supabase
        .from('trailers')
        .select('id, unit_number, type, length')
        .eq('id', tripBasic.trailer_id)
        .maybeSingle();
      trailer = data;
    }
    trip = { ...tripBasic, truck, trailer };
  } else {
    trip = tripWithJoins;
  }

  if (!trip) return null;

  // Fetch expenses
  const { data: expenses, error: expenseError } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .eq('owner_id', driver.owner_id)
    .order('incurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (expenseError) {
    throw new Error(`Failed to fetch trip expenses: ${expenseError.message}`);
  }

  // Fetch trip loads - try with trust_level first, fall back to basic
  // Note: Avoiding ORDER BY on load_order/sequence_index as columns may not exist
  let tripLoads: any[] = [];
  const { data: loadsWithTrust, error: loadError } = await supabase
    .from('trip_loads')
    .select(
      `
      *,
      load:loads(
        *,
        company:companies(id, name, trust_level)
      )
    `
    )
    .eq('trip_id', tripId)
    .eq('owner_id', driver.owner_id);

  if (loadError) {
    // If trust_level column doesn't exist, fall back to basic query
    if (loadError.message.includes('column') || loadError.code === '42703') {
      console.warn('[getDriverTripDetail] trust_level column missing, using basic query. Run migrations for full features.');
      const { data: basicLoads, error: basicError } = await supabase
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
        .eq('owner_id', driver.owner_id);

      if (basicError) {
        throw new Error(`Failed to fetch trip loads: ${basicError.message}`);
      }
      tripLoads = basicLoads || [];
    } else {
      throw new Error(`Failed to fetch trip loads: ${loadError.message}`);
    }
  } else {
    tripLoads = loadsWithTrust || [];
  }

  // Sort by load_order or sequence_index if available (handles missing columns gracefully)
  tripLoads.sort((a, b) => {
    const orderA = (a as any).load_order ?? (a as any).sequence_index ?? 0;
    const orderB = (b as any).load_order ?? (b as any).sequence_index ?? 0;
    return orderA - orderB;
  });

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

  // Try with full company columns first
  let load: any = null;
  const { data: loadWithCompany, error: loadError } = await supabase
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
    // If columns don't exist, fall back to basic company info
    if (loadError.message.includes('column') || loadError.code === '42703') {
      console.warn('[getDriverLoadDetail] Some company columns missing, using basic query. Run migrations for full features.');
      const { data: basicLoad, error: basicError } = await supabase
        .from('loads')
        .select(
          `
          *,
          company:companies(id, name)
        `
        )
        .eq('id', loadId)
        .eq('owner_id', driver.owner_id)
        .maybeSingle();
      if (basicError) {
        throw new Error(`Failed to fetch load: ${basicError.message}`);
      }
      load = basicLoad;
    } else {
      throw new Error(`Failed to fetch load: ${loadError.message}`);
    }
  } else {
    load = loadWithCompany;
  }

  if (!load) return null;

  // Get load order from trip_load
  const loadOrder = (tripLoad as any).load_order ?? (tripLoad as any).sequence_index ?? 1;

  return { load, tripId: (tripLoad as any).trip_id as string, loadOrder };
}

// Driver-side trip start (planned -> active)
export async function driverStartTrip(
  tripId: string,
  userId: string,
  payload: {
    odometer_start: number;
    odometer_start_photo_url: string;
    driver_id?: string;
    truck_id?: string;
    trailer_id?: string;
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripNumber?: string; originCity?: string; destinationCity?: string }
) {
  const supabase = await getDbClient();
  const result = await updateTrip(
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

  // Log activity
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  const route = [context?.originCity, context?.destinationCity].filter(Boolean).join(' → ') || 'Route TBD';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id || payload.driver_id,
    driverName,
    activityType: 'trip_started',
    tripId,
    tripNumber: context?.tripNumber,
    title: `${driverName} started Trip ${context?.tripNumber || tripId.slice(0, 8)}`,
    description: `Odometer: ${payload.odometer_start.toLocaleString()} • ${route}`,
    metadata: { odometerStart: payload.odometer_start, originCity: context?.originCity, destinationCity: context?.destinationCity },
  });

  return result;
}

// Driver attaches a load to trip (future use)
export async function driverAttachLoad(tripId: string, input: AddTripLoadInput, userId: string) {
  return addLoadToTrip(tripId, input, userId);
}

// Driver marks load pickup
export async function driverMarkLoadPickup(
  loadId: string,
  userId: string,
  payload: {
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
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string } }
) {
  const supabase = await getDbClient();

  // Get load info for audit logging
  const { data: loadData } = await supabase
    .from('loads')
    .select('load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

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

  // AUDIT & MESSAGING: Log photo uploads
  const company = Array.isArray((loadData as any)?.company) ? (loadData as any)?.company[0] : (loadData as any)?.company;
  const companyId = company?.id;
  const loadNumber = (loadData as any)?.load_number;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined;

  // Log contract photo
  if (payload.contract_photo_url) {
    const metadata = createPaperworkMetadata({
      documentType: 'other', // contract type stored in upload_kind
      loadNumber,
      fileUrl: payload.contract_photo_url,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_contract' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_contract' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log load report photo
  if (payload.load_report_photo_url) {
    const metadata = createPaperworkMetadata({
      documentType: 'other',
      loadNumber,
      fileUrl: payload.load_report_photo_url,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_report' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_report' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }
}

// Driver marks load delivered
export async function driverMarkLoadDelivered(
  loadId: string,
  userId: string,
  payload: {
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
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string } }
) {
  const supabase = await getDbClient();

  // Get load info for audit logging
  const { data: loadData } = await supabase
    .from('loads')
    .select('load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

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

  // AUDIT & MESSAGING: Log photo uploads
  const company = Array.isArray((loadData as any)?.company) ? (loadData as any)?.company[0] : (loadData as any)?.company;
  const companyId = company?.id;
  const loadNumber = (loadData as any)?.load_number;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined;

  // Log delivery report photo
  if (payload.delivery_report_photo_url) {
    const metadata = createPaperworkMetadata({
      documentType: 'other',
      loadNumber,
      fileUrl: payload.delivery_report_photo_url,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_delivery_report' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_delivery_report' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log delivery photos (array)
  if (payload.delivery_photos && payload.delivery_photos.length > 0) {
    const metadata = createPhotoUploadMetadata({
      photoType: 'delivery',
      loadNumber,
      uploadContext: 'load_delivery',
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'photo_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_delivery_photos', file_count: payload.delivery_photos.length } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'photo_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_delivery_photos', file_count: payload.delivery_photos.length } as Record<string, unknown>,
      }).catch(() => {});
    }
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

// Driver accepts a load (pending/null -> accepted)
export async function driverAcceptLoad(
  loadId: string,
  userId: string,
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripId?: string; tripNumber?: string }
) {
  const supabase = await getDbClient();

  // First check if load exists and is in correct status (pending or null)
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, load_status, load_number, estimated_cuft, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    throw new Error('Load not found or access denied');
  }

  // Only allow accepting loads that are pending or have no status (null)
  if ((load as any).load_status && (load as any).load_status !== 'pending') {
    throw new Error(`Cannot accept load - current status is "${(load as any).load_status}"`);
  }

  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to accept load: ${error.message}`);
  }

  // Log activity
  const company = Array.isArray((load as any).company) ? (load as any).company[0] : (load as any).company;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id,
    driverName,
    activityType: 'load_accepted',
    tripId: context?.tripId,
    tripNumber: context?.tripNumber,
    loadId,
    loadNumber: (load as any).load_number,
    title: `${driverName} accepted load ${(load as any).load_number || loadId.slice(0, 8)}`,
    description: `${(load as any).estimated_cuft || 0} CUFT estimated • ${company?.name || 'Unknown company'}`,
    metadata: { estimatedCuft: (load as any).estimated_cuft, companyName: company?.name },
  });
}

// Driver starts loading (accepted -> loading)
export async function driverStartLoading(
  loadId: string,
  userId: string,
  payload: {
    starting_cuft: number;
    loading_start_photo: string;
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripId?: string; tripNumber?: string }
) {
  const supabase = await getDbClient();

  // First verify load is in accepted status
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, load_status, load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    throw new Error('Load not found or access denied');
  }

  if ((load as any).load_status !== 'accepted') {
    throw new Error(`Cannot start loading - load must be accepted first (current status: "${(load as any).load_status || 'pending'}")`);
  }

  // Try full update with all workflow columns
  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'loading',
      loading_started_at: new Date().toISOString(),
      starting_cuft: payload.starting_cuft,
      loading_start_photo: payload.loading_start_photo,
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    // If columns don't exist, fall back to just updating status
    if (error.message.includes('column') || error.code === '42703') {
      console.warn('[driverStartLoading] Some columns missing, updating status only. Run migrations to enable full workflow.');
      const { error: fallbackError } = await supabase
        .from('loads')
        .update({ load_status: 'loading' })
        .eq('id', loadId)
        .eq('owner_id', userId);
      if (fallbackError) {
        throw new Error(`Failed to start loading: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Failed to start loading: ${error.message}`);
    }
  }

  // AUDIT & MESSAGING: Log loading start photo upload
  const company = Array.isArray((load as any).company) ? (load as any).company[0] : (load as any).company;
  const companyId = company?.id;

  if (payload.loading_start_photo) {
    const metadata = createPhotoUploadMetadata({
      photoType: 'pickup',
      fileUrl: payload.loading_start_photo,
      loadNumber: (load as any).load_number,
      uploadContext: 'load_pickup',
    });

    // Log audit event (non-blocking)
    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'photo_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_loading_before_photo' } as Record<string, unknown>,
    }).catch(() => {});

    // Record system message
    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'photo_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_loading_before_photo' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log activity
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id,
    driverName,
    activityType: 'loading_started',
    tripId: context?.tripId,
    tripNumber: context?.tripNumber,
    loadId,
    loadNumber: (load as any).load_number,
    title: `${driverName} started loading ${(load as any).load_number || loadId.slice(0, 8)}`,
    description: `Starting at ${payload.starting_cuft} CUFT • ${company?.name || 'Unknown company'}`,
    metadata: { startingCuft: payload.starting_cuft, companyName: company?.name },
  });
}

// Driver finishes loading (loading -> loaded)
export async function driverFinishLoading(
  loadId: string,
  userId: string,
  payload: {
    ending_cuft: number;
    loading_end_photo: string;
    actual_cuft_loaded?: number;
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripId?: string; tripNumber?: string }
) {
  const supabase = await getDbClient();

  // First get the load to verify status and get starting CUFT
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, load_status, load_number, starting_cuft, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    throw new Error('Load not found or access denied');
  }

  if ((load as any).load_status !== 'loading') {
    throw new Error(`Cannot finish loading - load must be in loading status (current status: "${(load as any).load_status || 'pending'}")`);
  }

  const startingCuft = Number((load as any).starting_cuft) || 0;
  const endingCuft = payload.ending_cuft;
  const actualCuftLoaded = payload.actual_cuft_loaded ?? (endingCuft - startingCuft);

  // Try full update with all workflow columns
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
    .eq('owner_id', userId);

  if (error) {
    // If columns don't exist, fall back to updating status and actual_cuft_loaded only
    if (error.message.includes('column') || error.code === '42703') {
      console.warn('[driverFinishLoading] Some columns missing, updating status only. Run migrations to enable full workflow.');
      const { error: fallbackError } = await supabase
        .from('loads')
        .update({
          load_status: 'loaded',
          actual_cuft_loaded: actualCuftLoaded,
        })
        .eq('id', loadId)
        .eq('owner_id', userId);
      if (fallbackError) {
        throw new Error(`Failed to finish loading: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Failed to finish loading: ${error.message}`);
    }
  }

  // AUDIT & MESSAGING: Log loading end photo upload
  const company = Array.isArray((load as any).company) ? (load as any).company[0] : (load as any).company;
  const companyId = company?.id;

  if (payload.loading_end_photo) {
    const metadata = createPhotoUploadMetadata({
      photoType: 'pickup',
      fileUrl: payload.loading_end_photo,
      loadNumber: (load as any).load_number,
      uploadContext: 'load_pickup',
    });

    // Log audit event (non-blocking)
    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'photo_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_loading_after_photo' } as Record<string, unknown>,
    }).catch(() => {});

    // Record system message
    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'photo_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_loading_after_photo' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log activity
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id,
    driverName,
    activityType: 'loading_finished',
    tripId: context?.tripId,
    tripNumber: context?.tripNumber,
    loadId,
    loadNumber: (load as any).load_number,
    title: `${driverName} finished loading ${(load as any).load_number || loadId.slice(0, 8)}`,
    description: `${actualCuftLoaded} CUFT loaded • ${company?.name || 'Unknown company'}`,
    metadata: { actualCuft: actualCuftLoaded, endingCuft, companyName: company?.name },
  });
}

// Driver completes load details (after loading, before delivery)
export async function driverCompleteLoadDetails(
  loadId: string,
  userId: string,
  payload: {
    actual_cuft_loaded?: number;
    contract_rate_per_cuft?: number;
    contract_accessorials_shuttle?: number;
    contract_accessorials_stairs?: number;
    contract_accessorials_long_carry?: number;
    contract_accessorials_bulky?: number;
    contract_accessorials_other?: number;
    balance_due_on_delivery?: number;
    first_available_date?: string;
    loading_report_photo?: string;
    origin_paperwork_photos?: string[];
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string } }
) {
  const supabase = await getDbClient();

  // Get load info for audit logging
  const { data: loadData } = await supabase
    .from('loads')
    .select('load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  const accessorials =
    (payload.contract_accessorials_shuttle || 0) +
    (payload.contract_accessorials_stairs || 0) +
    (payload.contract_accessorials_long_carry || 0) +
    (payload.contract_accessorials_bulky || 0) +
    (payload.contract_accessorials_other || 0);

  // Try full update with new columns first
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
      loading_report_photo: payload.loading_report_photo ?? null,
      origin_paperwork_photos: payload.origin_paperwork_photos ?? [],
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    // Fallback: try without new photo columns if they don't exist yet
    if (error.message.includes('loading_report_photo') || error.message.includes('origin_paperwork_photos')) {
      console.warn('[driverCompleteLoadDetails] New photo columns not yet available, falling back to basic update');
      const { error: fallbackError } = await supabase
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
        })
        .eq('id', loadId)
        .eq('owner_id', userId);

      if (fallbackError) {
        throw new Error(`Failed to complete load details: ${fallbackError.message}`);
      }
      return;
    }
    throw new Error(`Failed to complete load details: ${error.message}`);
  }

  // AUDIT & MESSAGING: Log photo/document uploads
  const company = Array.isArray((loadData as any)?.company) ? (loadData as any)?.company[0] : (loadData as any)?.company;
  const companyId = company?.id;
  const loadNumber = (loadData as any)?.load_number;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined;

  // Log loading report photo
  if (payload.loading_report_photo) {
    const metadata = createPaperworkMetadata({
      documentType: 'other',
      loadNumber,
      fileUrl: payload.loading_report_photo,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_loading_report' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_loading_report' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log origin paperwork photos (array upload)
  if (payload.origin_paperwork_photos && payload.origin_paperwork_photos.length > 0) {
    const metadata = createPaperworkMetadata({
      documentType: 'other',
      loadNumber,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_origin_paperwork', file_count: payload.origin_paperwork_photos.length } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_origin_paperwork', file_count: payload.origin_paperwork_photos.length } as Record<string, unknown>,
      }).catch(() => {});
    }
  }
}

// Driver starts delivery (loaded -> in_transit)
export async function driverStartDelivery(
  loadId: string,
  userId: string,
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripId?: string; tripNumber?: string }
) {
  const supabase = await getDbClient();

  // First verify load is in loaded status
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, load_status, load_number, destination_city, destination_state, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    throw new Error('Load not found or access denied');
  }

  if ((load as any).load_status !== 'loaded') {
    throw new Error(`Cannot start delivery - load must be loaded first (current status: "${(load as any).load_status || 'pending'}")`);
  }

  // Try full update first
  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'in_transit',
      delivery_started_at: new Date().toISOString(),
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    // Fall back to just updating status if delivery_started_at column doesn't exist
    if (error.message.includes('column') || error.code === '42703') {
      console.warn('[driverStartDelivery] delivery_started_at column missing, updating status only.');
      const { error: fallbackError } = await supabase
        .from('loads')
        .update({ load_status: 'in_transit' })
        .eq('id', loadId)
        .eq('owner_id', userId);
      if (fallbackError) {
        throw new Error(`Failed to start delivery: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Failed to start delivery: ${error.message}`);
    }
  }

  // Log activity
  const company = Array.isArray((load as any).company) ? (load as any).company[0] : (load as any).company;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  const destination = [(load as any).destination_city, (load as any).destination_state].filter(Boolean).join(', ') || 'Unknown';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id,
    driverName,
    activityType: 'delivery_started',
    tripId: context?.tripId,
    tripNumber: context?.tripNumber,
    loadId,
    loadNumber: (load as any).load_number,
    title: `${driverName} started delivery for ${(load as any).load_number || loadId.slice(0, 8)}`,
    description: `${destination} • ${company?.name || 'Unknown company'}`,
    metadata: { destinationCity: (load as any).destination_city, destinationState: (load as any).destination_state, companyName: company?.name },
  });
}

// Driver completes delivery (in_transit -> delivered)
export async function driverCompleteDelivery(
  loadId: string,
  userId: string,
  payload: {
    delivery_location_photo?: string;
    signed_bol_photos?: string[];
    signed_inventory_photos?: string[];
    collected_amount?: number;
    collection_method?: string;
    delivery_notes?: string;
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string }; tripId?: string; tripNumber?: string }
) {
  const supabase = await getDbClient();

  // First verify load is in in_transit status
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('id, load_status, load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    throw new Error('Load not found or access denied');
  }

  if ((load as any).load_status !== 'in_transit') {
    throw new Error(`Cannot complete delivery - load must be in transit (current status: "${(load as any).load_status || 'pending'}")`);
  }

  // Try full update with all delivery fields
  const { error } = await supabase
    .from('loads')
    .update({
      load_status: 'delivered',
      delivery_finished_at: new Date().toISOString(),
      delivery_location_photo: payload.delivery_location_photo || null,
      signed_bol_photos: payload.signed_bol_photos || [],
      signed_inventory_photos: payload.signed_inventory_photos || [],
      collected_amount: payload.collected_amount || null,
      collection_method: payload.collection_method || null,
      delivery_notes: payload.delivery_notes || null,
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    // Fall back to just updating status if columns don't exist
    if (error.message.includes('column') || error.code === '42703') {
      console.warn('[driverCompleteDelivery] Some columns missing, updating status only. Run migrations for full features.');
      const { error: fallbackError } = await supabase
        .from('loads')
        .update({ load_status: 'delivered' })
        .eq('id', loadId)
        .eq('owner_id', userId);
      if (fallbackError) {
        throw new Error(`Failed to complete delivery: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Failed to complete delivery: ${error.message}`);
    }
  }

  // Log activity
  const company = Array.isArray((load as any).company) ? (load as any).company[0] : (load as any).company;
  const companyId = company?.id;
  const loadNumber = (load as any).load_number;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : 'Driver';
  const collectedText = payload.collected_amount ? `$${payload.collected_amount} collected (${payload.collection_method || 'cash'})` : 'No collection';
  await logActivity({
    ownerId: userId,
    driverId: context?.driver?.id,
    driverName,
    activityType: 'delivery_completed',
    tripId: context?.tripId,
    tripNumber: context?.tripNumber,
    loadId,
    loadNumber,
    title: `${driverName} completed delivery for ${loadNumber || loadId.slice(0, 8)}`,
    description: `${collectedText} • ${company?.name || 'Unknown company'}`,
    metadata: { collectedAmount: payload.collected_amount, collectionMethod: payload.collection_method, companyName: company?.name },
  });

  // AUDIT & MESSAGING: Log delivery photo uploads
  // Log delivery location photo
  if (payload.delivery_location_photo) {
    const metadata = createPhotoUploadMetadata({
      photoType: 'delivery',
      fileUrl: payload.delivery_location_photo,
      loadNumber,
      uploadContext: 'load_delivery',
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'photo_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_delivery_location_photo' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'photo_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_delivery_location_photo' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log signed BOL photos (array)
  if (payload.signed_bol_photos && payload.signed_bol_photos.length > 0) {
    const metadata = createPaperworkMetadata({
      documentType: 'bol', // signed_bol stored in upload_kind
      loadNumber,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_signed_bol', file_count: payload.signed_bol_photos.length } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_signed_bol', file_count: payload.signed_bol_photos.length } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log signed inventory photos (array)
  if (payload.signed_inventory_photos && payload.signed_inventory_photos.length > 0) {
    const metadata = createPaperworkMetadata({
      documentType: 'other', // signed_inventory stored in upload_kind
      loadNumber,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_signed_inventory', file_count: payload.signed_inventory_photos.length } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_signed_inventory', file_count: payload.signed_inventory_photos.length } as Record<string, unknown>,
      }).catch(() => {});
    }
  }
}

// Update load with contract documents during loading phase
export async function driverUpdateLoadingDocuments(
  loadId: string,
  userId: string,
  payload: {
    loading_report_photo?: string;
    contract_documents?: string[];
  },
  context?: { driver?: { id: string; first_name?: string; last_name?: string } }
) {
  const supabase = await getDbClient();

  const updateData: Record<string, any> = {};
  if (payload.loading_report_photo !== undefined) {
    updateData.loading_report_photo = payload.loading_report_photo;
  }
  if (payload.contract_documents !== undefined) {
    updateData.contract_documents = payload.contract_documents;
  }

  if (Object.keys(updateData).length === 0) {
    return; // Nothing to update
  }

  // Get load info for audit logging
  const { data: loadData } = await supabase
    .from('loads')
    .select('load_number, company:companies(id, name)')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  const { error } = await supabase
    .from('loads')
    .update(updateData)
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (error) {
    // Silently fail if columns don't exist
    if (error.message.includes('column') || error.code === '42703') {
      console.warn('[driverUpdateLoadingDocuments] Some columns missing. Run migrations for full features.');
      return; // Can't log uploads if columns don't exist
    } else {
      throw new Error(`Failed to update loading documents: ${error.message}`);
    }
  }

  // AUDIT & MESSAGING: Log document uploads
  const company = Array.isArray((loadData as any)?.company) ? (loadData as any)?.company[0] : (loadData as any)?.company;
  const companyId = company?.id;
  const loadNumber = (loadData as any)?.load_number;
  const driverName = context?.driver ? `${context.driver.first_name || ''} ${context.driver.last_name || ''}`.trim() : undefined;

  // Log loading report photo
  if (payload.loading_report_photo) {
    const metadata = createPaperworkMetadata({
      documentType: 'other',
      loadNumber,
      fileUrl: payload.loading_report_photo,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_loading_report' } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_loading_report' } as Record<string, unknown>,
      }).catch(() => {});
    }
  }

  // Log contract documents (array)
  if (payload.contract_documents && payload.contract_documents.length > 0) {
    const metadata = createPaperworkMetadata({
      documentType: 'other', // contract stored in upload_kind
      loadNumber,
    });

    logStructuredUploadEvent(supabase, {
      entityType: 'load',
      entityId: loadId,
      action: 'paperwork_uploaded',
      performedByUserId: userId,
      performedByCompanyId: companyId,
      source: 'mobile',
      visibility: 'partner',
      metadata: { ...metadata, upload_kind: 'load_contract_documents', file_count: payload.contract_documents.length } as Record<string, unknown>,
    }).catch(() => {});

    if (companyId) {
      recordStructuredUploadMessage(supabase, {
        entityType: 'load',
        entityId: loadId,
        companyId,
        action: 'paperwork_uploaded',
        performerUserId: userId,
        performerDriverId: context?.driver?.id,
        performerName: driverName,
        target: 'internal',
        metadata: { ...metadata, upload_kind: 'load_contract_documents', file_count: payload.contract_documents.length } as Record<string, unknown>,
      }).catch(() => {});
    }
  }
}

// ============================================================================
// DRIVER SETTLEMENT PREVIEW
// ============================================================================

export interface DriverSettlementPreview {
  // Driver pay calculation
  payMode: string;
  grossPay: number;
  payBreakdown: {
    label: string;
    amount: number;
    calculation?: string;
  }[];

  // Reimbursements (driver-paid expenses to be paid back)
  reimbursements: number;
  reimbursementItems: {
    description: string;
    amount: number;
  }[];

  // Collections (cash/check collected by driver, owed to owner)
  collections: number;
  collectionItems: {
    loadNumber: string;
    amount: number;
    method: string;
  }[];

  // Final calculation
  netPay: number; // grossPay + reimbursements - collections

  // Trip metrics used in calculation
  metrics: {
    actualMiles: number;
    totalCuft: number;
    totalRevenue: number;
    daysWorked: number;
  };
}

/**
 * Calculate settlement preview for driver
 * Shows what the driver will earn/owe when the trip is settled
 */
export async function calculateDriverSettlementPreview(
  tripId: string,
  driver: { id: string; owner_id: string }
): Promise<DriverSettlementPreview | null> {
  const supabase = await getDbClient();

  // Get trip detail
  const detail = await getDriverTripDetail(tripId, driver);
  if (!detail?.trip) return null;

  const { trip, loads, expenses } = detail;

  // Get driver pay settings
  const { data: driverData, error: driverError } = await supabase
    .from('drivers')
    .select('pay_mode, rate_per_mile, rate_per_cuft, percent_of_revenue, flat_daily_rate')
    .eq('id', driver.id)
    .eq('owner_id', driver.owner_id)
    .single();

  if (driverError || !driverData) {
    console.error('[calculateDriverSettlementPreview] Failed to load driver pay settings:', driverError?.message);
    return null;
  }

  // Calculate metrics
  const odoStart = Number((trip as any).odometer_start) || 0;
  const odoEnd = Number((trip as any).odometer_end) || 0;
  const actualMiles = odoEnd > odoStart ? odoEnd - odoStart : 0;

  const totalCuft = loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    return sum + (Number(load.actual_cuft_loaded) || 0);
  }, 0);

  const totalRevenue = loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    return sum + (Number(load.total_revenue) || 0);
  }, 0);

  const daysWorked = (() => {
    const startDate = (trip as any).start_date;
    const endDate = (trip as any).end_date;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      return diff + 1;
    }
    return 1;
  })();

  // Calculate gross pay based on pay mode
  let grossPay = 0;
  const payBreakdown: DriverSettlementPreview['payBreakdown'] = [];
  const payMode = (driverData as any).pay_mode || 'per_mile';

  switch (payMode) {
    case 'per_mile': {
      const rate = Number((driverData as any).rate_per_mile) || 0;
      const amount = round(actualMiles * rate);
      grossPay = amount;
      if (rate > 0) {
        payBreakdown.push({
          label: 'Per Mile',
          amount,
          calculation: `${actualMiles.toLocaleString()} mi × $${rate.toFixed(2)}/mi`,
        });
      }
      break;
    }
    case 'per_cuft': {
      const rate = Number((driverData as any).rate_per_cuft) || 0;
      const amount = round(totalCuft * rate);
      grossPay = amount;
      if (rate > 0) {
        payBreakdown.push({
          label: 'Per Cubic Foot',
          amount,
          calculation: `${totalCuft.toLocaleString()} cf × $${rate.toFixed(2)}/cf`,
        });
      }
      break;
    }
    case 'per_mile_and_cuft': {
      const mileRate = Number((driverData as any).rate_per_mile) || 0;
      const cuftRate = Number((driverData as any).rate_per_cuft) || 0;
      const mileAmount = round(actualMiles * mileRate);
      const cuftAmount = round(totalCuft * cuftRate);
      grossPay = mileAmount + cuftAmount;
      if (mileRate > 0) {
        payBreakdown.push({
          label: 'Per Mile',
          amount: mileAmount,
          calculation: `${actualMiles.toLocaleString()} mi × $${mileRate.toFixed(2)}/mi`,
        });
      }
      if (cuftRate > 0) {
        payBreakdown.push({
          label: 'Per Cubic Foot',
          amount: cuftAmount,
          calculation: `${totalCuft.toLocaleString()} cf × $${cuftRate.toFixed(2)}/cf`,
        });
      }
      break;
    }
    case 'percent_of_revenue': {
      const pct = Number((driverData as any).percent_of_revenue) || 0;
      const amount = round(totalRevenue * (pct / 100));
      grossPay = amount;
      if (pct > 0) {
        payBreakdown.push({
          label: 'Percent of Revenue',
          amount,
          calculation: `${pct}% × $${totalRevenue.toFixed(2)}`,
        });
      }
      break;
    }
    case 'flat_daily_rate': {
      const rate = Number((driverData as any).flat_daily_rate) || 0;
      const amount = round(daysWorked * rate);
      grossPay = amount;
      if (rate > 0) {
        payBreakdown.push({
          label: 'Daily Rate',
          amount,
          calculation: `${daysWorked} day${daysWorked !== 1 ? 's' : ''} × $${rate.toFixed(2)}/day`,
        });
      }
      break;
    }
  }

  // Calculate reimbursements (driver-paid expenses)
  let reimbursements = 0;
  const reimbursementItems: DriverSettlementPreview['reimbursementItems'] = [];

  for (const exp of expenses) {
    const paidBy = (exp as any).paid_by || '';
    // Driver-paid methods that get reimbursed
    if (['driver_cash', 'driver_card', 'driver_personal'].includes(paidBy)) {
      const amount = Number(exp.amount) || 0;
      reimbursements += amount;
      reimbursementItems.push({
        description: (exp as any).expense_type || exp.description || 'Expense',
        amount,
      });
    }
  }
  reimbursements = round(reimbursements);

  // Calculate collections (amounts collected by driver that go to owner)
  let collections = 0;
  const collectionItems: DriverSettlementPreview['collectionItems'] = [];

  for (const tl of loads) {
    const load = (tl.load || {}) as any;
    const collected = Number(load.amount_collected_on_delivery) || 0;
    if (collected > 0) {
      collections += collected;
      collectionItems.push({
        loadNumber: load.load_number || tl.load_id,
        amount: collected,
        method: load.payment_method || 'cash',
      });
    }
  }
  collections = round(collections);

  // Net pay = Gross + Reimbursements - Collections
  const netPay = round(grossPay + reimbursements - collections);

  return {
    payMode,
    grossPay,
    payBreakdown,
    reimbursements,
    reimbursementItems,
    collections,
    collectionItems,
    netPay,
    metrics: {
      actualMiles,
      totalCuft,
      totalRevenue,
      daysWorked,
    },
  };
}

/**
 * Get driver pay settings for display
 */
export async function getDriverPaySettings(driver: { id: string; owner_id: string }) {
  const supabase = await getDbClient();

  const { data, error } = await supabase
    .from('drivers')
    .select('pay_mode, rate_per_mile, rate_per_cuft, percent_of_revenue, flat_daily_rate, pay_notes')
    .eq('id', driver.id)
    .eq('owner_id', driver.owner_id)
    .single();

  if (error) {
    console.error('[getDriverPaySettings] Failed:', error.message);
    return null;
  }

  return data;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// TRIP COMPLETION
// ============================================================================

export interface TripCompletionCheck {
  canComplete: boolean;
  totalLoads: number;
  deliveredLoads: number;
  pendingLoads: {
    loadId: string;
    loadNumber: string;
    status: string;
    destinationCity?: string;
    destinationState?: string;
  }[];
  hasOdometerEnd: boolean;
  reason?: string;
}

/**
 * Check if a trip can be completed
 */
export function checkTripCanComplete(
  trip: { status: string; odometer_end?: number | null },
  loads: { load_id: string; load?: any }[]
): TripCompletionCheck {
  const totalLoads = loads.length;

  const deliveredLoads = loads.filter(tl => {
    const status = (tl.load as any)?.load_status;
    return status === 'delivered' || status === 'storage_completed';
  }).length;

  const pendingLoads = loads
    .filter(tl => {
      const status = (tl.load as any)?.load_status;
      return status !== 'delivered' && status !== 'storage_completed';
    })
    .map(tl => ({
      loadId: tl.load_id,
      loadNumber: (tl.load as any)?.load_number || tl.load_id,
      status: (tl.load as any)?.load_status || 'pending',
      destinationCity: (tl.load as any)?.destination_city || (tl.load as any)?.delivery_city,
      destinationState: (tl.load as any)?.destination_state || (tl.load as any)?.delivery_state,
    }));

  const hasOdometerEnd = trip.odometer_end != null && Number(trip.odometer_end) > 0;

  // Determine if trip can be completed
  let canComplete = false;
  let reason: string | undefined;

  if (trip.status !== 'active' && trip.status !== 'en_route') {
    reason = `Trip is ${trip.status}, must be active to complete`;
  } else if (totalLoads === 0) {
    reason = 'Trip has no loads';
  } else if (deliveredLoads < totalLoads) {
    reason = `${totalLoads - deliveredLoads} load(s) still pending delivery`;
  } else if (!hasOdometerEnd) {
    reason = 'Please enter odometer end reading first';
  } else {
    canComplete = true;
  }

  return {
    canComplete,
    totalLoads,
    deliveredLoads,
    pendingLoads,
    hasOdometerEnd,
    reason,
  };
}

export interface TripTotals {
  totalRevenue: number;
  totalCollected: number;
  receivables: number;
  totalExpenses: number;
  companyPaidExpenses: number;
  driverPaidExpenses: number;
  totalCuft: number;
  actualMiles: number;
}

/**
 * Calculate trip totals for display
 */
export function calculateTripTotals(
  trip: { odometer_start?: number | null; odometer_end?: number | null },
  loads: { load?: any }[],
  expenses: { amount: number; paid_by?: string }[]
): TripTotals {
  // Calculate load totals
  const totalRevenue = loads.reduce((sum, tl) => {
    const load = tl.load || {};
    return sum + (Number(load.total_revenue) || 0);
  }, 0);

  const totalCollected = loads.reduce((sum, tl) => {
    const load = tl.load || {};
    return sum + (Number(load.amount_collected_on_delivery) || 0);
  }, 0);

  const totalCuft = loads.reduce((sum, tl) => {
    const load = tl.load || {};
    return sum + (Number(load.actual_cuft_loaded) || 0);
  }, 0);

  // Calculate expense totals
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const companyPaidExpenses = expenses
    .filter(e => ['company_card', 'fuel_card', 'efs_card', 'comdata'].includes((e as any).paid_by || ''))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const driverPaidExpenses = totalExpenses - companyPaidExpenses;

  // Calculate miles
  const odoStart = Number(trip.odometer_start) || 0;
  const odoEnd = Number(trip.odometer_end) || 0;
  const actualMiles = odoEnd > odoStart ? odoEnd - odoStart : 0;

  return {
    totalRevenue: round(totalRevenue),
    totalCollected: round(totalCollected),
    receivables: round(totalRevenue - totalCollected),
    totalExpenses: round(totalExpenses),
    companyPaidExpenses: round(companyPaidExpenses),
    driverPaidExpenses: round(driverPaidExpenses),
    totalCuft: round(totalCuft),
    actualMiles: round(actualMiles),
  };
}

/**
 * Complete a trip (driver-side)
 */
export async function driverCompleteTrip(
  tripId: string,
  data: { completion_notes?: string },
  driver: { id: string; owner_id: string; first_name?: string; last_name?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getDbClient();

  // Get trip detail to verify completion eligibility
  const detail = await getDriverTripDetail(tripId, driver);
  if (!detail?.trip) {
    return { success: false, error: 'Trip not found' };
  }

  const { trip, loads } = detail;

  // Check if trip can be completed
  const check = checkTripCanComplete(
    { status: trip.status, odometer_end: trip.odometer_end },
    loads
  );

  if (!check.canComplete) {
    return { success: false, error: check.reason || 'Cannot complete trip' };
  }

  // Complete the trip
  const { error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_notes: data.completion_notes || null,
    })
    .eq('id', tripId)
    .eq('owner_id', driver.owner_id);

  if (error) {
    console.error('[driverCompleteTrip] Error:', error);
    return { success: false, error: error.message };
  }

  // Log activity
  const odoStart = Number((trip as any).odometer_start) || 0;
  const odoEnd = Number((trip as any).odometer_end) || 0;
  const totalMiles = odoEnd > odoStart ? odoEnd - odoStart : 0;
  const loadsDelivered = loads.filter(tl => {
    const status = (tl.load as any)?.load_status;
    return status === 'delivered' || status === 'storage_completed';
  }).length;

  const driverName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver';
  await logActivity({
    ownerId: driver.owner_id,
    driverId: driver.id,
    driverName,
    activityType: 'trip_completed',
    tripId,
    tripNumber: (trip as any).trip_number,
    title: `${driverName} completed Trip ${(trip as any).trip_number || tripId.slice(0, 8)}`,
    description: `${totalMiles.toLocaleString()} miles • ${loadsDelivered} load${loadsDelivered !== 1 ? 's' : ''} delivered`,
    metadata: { totalMiles, loadsDelivered, odometerStart: odoStart, odometerEnd: odoEnd },
  });

  return { success: true };
}

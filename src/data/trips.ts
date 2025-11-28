import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import type { Load } from '@/data/loads';
import { computeTripFinancialsWithDriverPay, snapshotDriverCompensation, type TripFinancialResult } from '@/data/trip-financials';

export const tripStatusSchema = z.enum(['planned', 'active', 'en_route', 'completed', 'settled', 'cancelled']);
export const tripExpenseCategorySchema = z.enum([
  'fuel',
  'tolls',
  'driver_pay',
  'lumper',
  'parking',
  'maintenance',
  'other',
]);
export const tripLoadRoleSchema = z.enum(['primary', 'backhaul', 'partial']);

const optionalDateSchema = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Invalid date' });

const optionalTrimmedString = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined));

export const newTripInputSchema = z.object({
  trip_number: z.string().trim().min(1, 'Trip number is required').max(100),
  status: tripStatusSchema.optional().default('planned'),
  driver_id: z.string().uuid().optional(),
  truck_id: z.string().uuid().optional(),
  trailer_id: z.string().uuid().optional(),
  origin_city: optionalTrimmedString(100),
  origin_state: optionalTrimmedString(50),
  origin_postal_code: optionalTrimmedString(20),
  destination_city: optionalTrimmedString(100),
  destination_state: optionalTrimmedString(50),
  destination_postal_code: optionalTrimmedString(20),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  total_miles: z.coerce.number().nonnegative().optional(),
  odometer_start: z.coerce.number().nonnegative().optional(),
  odometer_start_photo_url: optionalTrimmedString(1000),
  odometer_end: z.coerce.number().nonnegative().optional(),
  odometer_end_photo_url: optionalTrimmedString(1000),
  notes: optionalTrimmedString(5000),
  share_driver_with_companies: z.boolean().optional().default(true),
});

export const updateTripInputSchema = newTripInputSchema.partial();

export const addTripLoadInputSchema = z.object({
  load_id: z.string().uuid(),
  sequence_index: z.coerce.number().int().min(0).optional().default(0),
  role: tripLoadRoleSchema.optional().default('primary'),
});

export const newTripExpenseInputSchema = z.object({
  trip_id: z.string().uuid(),
  category: tripExpenseCategorySchema,
  description: optionalTrimmedString(1000),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  incurred_at: optionalDateSchema,
  expense_type: z.string().trim().optional(),
  paid_by: z.enum(['driver_personal', 'driver_cash', 'company_card', 'fuel_card']).optional(),
  receipt_photo_url: z.string().trim().min(1, 'Receipt photo is required'),
  notes: optionalTrimmedString(2000),
});

export const updateTripExpenseInputSchema = newTripExpenseInputSchema.omit({ trip_id: true }).partial();

export type TripStatus = z.infer<typeof tripStatusSchema>;
export type TripExpenseCategory = z.infer<typeof tripExpenseCategorySchema>;
export type TripLoadRole = z.infer<typeof tripLoadRoleSchema>;
export type NewTripInput = z.infer<typeof newTripInputSchema>;
export type UpdateTripInput = z.infer<typeof updateTripInputSchema>;
export type AddTripLoadInput = z.infer<typeof addTripLoadInputSchema>;
export type NewTripExpenseInput = z.infer<typeof newTripExpenseInputSchema>;
export type UpdateTripExpenseInput = z.infer<typeof updateTripExpenseInputSchema>;

export interface Trip {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  trip_number: string;
  status: TripStatus;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_postal_code: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_postal_code: string | null;
  start_date: string | null;
  end_date: string | null;
  total_miles: number | null;
  revenue_total: number;
  driver_pay_total: number;
  fuel_total: number;
  tolls_total: number;
  other_expenses_total: number;
  profit_total: number;
  notes: string | null;
  driver?: { id: string; first_name: string; last_name: string; phone?: string | null } | null;
  truck?: { id: string; unit_number: string } | null;
  trailer?: { id: string; unit_number: string } | null;
  // Driver pay calculation fields
  driver_pay_breakdown: { payMode: string; basePay: number; breakdown: Record<string, unknown>; totalDriverPay: number } | null;
  total_cuft: number | null;
  // Snapshot fields for driver compensation at time of assignment
  trip_pay_mode: string | null;
  trip_rate_per_mile: number | null;
  trip_rate_per_cuft: number | null;
  trip_percent_of_revenue: number | null;
  trip_flat_daily_rate: number | null;
  // Driver sharing with companies
  share_driver_with_companies?: boolean;
}

export interface TripLoad {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  trip_id: string;
  load_id: string;
  sequence_index: number;
  role: TripLoadRole;
  load?: (Load & {
    company?: { id: string; name: string } | null;
  }) | null;
}

export interface TripExpense {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  trip_id: string;
  category: TripExpenseCategory;
  description: string | null;
  amount: number;
  incurred_at: string;
  expense_type?: string | null;
  paid_by?: 'driver_personal' | 'driver_cash' | 'company_card' | 'fuel_card' | null;
  receipt_photo_url: string;
  notes?: string | null;
}

export interface TripFilters {
  status?: TripStatus | 'all';
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TripStats {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  profitLast30Days: number;
}

export type TripWithDetails = Trip & {
  driver?: any;
  company?: any;
  truck?: any;
  trailer?: any;
  // keep any other existing fields that were already here
  loads: TripLoad[];
  expenses: TripExpense[];

  // Fields required by /dashboard/trips/[id]/page.tsx
  odometer_start?: number | null;
  odometer_end?: number | null;
  odometer_start_photo_url?: string | null;
  odometer_end_photo_url?: string | null;
  actual_miles?: number | null;
};

interface TripFinancialSummary {
  revenue_total: number;
  driver_pay_total: number;
  fuel_total: number;
  tolls_total: number;
  other_expenses_total: number;
  profit_total: number;
  odometer_start?: number | null;
  odometer_end?: number | null;
  odometer_start_photo_url?: string | null;
  odometer_end_photo_url?: string | null;
  actual_miles?: number | null;
}

type TablesWithOwner = 'drivers' | 'trucks' | 'trailers' | 'loads' | 'trips';

async function assertOwnership(
  supabase: SupabaseClient,
  table: TablesWithOwner,
  id: string | null | undefined,
  userId: string,
  friendlyName: string
) {
  if (!id) return;
  const { error } = await supabase.from(table).select('id').eq('id', id).eq('owner_id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`${friendlyName} not found or you do not have access to it`);
    }
    throw new Error(`Failed to verify ${friendlyName}: ${error.message}`);
  }
}

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : (value as T);
}

function normalizeDate(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString().split('T')[0];
}

async function computeTripFinancialSummary(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  options?: { tripLoads?: TripLoad[]; expenses?: TripExpense[] }
): Promise<TripFinancialSummary> {
  let tripLoads = options?.tripLoads;
  if (!tripLoads) {
    const { data, error } = await supabase
      .from('trip_loads')
      .select('*, load:loads!trip_loads_load_id_fkey(id, total_rate)')
      .eq('trip_id', tripId)
      .eq('owner_id', userId);
    if (error) {
      throw new Error(`Failed to load trip loads for financials: ${error.message}`);
    }
    tripLoads = (data || []) as TripLoad[];
  }

  let expenses = options?.expenses;
  if (!expenses) {
    const { data, error } = await supabase
      .from('trip_expenses')
      .select('id, owner_id, created_at, updated_at, trip_id, category, description, amount, incurred_at')
      .eq('trip_id', tripId)
      .eq('owner_id', userId);
    if (error) {
      throw new Error(`Failed to load trip expenses for financials: ${error.message}`);
    }
    expenses = (data || []) as TripExpense[];
  }

  const revenue_total = tripLoads.reduce((sum, tl) => {
    const loadRevenue = tl.load?.total_rate ?? 0;
    return sum + (typeof loadRevenue === 'number' ? loadRevenue : 0);
  }, 0);

  let driver_pay_total = 0;
  let fuel_total = 0;
  let tolls_total = 0;
  let other_expenses_total = 0;

  for (const expense of expenses) {
    switch (expense.category) {
      case 'driver_pay':
        driver_pay_total += expense.amount;
        break;
      case 'fuel':
        fuel_total += expense.amount;
        break;
      case 'tolls':
        tolls_total += expense.amount;
        break;
      default:
        other_expenses_total += expense.amount;
        break;
    }
  }

  const profit_total = revenue_total - (driver_pay_total + fuel_total + tolls_total + other_expenses_total);

  const summary: TripFinancialSummary = {
    revenue_total,
    driver_pay_total,
    fuel_total,
    tolls_total,
    other_expenses_total,
    profit_total,
  };

  const { error: updateError } = await supabase
    .from('trips')
    .update(summary)
    .eq('id', tripId)
    .eq('owner_id', userId);
  if (updateError) {
    throw new Error(`Failed to update trip financial summary: ${updateError.message}`);
  }

  return summary;
}

export async function getTripStatsForUser(userId: string): Promise<TripStats> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().split('T')[0];

  const [totalResult, activeResult, completedResult, profitResult] = await Promise.all([
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', ['planned', 'en_route']),
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('trips')
      .select('profit_total')
      .eq('owner_id', userId)
      .gte('start_date', thirtyDaysAgoIso),
  ]);

  if (totalResult.error) {
    throw new Error(`Failed to count trips: ${totalResult.error.message}`);
  }
  if (activeResult.error) {
    throw new Error(`Failed to count active trips: ${activeResult.error.message}`);
  }
  if (completedResult.error) {
    throw new Error(`Failed to count completed trips: ${completedResult.error.message}`);
  }
  if (profitResult.error) {
    throw new Error(`Failed to calculate profit: ${profitResult.error.message}`);
  }

  type ProfitRow = { profit_total: number | null };
  const profitRows = (profitResult.data || []) as ProfitRow[];
  const profitLast30Days = profitRows.reduce((sum, trip) => {
    const value = typeof trip.profit_total === 'number' ? trip.profit_total : 0;
    return sum + value;
  }, 0);

  return {
    totalTrips: totalResult.count || 0,
    activeTrips: activeResult.count || 0,
    completedTrips: completedResult.count || 0,
    profitLast30Days,
  };
}

export interface TripNeedingSettlement {
  id: string;
  trip_number: string;
  status: TripStatus;
  completed_at: string | null;
  settlement_status: string | null;
  driver: { id: string; first_name: string; last_name: string } | null;
  // Financial preview
  revenue_total: number;
  driver_pay_total: number;
  fuel_total: number;
  tolls_total: number;
  other_expenses_total: number;
  profit_total: number;
  actual_miles: number | null;
  total_cuft: number | null;
}

/**
 * Get trips that are completed but need settlement review/payment
 */
export async function getTripsNeedingSettlement(userId: string): Promise<TripNeedingSettlement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      id,
      trip_number,
      status,
      completed_at,
      settlement_status,
      revenue_total,
      driver_pay_total,
      fuel_total,
      tolls_total,
      other_expenses_total,
      profit_total,
      actual_miles,
      total_cuft,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name)
    `
    )
    .eq('owner_id', userId)
    .eq('status', 'completed')
    .or('settlement_status.is.null,settlement_status.eq.pending,settlement_status.eq.review')
    .order('completed_at', { ascending: false });

  if (error) {
    // If settlement_status column doesn't exist yet, fall back to just completed trips
    if (error.message.includes('column') || error.code === '42703') {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('trips')
        .select(
          `
          id,
          trip_number,
          status,
          completed_at,
          revenue_total,
          driver_pay_total,
          fuel_total,
          tolls_total,
          other_expenses_total,
          profit_total,
          actual_miles,
          total_cuft,
          driver:drivers!trips_driver_id_fkey(id, first_name, last_name)
        `
        )
        .eq('owner_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (fallbackError) {
        throw new Error(`Failed to get trips needing settlement: ${fallbackError.message}`);
      }

      return (fallbackData || []).map((row: any) => ({
        ...row,
        settlement_status: null,
        driver: Array.isArray(row.driver) ? row.driver[0] : row.driver,
      }));
    }
    throw new Error(`Failed to get trips needing settlement: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    ...row,
    driver: Array.isArray(row.driver) ? row.driver[0] : row.driver,
  }));
}

export async function listTripsForUser(userId: string, filters?: TripFilters): Promise<Trip[]> {
  const supabase = await createClient();

  let query = supabase
    .from('trips')
    .select(
      `
      *,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name),
      truck:trucks!trips_truck_id_fkey(id, unit_number),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number)
    `
    )
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }

  if (filters?.dateFrom) {
    query = query.gte('start_date', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('start_date', filters.dateTo);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      [
        `trip_number.ilike.${term}`,
        `origin_city.ilike.${term}`,
        `origin_state.ilike.${term}`,
        `destination_city.ilike.${term}`,
        `destination_state.ilike.${term}`,
      ].join(',')
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch trips: ${error.message}`);
  }

  return (data || []) as Trip[];
}

export async function getTripById(id: string, userId: string): Promise<TripWithDetails | null> {
  const supabase = await createClient();

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      *,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name),
      truck:trucks!trips_truck_id_fkey(id, unit_number, cubic_capacity, truck_type),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number, cubic_capacity)
    `
    )
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (tripError) {
    if (tripError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch trip: ${tripError.message}`);
  }

  const [{ data: loadRows, error: loadError }, { data: expenseRows, error: expenseError }] = await Promise.all([
    supabase
      .from('trip_loads')
      .select(
        `
        *,
        load:loads!trip_loads_load_id_fkey(
          *,
          company:companies!loads_company_id_fkey(id, name)
        )
      `
      )
      .eq('trip_id', id)
      .eq('owner_id', userId)
      .order('sequence_index', { ascending: true }),
    supabase
      .from('trip_expenses')
      .select('*')
      .eq('trip_id', id)
      .eq('owner_id', userId)
      .order('incurred_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (loadError) {
    throw new Error(`Failed to load trip loads: ${loadError.message}`);
  }
  if (expenseError) {
    throw new Error(`Failed to load trip expenses: ${expenseError.message}`);
  }

  const loads = (loadRows || []) as TripLoad[];
  const expenses = (expenseRows || []) as TripExpense[];

  const summary: TripFinancialResult = await computeTripFinancialsWithDriverPay(supabase, id, userId, { tripLoads: loads, expenses });

  return {
    ...(trip as Trip),
    ...summary,
    loads,
    expenses,
  };
}

export async function createTrip(input: NewTripInput, userId: string): Promise<Trip> {
  const supabase = await createClient();
  await Promise.all([
    assertOwnership(supabase, 'drivers', input.driver_id, userId, 'Driver'),
    assertOwnership(supabase, 'trucks', input.truck_id, userId, 'Truck'),
    assertOwnership(supabase, 'trailers', input.trailer_id, userId, 'Trailer'),
  ]);

  const payload = {
    owner_id: userId,
    trip_number: input.trip_number,
    status: input.status ?? 'planned',
    driver_id: nullable(input.driver_id),
    truck_id: nullable(input.truck_id),
    trailer_id: nullable(input.trailer_id),
    origin_city: nullable(input.origin_city),
    origin_state: nullable(input.origin_state),
    origin_postal_code: nullable(input.origin_postal_code),
    destination_city: nullable(input.destination_city),
    destination_state: nullable(input.destination_state),
    destination_postal_code: nullable(input.destination_postal_code),
    start_date: normalizeDate(input.start_date),
    end_date: normalizeDate(input.end_date),
    total_miles: input.total_miles ?? null,
    notes: nullable(input.notes),
    share_driver_with_companies: input.share_driver_with_companies ?? true,
  };

  const { data, error } = await supabase
    .from('trips')
    .insert(payload)
    .select(
      `
      *,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name),
      truck:trucks!trips_truck_id_fkey(id, unit_number),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number)
    `
    )
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Trip number must be unique for your account');
    }
    throw new Error(`Failed to create trip: ${error.message}`);
  }

  return data as Trip;
}

export async function updateTrip(
  id: string,
  input: UpdateTripInput,
  userId: string,
  clientOverride?: SupabaseClient | null
): Promise<Trip> {
  const supabase = clientOverride ?? (await createClient());

  const { data: currentTrip, error: fetchError } = await supabase
    .from('trips')
    .select('status, driver_id, odometer_start, odometer_end, odometer_start_photo_url, odometer_end_photo_url')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch trip for update: ${fetchError.message}`);
  }

  await Promise.all([
    assertOwnership(supabase, 'trips', id, userId, 'Trip'),
    assertOwnership(supabase, 'drivers', input.driver_id, userId, 'Driver'),
    assertOwnership(supabase, 'trucks', input.truck_id, userId, 'Truck'),
    assertOwnership(supabase, 'trailers', input.trailer_id, userId, 'Trailer'),
  ]);

  const payload: Record<string, string | number | boolean | null> = {};

  const nextStatus = input.status ?? (currentTrip as any).status;
  const nextOdometerStart = input.odometer_start ?? (currentTrip as any).odometer_start;
  const nextOdometerEnd = input.odometer_end ?? (currentTrip as any).odometer_end;
  const nextOdoStartPhoto = input.odometer_start_photo_url ?? (currentTrip as any).odometer_start_photo_url;
  const nextOdoEndPhoto = input.odometer_end_photo_url ?? (currentTrip as any).odometer_end_photo_url;

  // Enforce status transitions and odometer requirements
  if ((currentTrip as any).status === 'planned' && nextStatus === 'active') {
    if (nextOdometerStart == null || nextOdoStartPhoto == null || nextOdoStartPhoto === '') {
      throw new Error('You must enter the starting odometer and upload a start photo to activate this trip.');
    }
  }

  const isClosing = nextStatus === 'completed' || nextStatus === 'settled';
  if (isClosing) {
    if (
      nextOdometerStart == null ||
      nextOdoStartPhoto == null ||
      nextOdometerEnd == null ||
      nextOdoEndPhoto == null ||
      nextOdoStartPhoto === '' ||
      nextOdoEndPhoto === ''
    ) {
      throw new Error('Odometer start/end and photos are required to complete/settle this trip.');
    }
    const actualMiles = Number(nextOdometerEnd) - Number(nextOdometerStart);
    if (!Number.isFinite(actualMiles) || actualMiles <= 0) {
      throw new Error('Actual miles must be greater than zero to settle this trip.');
    }
    payload.actual_miles = actualMiles;
    payload.total_miles = actualMiles;
  }

  if (input.trip_number !== undefined) payload.trip_number = input.trip_number;
  if (input.status !== undefined) payload.status = input.status;
  if (input.driver_id !== undefined) payload.driver_id = nullable(input.driver_id);
  if (input.truck_id !== undefined) payload.truck_id = nullable(input.truck_id);
  if (input.trailer_id !== undefined) payload.trailer_id = nullable(input.trailer_id);
  if (input.origin_city !== undefined) payload.origin_city = nullable(input.origin_city);
  if (input.origin_state !== undefined) payload.origin_state = nullable(input.origin_state);
  if (input.origin_postal_code !== undefined) payload.origin_postal_code = nullable(input.origin_postal_code);
  if (input.destination_city !== undefined) payload.destination_city = nullable(input.destination_city);
  if (input.destination_state !== undefined) payload.destination_state = nullable(input.destination_state);
  if (input.destination_postal_code !== undefined)
    payload.destination_postal_code = nullable(input.destination_postal_code);
  if (input.start_date !== undefined) payload.start_date = normalizeDate(input.start_date);
  if (input.end_date !== undefined) payload.end_date = normalizeDate(input.end_date);
  if (input.total_miles !== undefined) payload.total_miles = input.total_miles ?? null;
  if (input.odometer_start !== undefined) payload.odometer_start = input.odometer_start ?? null;
  if (input.odometer_end !== undefined) payload.odometer_end = input.odometer_end ?? null;
  if (input.odometer_start_photo_url !== undefined) payload.odometer_start_photo_url = nullable(input.odometer_start_photo_url);
  if (input.odometer_end_photo_url !== undefined) payload.odometer_end_photo_url = nullable(input.odometer_end_photo_url);
  if (input.notes !== undefined) payload.notes = nullable(input.notes);

  const { data, error } = await supabase
    .from('trips')
    .update(payload)
    .eq('id', id)
    .eq('owner_id', userId)
    .select(
      `
      *,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name),
      truck:trucks!trips_truck_id_fkey(id, unit_number),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number)
    `
    )
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Trip not found or you do not have permission to update it');
    }
    if (error.code === '23505') {
      throw new Error('Trip number must be unique for your account');
    }
    throw new Error(`Failed to update trip: ${error.message}`);
  }

  // Snapshot driver compensation rates when driver is assigned/changed
  if (input.driver_id && input.driver_id !== (currentTrip as any).driver_id) {
    await snapshotDriverCompensation(supabase, id, input.driver_id, userId);

    // Sync driver info to all loads on this trip
    // Get trip's sharing preference (default to true if not set)
    const { data: tripData } = await supabase
      .from('trips')
      .select('share_driver_with_companies')
      .eq('id', id)
      .single();
    const shareWithCompanies = tripData?.share_driver_with_companies !== false;
    await syncTripDriverToLoads(id, input.driver_id, shareWithCompanies);
  }

  // If driver is being removed, clear driver info from loads
  if (input.driver_id === undefined && (currentTrip as any).driver_id) {
    // Driver being cleared - clear from loads too
    const { data: tripLoads } = await supabase
      .from('trip_loads')
      .select('load_id')
      .eq('trip_id', id);

    if (tripLoads && tripLoads.length > 0) {
      const loadIds = tripLoads.map((tl) => tl.load_id);
      await supabase
        .from('loads')
        .update({
          assigned_driver_id: null,
          assigned_driver_name: null,
          assigned_driver_phone: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', loadIds);
    }
  }

  return data as Trip;
}

export async function deleteTrip(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('trips').delete().eq('id', id).eq('owner_id', userId);
  if (error) {
    throw new Error(`Failed to delete trip: ${error.message}`);
  }
}

export async function addLoadToTrip(
  tripId: string,
  input: AddTripLoadInput,
  userId: string
): Promise<TripLoad | null> {
  const supabase = await createClient();

  await Promise.all([
    assertOwnership(supabase, 'trips', tripId, userId, 'Trip'),
    assertOwnership(supabase, 'loads', input.load_id, userId, 'Load'),
  ]);

  // Get trip info to check for driver
  const { data: trip } = await supabase
    .from('trips')
    .select('driver_id, share_driver_with_companies')
    .eq('id', tripId)
    .single();

  const payload = {
    owner_id: userId,
    trip_id: tripId,
    load_id: input.load_id,
    sequence_index: input.sequence_index ?? 0,
    role: input.role ?? 'primary',
  };

  const { data, error } = await supabase
    .from('trip_loads')
    .insert(payload)
    .select(
      `
      *,
      load:loads!trip_loads_load_id_fkey(
        *,
        company:companies!loads_company_id_fkey(id, name)
      )
    `
    )
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This load is already attached to the trip');
    }
    throw new Error(`Failed to add load to trip: ${error.message}`);
  }

  // If trip has driver, sync to this newly added load
  if (trip?.driver_id) {
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, first_name, last_name, phone')
      .eq('id', trip.driver_id)
      .single();

    if (driver) {
      const shareWithCompanies = trip.share_driver_with_companies !== false;
      if (shareWithCompanies) {
        await supabase
          .from('loads')
          .update({
            assigned_driver_id: driver.id,
            assigned_driver_name: `${driver.first_name} ${driver.last_name}`,
            assigned_driver_phone: driver.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.load_id);
      } else {
        // Driver exists but not sharing
        await supabase
          .from('loads')
          .update({
            assigned_driver_id: driver.id,
            assigned_driver_name: null,
            assigned_driver_phone: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.load_id);
      }
    }
  }

  await computeTripFinancialSummary(supabase, tripId, userId);
  return data as TripLoad;
}

export async function removeLoadFromTrip(tripId: string, loadId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  await assertOwnership(supabase, 'trips', tripId, userId, 'Trip');

  const { error } = await supabase
    .from('trip_loads')
    .delete()
    .eq('trip_id', tripId)
    .eq('load_id', loadId)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to remove load from trip: ${error.message}`);
  }

  await computeTripFinancialSummary(supabase, tripId, userId);
}

export async function reorderTripLoads(
  tripId: string,
  items: { load_id: string; sequence_index: number }[],
  userId: string
): Promise<void> {
  if (!items.length) return;

  const supabase = await createClient();
  await assertOwnership(supabase, 'trips', tripId, userId, 'Trip');

  const updates = items.map((item) =>
    supabase
      .from('trip_loads')
      .update({ sequence_index: item.sequence_index })
      .eq('trip_id', tripId)
      .eq('load_id', item.load_id)
      .eq('owner_id', userId)
  );

  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) {
      throw new Error(`Failed to reorder trip loads: ${result.error.message}`);
    }
  }
}

export async function listTripExpenses(tripId: string, userId: string): Promise<TripExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .eq('owner_id', userId)
    .order('incurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch trip expenses: ${error.message}`);
  }

  return (data || []) as TripExpense[];
}

export async function createTripExpense(
  input: NewTripExpenseInput,
  userId: string,
  clientOverride?: SupabaseClient | null
): Promise<TripExpense> {
  const supabase = clientOverride ?? (await createClient());
  await assertOwnership(supabase, 'trips', input.trip_id, userId, 'Trip');

  if (!input.receipt_photo_url || input.receipt_photo_url.trim().length === 0) {
    throw new Error('Receipt photo is required for expenses.');
  }

  const payload = {
    owner_id: userId,
    trip_id: input.trip_id,
    category: input.category,
    description: nullable(input.description),
    amount: input.amount,
    incurred_at: normalizeDate(input.incurred_at) ?? new Date().toISOString().split('T')[0],
    expense_type: nullable(input.expense_type),
    paid_by: nullable(input.paid_by as any),
    receipt_photo_url: input.receipt_photo_url.trim(),
    notes: nullable(input.notes),
  };

  const { data, error } = await supabase.from('trip_expenses').insert(payload).select('*').single();
  if (error) {
    throw new Error(`Failed to create trip expense: ${error.message}`);
  }

  await computeTripFinancialSummary(supabase, input.trip_id, userId);
  return data as TripExpense;
}

export async function updateTripExpense(
  id: string,
  input: UpdateTripExpenseInput,
  userId: string,
  clientOverride?: SupabaseClient | null
): Promise<TripExpense> {
  const supabase = clientOverride ?? (await createClient());

  const updatePayload: Record<string, string | number | boolean | null> = {};
  if (input.category !== undefined) updatePayload.category = input.category;
  if (input.description !== undefined) updatePayload.description = nullable(input.description);
  if (input.amount !== undefined) updatePayload.amount = input.amount;
  if (input.incurred_at !== undefined) {
    updatePayload.incurred_at = normalizeDate(input.incurred_at) ?? new Date().toISOString().split('T')[0];
  }
  if (input.expense_type !== undefined) updatePayload.expense_type = nullable(input.expense_type);
  if (input.paid_by !== undefined) updatePayload.paid_by = nullable(input.paid_by as any);
  if (input.receipt_photo_url !== undefined) {
    if (!input.receipt_photo_url || input.receipt_photo_url.trim().length === 0) {
      throw new Error('Receipt photo is required for expenses.');
    }
    updatePayload.receipt_photo_url = input.receipt_photo_url.trim();
  }
  if (input.notes !== undefined) updatePayload.notes = nullable(input.notes);

  const { data, error } = await supabase
    .from('trip_expenses')
    .update(updatePayload)
    .eq('id', id)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Expense not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update trip expense: ${error.message}`);
  }

  await computeTripFinancialSummary(supabase, data.trip_id, userId);
  return data as TripExpense;
}

export async function deleteTripExpense(
  id: string,
  userId: string,
  clientOverride?: SupabaseClient | null
): Promise<void> {
  const supabase = clientOverride ?? (await createClient());

  const { data, error } = await supabase
    .from('trip_expenses')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
    .select('trip_id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Expense not found or you do not have permission to delete it');
    }
    throw new Error(`Failed to delete trip expense: ${error.message}`);
  }

  await computeTripFinancialSummary(supabase, data.trip_id, userId);
}

/**
 * Get trips available for load assignment.
 * Returns planned, active, and en_route trips that can have new loads assigned.
 */
export async function getTripsForLoadAssignment(userId: string): Promise<Trip[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      driver:drivers!trips_driver_id_fkey(id, first_name, last_name),
      truck:trucks!trips_truck_id_fkey(id, unit_number),
      trailer:trailers!trips_trailer_id_fkey(id, unit_number)
    `
    )
    .eq('owner_id', userId)
    .in('status', ['planned', 'active', 'en_route'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching trips for load assignment:', error);
    return [];
  }

  return (data || []) as Trip[];
}

/**
 * Sync driver info from trip to all loads on that trip
 */
export async function syncTripDriverToLoads(
  tripId: string,
  driverId: string,
  shareWithCompanies: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get driver info
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, phone')
    .eq('id', driverId)
    .single();

  if (!driver) {
    return { success: false, error: 'Driver not found' };
  }

  const driverName = `${driver.first_name} ${driver.last_name}`;
  const driverPhone = driver.phone || null;

  // Get all loads on this trip
  const { data: tripLoads } = await supabase
    .from('trip_loads')
    .select('load_id')
    .eq('trip_id', tripId);

  if (!tripLoads || tripLoads.length === 0) {
    return { success: true }; // No loads to update
  }

  const loadIds = tripLoads.map((tl) => tl.load_id);

  // Update all loads with driver info (only if sharing enabled)
  if (shareWithCompanies) {
    const { error } = await supabase
      .from('loads')
      .update({
        assigned_driver_id: driver.id,
        assigned_driver_name: driverName,
        assigned_driver_phone: driverPhone,
        updated_at: new Date().toISOString(),
      })
      .in('id', loadIds);

    if (error) {
      console.error('Error syncing driver to loads:', error);
      return { success: false, error: error.message };
    }
  } else {
    // If not sharing, clear driver info from loads (company sees "Contact carrier")
    const { error } = await supabase
      .from('loads')
      .update({
        assigned_driver_id: driver.id, // Keep internal reference
        assigned_driver_name: null, // But don't share name
        assigned_driver_phone: null, // Or phone
        updated_at: new Date().toISOString(),
      })
      .in('id', loadIds);

    if (error) {
      console.error('Error clearing driver from loads:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

/**
 * Update trip driver and sync to loads
 */
export async function updateTripDriver(
  tripId: string,
  driverId: string,
  shareWithCompanies: boolean = true,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Update trip with driver and sharing preference
  const { error: tripError } = await supabase
    .from('trips')
    .update({
      driver_id: driverId,
      share_driver_with_companies: shareWithCompanies,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .eq('owner_id', userId);

  if (tripError) {
    console.error('Error updating trip driver:', tripError);
    return { success: false, error: tripError.message };
  }

  // Snapshot driver compensation rates
  await snapshotDriverCompensation(supabase, tripId, driverId, userId);

  // Sync to loads
  return syncTripDriverToLoads(tripId, driverId, shareWithCompanies);
}

/**
 * Update driver sharing preference and re-sync loads
 */
export async function updateTripDriverSharing(
  tripId: string,
  shareWithCompanies: boolean,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get trip's current driver
  const { data: trip } = await supabase
    .from('trips')
    .select('driver_id')
    .eq('id', tripId)
    .eq('owner_id', userId)
    .single();

  if (!trip) {
    return { success: false, error: 'Trip not found' };
  }

  // Update sharing preference
  const { error: updateError } = await supabase
    .from('trips')
    .update({
      share_driver_with_companies: shareWithCompanies,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .eq('owner_id', userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // If trip has a driver, re-sync loads with new sharing preference
  if (trip.driver_id) {
    return syncTripDriverToLoads(tripId, trip.driver_id, shareWithCompanies);
  }

  return { success: true };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DriverPayMode } from '@/data/driver-shared';
import type { TripLoad, TripExpense } from '@/data/trips';
import type { Load } from '@/data/loads';

// Types
export interface TripMetrics {
  totalMiles: number;
  totalCuft: number;
  totalRevenue: number;
  totalDays: number;
}

export interface DriverPayCalculation {
  payMode: DriverPayMode;
  basePay: number;
  breakdown: Record<string, number>;
  totalDriverPay: number;
}

export interface TripFinancialResult {
  revenue_total: number;
  driver_pay_total: number;
  fuel_total: number;
  tolls_total: number;
  other_expenses_total: number;
  profit_total: number;
  total_cuft: number | null;
  driver_pay_breakdown: DriverPayCalculation | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  odometer_start_photo_url?: string | null;
  odometer_end_photo_url?: string | null;
  actual_miles?: number | null;
}

interface DriverRates {
  pay_mode: DriverPayMode;
  rate_per_mile: number | null;
  rate_per_cuft: number | null;
  percent_of_revenue: number | null;
  flat_daily_rate: number | null;
}

interface TripWithDates {
  start_date?: string | null;
  end_date?: string | null;
  total_miles?: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
}

/**
 * Calculate driver pay based on pay mode and trip metrics
 */
export function calculateDriverPay(
  driver: DriverRates,
  metrics: TripMetrics
): DriverPayCalculation {
  const { pay_mode, rate_per_mile, rate_per_cuft, percent_of_revenue, flat_daily_rate } = driver;
  const { totalMiles, totalCuft, totalRevenue, totalDays } = metrics;

  let basePay = 0;
  const breakdown: Record<string, number> = {};

  switch (pay_mode) {
    case 'per_mile':
      basePay = totalMiles * (rate_per_mile ?? 0);
      breakdown.miles = totalMiles;
      breakdown.ratePerMile = rate_per_mile ?? 0;
      break;

    case 'per_cuft':
      basePay = totalCuft * (rate_per_cuft ?? 0);
      breakdown.cuft = totalCuft;
      breakdown.ratePerCuft = rate_per_cuft ?? 0;
      break;

    case 'per_mile_and_cuft':
      const milePay = totalMiles * (rate_per_mile ?? 0);
      const cuftPay = totalCuft * (rate_per_cuft ?? 0);
      basePay = milePay + cuftPay;
      breakdown.miles = totalMiles;
      breakdown.ratePerMile = rate_per_mile ?? 0;
      breakdown.milePay = milePay;
      breakdown.cuft = totalCuft;
      breakdown.ratePerCuft = rate_per_cuft ?? 0;
      breakdown.cuftPay = cuftPay;
      break;

    case 'percent_of_revenue':
      const pct = percent_of_revenue ?? 0;
      basePay = totalRevenue * (pct / 100);
      breakdown.revenue = totalRevenue;
      breakdown.percentOfRevenue = pct;
      break;

    case 'flat_daily_rate':
      basePay = totalDays * (flat_daily_rate ?? 0);
      breakdown.days = totalDays;
      breakdown.flatDailyRate = flat_daily_rate ?? 0;
      break;

    default:
      basePay = 0;
  }

  return {
    payMode: pay_mode,
    basePay: Number(basePay.toFixed(2)),
    breakdown,
    totalDriverPay: Number(basePay.toFixed(2)),
  };
}

/**
 * Extract metrics from trip and loads for driver pay calculation
 */
export function extractTripMetrics(
  trip: TripWithDates,
  loads: Array<{ load?: (Load & { actual_cuft_loaded?: number | null; total_rate?: number | null }) | null }>
): TripMetrics {
  // Total miles from odometer difference or total_miles field
  let totalMiles = 0;
  if (trip.odometer_start != null && trip.odometer_end != null) {
    totalMiles = Math.max(0, trip.odometer_end - trip.odometer_start);
  } else if (trip.total_miles != null) {
    totalMiles = trip.total_miles;
  }

  // Total cubic feet from sum of loads' actual_cuft_loaded
  const totalCuft = loads.reduce((sum, tl) => {
    const cuft = tl.load?.actual_cuft_loaded ?? tl.load?.cubic_feet ?? 0;
    return sum + (typeof cuft === 'number' ? cuft : 0);
  }, 0);

  // Total revenue from sum of loads' total_rate
  const totalRevenue = loads.reduce((sum, tl) => {
    const rate = tl.load?.total_rate ?? 0;
    return sum + (typeof rate === 'number' ? rate : 0);
  }, 0);

  // Total days from date difference (minimum 1 day)
  let totalDays = 1;
  if (trip.start_date && trip.end_date) {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    totalDays = Math.max(1, diffDays + 1); // Include both start and end days
  }

  return {
    totalMiles,
    totalCuft,
    totalRevenue,
    totalDays,
  };
}

/**
 * Compute full trip financials including automatic driver pay calculation
 */
export async function computeTripFinancialsWithDriverPay(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  options?: { tripLoads?: TripLoad[]; expenses?: TripExpense[] }
): Promise<TripFinancialResult> {
  // Fetch trip with driver data and snapshot columns
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(`
      *,
      driver:drivers(
        id,
        first_name,
        last_name,
        pay_mode,
        rate_per_mile,
        rate_per_cuft,
        percent_of_revenue,
        flat_daily_rate
      )
    `)
    .eq('id', tripId)
    .eq('owner_id', userId)
    .single();

  if (tripError) {
    throw new Error(`Failed to fetch trip for financials: ${tripError.message}`);
  }

  // Load trip loads if not provided
  let tripLoads = options?.tripLoads;
  if (!tripLoads) {
    const { data, error } = await supabase
      .from('trip_loads')
      .select('*, load:loads!trip_loads_load_id_fkey(id, total_rate, actual_cuft_loaded, cubic_feet)')
      .eq('trip_id', tripId)
      .eq('owner_id', userId);
    if (error) {
      throw new Error(`Failed to load trip loads for financials: ${error.message}`);
    }
    tripLoads = (data || []) as TripLoad[];
  }

  // Load expenses if not provided
  let expenses = options?.expenses;
  if (!expenses) {
    const { data, error } = await supabase
      .from('trip_expenses')
      .select('id, owner_id, created_at, updated_at, trip_id, category, description, amount, incurred_at, receipt_photo_url')
      .eq('trip_id', tripId)
      .eq('owner_id', userId);
    if (error) {
      throw new Error(`Failed to load trip expenses for financials: ${error.message}`);
    }
    expenses = (data || []) as TripExpense[];
  }

  // Calculate revenue from loads
  const revenue_total = tripLoads.reduce((sum, tl) => {
    const loadRevenue = tl.load?.total_rate ?? 0;
    return sum + (typeof loadRevenue === 'number' ? loadRevenue : 0);
  }, 0);

  // Calculate total cuft from loads
  const total_cuft = tripLoads.reduce((sum, tl) => {
    const cuft = tl.load?.actual_cuft_loaded ?? (tl.load as any)?.cubic_feet ?? 0;
    return sum + (typeof cuft === 'number' ? cuft : 0);
  }, 0);

  // Categorize expenses
  let expense_driver_pay_total = 0;
  let fuel_total = 0;
  let tolls_total = 0;
  let other_expenses_total = 0;

  for (const expense of expenses) {
    switch (expense.category) {
      case 'driver_pay':
        expense_driver_pay_total += expense.amount;
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

  // Calculate driver pay using snapshot columns if available, otherwise live driver rates
  let driver_pay_breakdown: DriverPayCalculation | null = null;
  let calculated_driver_pay = 0;

  // Normalize driver - Supabase can return joined relations as arrays or objects
  const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const hasDriver = driver && typeof driver === 'object' && 'pay_mode' in driver;

  if (hasDriver) {
    // Use snapshot columns if they exist, otherwise fall back to live driver rates
    const driverRates: DriverRates = {
      pay_mode: (trip.trip_pay_mode as DriverPayMode) || driver.pay_mode,
      rate_per_mile: trip.trip_rate_per_mile ?? driver.rate_per_mile,
      rate_per_cuft: trip.trip_rate_per_cuft ?? driver.rate_per_cuft,
      percent_of_revenue: trip.trip_percent_of_revenue ?? driver.percent_of_revenue,
      flat_daily_rate: trip.trip_flat_daily_rate ?? driver.flat_daily_rate,
    };

    const metrics = extractTripMetrics(trip, tripLoads);
    driver_pay_breakdown = calculateDriverPay(driverRates, metrics);
    calculated_driver_pay = driver_pay_breakdown.totalDriverPay;
  }

  // Total driver pay = calculated automatic pay + any manual expense entries
  const driver_pay_total = calculated_driver_pay + expense_driver_pay_total;

  // Profit calculation
  const profit_total = revenue_total - (driver_pay_total + fuel_total + tolls_total + other_expenses_total);

  const result: TripFinancialResult = {
    revenue_total,
    driver_pay_total,
    fuel_total,
    tolls_total,
    other_expenses_total,
    profit_total,
    total_cuft: total_cuft || null,
    driver_pay_breakdown,
  };

  // Update trip in database with all financial fields
  const updatePayload: Record<string, unknown> = {
    revenue_total,
    driver_pay_total,
    fuel_total,
    tolls_total,
    other_expenses_total,
    profit_total,
    total_cuft: total_cuft || null,
    driver_pay_breakdown: driver_pay_breakdown ? JSON.stringify(driver_pay_breakdown) : null,
  };

  const { error: updateError } = await supabase
    .from('trips')
    .update(updatePayload)
    .eq('id', tripId)
    .eq('owner_id', userId);

  if (updateError) {
    throw new Error(`Failed to update trip financial summary: ${updateError.message}`);
  }

  return result;
}

/**
 * Snapshot driver's current compensation rates to trip for historical accuracy
 */
export async function snapshotDriverCompensation(
  supabase: SupabaseClient,
  tripId: string,
  driverId: string,
  userId: string
): Promise<void> {
  // Fetch driver's current rates
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('pay_mode, rate_per_mile, rate_per_cuft, percent_of_revenue, flat_daily_rate')
    .eq('id', driverId)
    .eq('owner_id', userId)
    .single();

  if (driverError) {
    if (driverError.code === 'PGRST116') {
      throw new Error('Driver not found or you do not have access to it');
    }
    throw new Error(`Failed to fetch driver for snapshot: ${driverError.message}`);
  }

  // Update trip with snapshot of driver's current rates
  const { error: updateError } = await supabase
    .from('trips')
    .update({
      trip_pay_mode: driver.pay_mode,
      trip_rate_per_mile: driver.rate_per_mile,
      trip_rate_per_cuft: driver.rate_per_cuft,
      trip_percent_of_revenue: driver.percent_of_revenue,
      trip_flat_daily_rate: driver.flat_daily_rate,
    })
    .eq('id', tripId)
    .eq('owner_id', userId);

  if (updateError) {
    throw new Error(`Failed to snapshot driver compensation: ${updateError.message}`);
  }
}

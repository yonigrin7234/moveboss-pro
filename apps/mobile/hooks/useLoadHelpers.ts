/**
 * Shared helper utilities for load hooks
 *
 * Provides common functionality used across load action hooks.
 */

import { supabase } from '../lib/supabase';

export type ActionResult = { success: boolean; error?: string };

/**
 * Get driver info from current authenticated user
 */
export async function getDriverInfo(userId: string | undefined) {
  if (!userId) throw new Error('Not authenticated');

  const { data: driver, error } = await supabase
    .from('drivers')
    .select('id, owner_id')
    .eq('auth_user_id', userId)
    .single();

  if (error || !driver) throw new Error('Driver profile not found');
  return driver;
}

/**
 * Payment method mapping for load_payments table
 */
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: 'cash',
  zelle: 'zelle',
  cashier_check: 'check',
  money_order: 'money_order',
  personal_check: 'check',
  venmo: 'venmo',
};

/**
 * Check if there are other loads from the same company still being loaded
 * Used to determine if loading report photo should be required
 *
 * Returns:
 * - isLastLoadFromCompany: true if this is the last load from this company to finish loading
 * - otherLoadsStillLoading: count of other loads from same company still loading
 * - companyLoadsInTrip: total count of loads from same company in trip
 */
export async function checkSameCompanyLoads(
  loadId: string,
  tripId: string,
  ownerId: string
): Promise<{
  isLastLoadFromCompany: boolean;
  otherLoadsStillLoading: number;
  companyLoadsInTrip: number;
  companyName: string | null;
}> {
  try {
    // Get current load's company_id
    const { data: currentLoad, error: loadError } = await supabase
      .from('loads')
      .select('company_id, companies:company_id(name)')
      .eq('id', loadId)
      .eq('owner_id', ownerId)
      .single();

    if (loadError || !currentLoad || !currentLoad.company_id) {
      // No company - single/own customer load, always require photo
      return { isLastLoadFromCompany: true, otherLoadsStillLoading: 0, companyLoadsInTrip: 1, companyName: null };
    }

    const companyId = currentLoad.company_id;
    const companyName = (currentLoad.companies as unknown as { name: string } | null)?.name || null;

    // Get all loads in this trip from the same company
    const { data: tripLoads, error: tripLoadsError } = await supabase
      .from('trip_loads')
      .select(`
        load_id,
        loads:load_id (
          id,
          company_id,
          load_status
        )
      `)
      .eq('trip_id', tripId);

    if (tripLoadsError || !tripLoads) {
      return { isLastLoadFromCompany: true, otherLoadsStillLoading: 0, companyLoadsInTrip: 1, companyName };
    }

    // Filter for loads from same company
    const sameCompanyLoads = tripLoads
      .map((tl) => tl.loads as unknown as { id: string; company_id: string | null; load_status: string | null })
      .filter((load) => load && load.company_id === companyId);

    const companyLoadsInTrip = sameCompanyLoads.length;

    // Count how many are still in "loading" status (excluding current load)
    const otherLoadsStillLoading = sameCompanyLoads.filter(
      (load) => load.id !== loadId && load.load_status === 'loading'
    ).length;

    // This is the last load if no others are still loading
    const isLastLoadFromCompany = otherLoadsStillLoading === 0;

    return { isLastLoadFromCompany, otherLoadsStillLoading, companyLoadsInTrip, companyName };
  } catch {
    // On error, require photo to be safe
    return { isLastLoadFromCompany: true, otherLoadsStillLoading: 0, companyLoadsInTrip: 1, companyName: null };
  }
}











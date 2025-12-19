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










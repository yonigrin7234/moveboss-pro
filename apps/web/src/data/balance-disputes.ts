import { createClient } from '@/lib/supabase-server';

export interface BalanceDispute {
  id: string;
  load_id: string;
  driver_id: string;
  trip_id: string | null;
  status: 'pending' | 'resolved' | 'cancelled';
  original_balance: number;
  driver_note: string | null;
  resolution_type: 'confirmed_zero' | 'balance_updated' | 'cancelled' | null;
  new_balance: number | null;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  drivers?: {
    first_name: string;
    last_name: string;
  } | null;
}

/**
 * Get pending balance dispute for a specific load
 */
export async function getPendingDisputeForLoad(
  loadId: string
): Promise<BalanceDispute | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_balance_disputes')
    .select(`
      id,
      load_id,
      driver_id,
      trip_id,
      status,
      original_balance,
      driver_note,
      resolution_type,
      new_balance,
      resolution_note,
      resolved_at,
      resolved_by,
      created_at,
      updated_at,
      drivers:driver_id (
        first_name,
        last_name
      )
    `)
    .eq('load_id', loadId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching pending dispute:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    drivers: data.drivers as unknown as { first_name: string; last_name: string } | null,
  } as BalanceDispute;
}

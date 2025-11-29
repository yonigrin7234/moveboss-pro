import { createClient } from '@/lib/supabase-server';
import { createNotification } from './notifications';

export type LoadStatus =
  | 'pending'
  | 'accepted'
  | 'loading'
  | 'loaded'
  | 'in_transit'
  | 'delivered';

export interface StatusUpdate {
  id: string;
  load_id: string;
  status: LoadStatus;
  notes: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_by_id: string;
  created_at: string;
}

// Update load status
export async function updateLoadStatus(
  loadId: string,
  newStatus: LoadStatus,
  updatedById: string,
  data?: {
    notes?: string;
    photo_url?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get load details for notification
  const { data: load } = await supabase
    .from('loads')
    .select(
      `
      id,
      load_number,
      load_status,
      owner_id,
      company_id,
      assigned_carrier_id,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      company:companies!loads_company_id_fkey(id, name),
      carrier:companies!loads_assigned_carrier_id_fkey(id, name)
    `
    )
    .eq('id', loadId)
    .single();

  if (!load) {
    return { success: false, error: 'Load not found' };
  }

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    pending: ['accepted'],
    accepted: ['loading'],
    loading: ['loaded'],
    loaded: ['in_transit'],
    in_transit: ['delivered'],
    delivered: [], // Terminal state
  };

  if (!validTransitions[load.load_status]?.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot change status from ${load.load_status} to ${newStatus}`,
    };
  }

  // Build update object with timestamps
  const updateData: Record<string, string | null> = {
    load_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // Add status-specific timestamps and photos
  if (newStatus === 'loading') {
    updateData.loading_started_at = new Date().toISOString();
  }
  if (newStatus === 'loaded') {
    updateData.loaded_at = new Date().toISOString();
    if (data?.photo_url) {
      updateData.loading_photo_url = data.photo_url;
    }
  }
  if (newStatus === 'in_transit') {
    updateData.in_transit_at = new Date().toISOString();
  }
  if (newStatus === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
    if (data?.photo_url) {
      updateData.delivery_photo_url = data.photo_url;
    }
  }

  // Update load status
  const { error: updateError } = await supabase
    .from('loads')
    .update(updateData)
    .eq('id', loadId);

  if (updateError) {
    console.error('Error updating load status:', updateError);
    return { success: false, error: updateError.message };
  }

  // Record status history
  const { error: historyError } = await supabase
    .from('load_status_history')
    .insert({
      load_id: loadId,
      status: newStatus,
      notes: data?.notes || null,
      photo_url: data?.photo_url || null,
      latitude: data?.latitude || null,
      longitude: data?.longitude || null,
      updated_by_id: updatedById,
    });

  if (historyError) {
    console.error('Error recording status history:', historyError);
  }

  // Notify company of status change
  const statusLabels: Record<string, string> = {
    loading: 'Loading started',
    loaded: 'Loaded on truck',
    in_transit: 'In transit',
    delivered: 'Delivered',
  };

  const route = `${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`;
  const carrierRaw = load.carrier;
  const carrier = Array.isArray(carrierRaw) ? carrierRaw[0] : carrierRaw;

  await createNotification({
    user_id: load.owner_id,
    company_id: load.company_id,
    type: `load_${newStatus}`,
    title: `${load.load_number}: ${statusLabels[newStatus] || newStatus}`,
    message: `${carrier?.name || 'Carrier'} • ${route}`,
    load_id: loadId,
  });

  // If delivered, update platform stats
  if (newStatus === 'delivered' && load.assigned_carrier_id) {
    await supabase.rpc('increment_platform_loads_completed', {
      company_id: load.assigned_carrier_id,
    });
  }

  return { success: true };
}

// Get status history for a load
export async function getLoadStatusHistory(loadId: string): Promise<StatusUpdate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_status_history')
    .select('*')
    .eq('load_id', loadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching status history:', error);
    return [];
  }

  return data || [];
}

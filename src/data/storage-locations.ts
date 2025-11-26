import { createClient } from '@/lib/supabase-server';

export interface StorageLocation {
  id: string;
  company_id: string | null;
  owner_id: string;
  name: string;
  code: string | null;
  location_type: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  access_hours: string | null;
  access_instructions: string | null;
  special_notes: string | null;
  gate_code: string | null;
  total_capacity_cuft: number | null;
  current_usage_cuft: number | null;
  monthly_rent: number | null;
  rent_due_day: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  loads_count?: number;
}

export async function getStorageLocations(ownerId: string): Promise<StorageLocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching storage locations:', error);
    return [];
  }

  return data || [];
}

export async function getStorageLocationById(id: string, ownerId: string): Promise<StorageLocation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();

  if (error) {
    console.error('Error fetching storage location:', error);
    return null;
  }

  return data;
}

export async function getStorageLocationsWithLoadCount(ownerId: string): Promise<StorageLocation[]> {
  const supabase = await createClient();

  const { data: locations, error } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .order('name');

  if (error || !locations) {
    console.error('Error fetching storage locations:', error);
    return [];
  }

  const { data: loadCounts } = await supabase
    .from('loads')
    .select('storage_location_id')
    .eq('owner_id', ownerId)
    .not('storage_location_id', 'is', null)
    .in('load_status', ['pending', 'accepted', 'loading', 'loaded']);

  const countMap = new Map<string, number>();
  loadCounts?.forEach((load: { storage_location_id: string }) => {
    const current = countMap.get(load.storage_location_id) || 0;
    countMap.set(load.storage_location_id, current + 1);
  });

  return locations.map((loc) => ({
    ...loc,
    loads_count: countMap.get(loc.id) || 0,
  }));
}

export async function createStorageLocation(
  ownerId: string,
  data: Partial<StorageLocation>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('storage_locations')
    .insert({
      owner_id: ownerId,
      name: data.name,
      code: data.code,
      location_type: data.location_type || 'warehouse',
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country || 'USA',
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      access_hours: data.access_hours,
      access_instructions: data.access_instructions,
      special_notes: data.special_notes,
      gate_code: data.gate_code,
      total_capacity_cuft: data.total_capacity_cuft,
      monthly_rent: data.monthly_rent,
      rent_due_day: data.rent_due_day,
      lease_start_date: data.lease_start_date,
      lease_end_date: data.lease_end_date,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating storage location:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

export async function updateStorageLocation(
  id: string,
  ownerId: string,
  data: Partial<StorageLocation>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('storage_locations')
    .update({
      name: data.name,
      code: data.code,
      location_type: data.location_type,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      access_hours: data.access_hours,
      access_instructions: data.access_instructions,
      special_notes: data.special_notes,
      gate_code: data.gate_code,
      total_capacity_cuft: data.total_capacity_cuft,
      monthly_rent: data.monthly_rent,
      rent_due_day: data.rent_due_day,
      lease_start_date: data.lease_start_date,
      lease_end_date: data.lease_end_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error updating storage location:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteStorageLocation(
  id: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('storage_locations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (error) {
    console.error('Error deleting storage location:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

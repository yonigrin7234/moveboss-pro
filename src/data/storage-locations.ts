import { createClient } from '@/lib/supabase-server';

export type LocationType = 'warehouse' | 'public_storage' | 'partner_facility' | 'container_yard' | 'vault_storage' | 'other';
export type TruckAccessibility = 'full' | 'limited' | 'none';

export interface StorageLocation {
  id: string;
  company_id: string | null;
  owner_id: string;
  name: string;
  code: string | null;
  location_type: LocationType;
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
  // Warehouse-specific fields
  operating_hours: string | null;
  has_loading_dock: boolean;
  dock_height: string | null;
  appointment_required: boolean;
  appointment_instructions: string | null;
  // Public Storage-specific fields
  facility_brand: string | null;
  facility_phone: string | null;
  unit_numbers: string | null;
  account_name: string | null;
  account_number: string | null;
  authorization_notes: string | null;
  // Accessibility
  truck_accessibility: TruckAccessibility;
  accessibility_notes: string | null;
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
      // Warehouse-specific fields
      operating_hours: data.operating_hours,
      has_loading_dock: data.has_loading_dock || false,
      dock_height: data.dock_height,
      appointment_required: data.appointment_required || false,
      appointment_instructions: data.appointment_instructions,
      // Public storage-specific fields
      facility_brand: data.facility_brand,
      facility_phone: data.facility_phone,
      unit_numbers: data.unit_numbers,
      account_name: data.account_name,
      account_number: data.account_number,
      authorization_notes: data.authorization_notes,
      // Accessibility
      truck_accessibility: data.truck_accessibility || 'full',
      accessibility_notes: data.accessibility_notes,
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
      // Warehouse-specific fields
      operating_hours: data.operating_hours,
      has_loading_dock: data.has_loading_dock,
      dock_height: data.dock_height,
      appointment_required: data.appointment_required,
      appointment_instructions: data.appointment_instructions,
      // Public storage-specific fields
      facility_brand: data.facility_brand,
      facility_phone: data.facility_phone,
      unit_numbers: data.unit_numbers,
      account_name: data.account_name,
      account_number: data.account_number,
      authorization_notes: data.authorization_notes,
      // Accessibility
      truck_accessibility: data.truck_accessibility,
      accessibility_notes: data.accessibility_notes,
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

// Get storage locations filtered by type
export async function getStorageLocationsByType(
  ownerId: string,
  locationType: LocationType
): Promise<StorageLocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('location_type', locationType)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching storage locations by type:', error);
    return [];
  }

  return data as StorageLocation[] || [];
}

// Get storage location counts by type
export async function getStorageLocationCounts(
  ownerId: string
): Promise<{ total: number; warehouses: number; publicStorage: number }> {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from('storage_locations')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_active', true);

  const { count: warehouses } = await supabase
    .from('storage_locations')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('location_type', 'warehouse')
    .eq('is_active', true);

  const { count: publicStorage } = await supabase
    .from('storage_locations')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('location_type', 'public_storage')
    .eq('is_active', true);

  return {
    total: total || 0,
    warehouses: warehouses || 0,
    publicStorage: publicStorage || 0,
  };
}

// Get storage options for dropdown (minimal data)
export async function getStorageOptions(
  ownerId: string,
  locationType?: LocationType
): Promise<Array<{
  id: string;
  name: string;
  location_type: LocationType;
  city: string;
  state: string;
  unit_numbers: string | null;
}>> {
  const supabase = await createClient();

  let query = supabase
    .from('storage_locations')
    .select('id, name, location_type, city, state, unit_numbers')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .order('name');

  if (locationType) {
    query = query.eq('location_type', locationType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching storage options:', error);
    return [];
  }

  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    location_type: s.location_type as LocationType,
    city: s.city,
    state: s.state,
    unit_numbers: s.unit_numbers,
  }));
}

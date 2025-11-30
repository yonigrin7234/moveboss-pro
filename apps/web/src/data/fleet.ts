import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

// Enums
export const truckStatusSchema = z.enum(['active', 'maintenance', 'inactive', 'archived']);
export const truckOwnershipTypeSchema = z.enum(['owned', 'leased', 'rented']);
export const truckVehicleTypeSchema = z.enum([
  'tractor',
  '26ft_box_truck',
  '22ft_box_truck',
  '20ft_box_truck',
  '16ft_box_truck',
  '12ft_box_truck',
  'sprinter_van',
  'cargo_van',
  'other',
]);
export const trailerStatusSchema = z.enum(['active', 'maintenance', 'inactive', 'archived']);
export const trailerTypeSchema = z.enum([
  '53_dry_van',
  '26_box_truck',
  'straight_truck',
  'cargo_trailer',
  'container',
  'other',
]);

// Truck schemas
export const newTruckInputSchema = z.object({
  unit_number: z.string().trim().max(50).optional(),
  plate_number: z.string().trim().max(50).optional(),
  plate_state: z.string().trim().max(50).optional(),
  vin: z.string().trim().max(50).optional(),
  make: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  current_odometer: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? undefined : num;
    }),
  registration_expiry: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : val;
  }),
  inspection_expiry: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : val;
  }),
  assigned_driver_id: z.string().uuid().optional().nullable(),
  status: truckStatusSchema.optional().default('active'),
  vehicle_type: truckVehicleTypeSchema.optional().nullable(),
  cubic_capacity: z.coerce.number().int().min(0).optional().nullable(),
  is_rental_unit: z.boolean().optional().default(false),
  rental_company: z.enum(['ryder', 'penske', 'other']).optional().nullable(),
  rental_company_other: z.string().trim().max(100).optional().nullable(),
  rental_truck_number: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(5000).optional(),
})
.refine(
  (data) => {
    if (data.is_rental_unit && data.rental_company === 'other') {
      return data.rental_company_other !== null && data.rental_company_other !== undefined && data.rental_company_other.trim() !== '';
    }
    return true;
  },
  {
    message: 'Rental company name is required when "Other" is selected',
    path: ['rental_company_other'],
  }
);

export const updateTruckInputSchema = newTruckInputSchema.partial();

// Trailer schemas
export const newTrailerInputSchema = z.object({
  unit_number: z.string().trim().min(1, 'Trailer number is required').max(50),
  type: trailerTypeSchema,
  plate_number: z.string().trim().max(50).optional(),
  plate_state: z.string().trim().max(50).optional(),
  vin: z.string().trim().max(50).optional(),
  make: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  capacity_cuft: z.coerce.number().int().min(0).optional(),
  side_doors_count: z.coerce.number().int().min(0).optional().default(0),
  registration_expiry: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : val;
  }),
  inspection_expiry: z.string().optional().transform((val) => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : val;
  }),
  assigned_driver_id: z.string().uuid().optional().nullable(),
  status: trailerStatusSchema.optional().default('active'),
  notes: z.string().trim().max(5000).optional(),
});

export const updateTrailerInputSchema = newTrailerInputSchema.partial();

// TypeScript types
export type TruckStatus = z.infer<typeof truckStatusSchema>;
export type TruckOwnershipType = z.infer<typeof truckOwnershipTypeSchema>;
export type TruckVehicleType = z.infer<typeof truckVehicleTypeSchema>;
export type TrailerStatus = z.infer<typeof trailerStatusSchema>;
export type TrailerType = z.infer<typeof trailerTypeSchema>;
export type NewTruckInput = z.infer<typeof newTruckInputSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckInputSchema>;
export type NewTrailerInput = z.infer<typeof newTrailerInputSchema>;
export type UpdateTrailerInput = z.infer<typeof updateTrailerInputSchema>;

export interface Truck {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  unit_number: string | null;
  plate_number: string | null;
  plate_state: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  ownership_type: TruckOwnershipType;
  vehicle_type: TruckVehicleType | null;
  cubic_capacity: number | null;
  gvw_lbs: number | null;
  current_odometer: number | null;
  registration_expiry: string | null;
  inspection_expiry: string | null;
  assigned_driver_id: string | null;
  status: TruckStatus;
  archived_at: string | null;
  is_rental_unit: boolean;
  rental_company: 'ryder' | 'penske' | 'other' | null;
  rental_company_other: string | null;
  rental_truck_number: string | null;
  notes: string | null;
}

export interface Trailer {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  unit_number: string;
  type: TrailerType;
  plate_number: string | null;
  plate_state: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  capacity_cuft: number | null;
  side_doors_count: number;
  registration_expiry: string | null;
  inspection_expiry: string | null;
  assigned_driver_id: string | null;
  status: TrailerStatus;
  archived_at: string | null;
  notes: string | null;
}

// Truck functions
export async function getTrucksForUser(userId: string): Promise<Truck[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .eq('owner_id', userId)
    .order('unit_number', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch trucks: ${error.message}`);
  }

  return (data || []) as Truck[];
}

export async function getTruckById(id: string, userId: string): Promise<Truck | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch truck: ${error.message}`);
  }

  return data as Truck;
}

export async function createTruck(input: NewTruckInput, userId: string): Promise<Truck> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trucks')
    .insert({
      ...input,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create truck: ${error.message}`);
  }

  return data as Truck;
}

export async function updateTruck(
  id: string,
  input: UpdateTruckInput,
  userId: string
): Promise<Truck> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trucks')
    .update(input)
    .eq('id', id)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Truck not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update truck: ${error.message}`);
  }

  return data as Truck;
}

export async function deleteTruck(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('trucks').delete().eq('id', id).eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to delete truck: ${error.message}`);
  }
}

// Re-export vehicle type utilities for server-side use
// Client components should import from @/lib/vehicle-types instead
export { getCapacityForVehicleType, VEHICLE_TYPE_CAPACITIES } from '@/lib/vehicle-types';

// Trailer functions
export async function getTrailersForUser(userId: string): Promise<Trailer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .eq('owner_id', userId)
    .order('unit_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch trailers: ${error.message}`);
  }

  return (data || []) as Trailer[];
}

export async function getTrailerById(id: string, userId: string): Promise<Trailer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch trailer: ${error.message}`);
  }

  return data as Trailer;
}

export async function createTrailer(input: NewTrailerInput, userId: string): Promise<Trailer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trailers')
    .insert({
      ...input,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create trailer: ${error.message}`);
  }

  return data as Trailer;
}

export async function updateTrailer(
  id: string,
  input: UpdateTrailerInput,
  userId: string
): Promise<Trailer> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trailers')
    .update(input)
    .eq('id', id)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Trailer not found or you do not have permission to update it');
    }
    throw new Error(`Failed to update trailer: ${error.message}`);
  }

  return data as Trailer;
}

export async function deleteTrailer(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('trailers')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Failed to delete trailer: ${error.message}`);
  }
}

// ===========================================
// STATUS MANAGEMENT FUNCTIONS
// ===========================================

export type EntityType = 'driver' | 'truck' | 'trailer';

interface ActiveAssignment {
  hasActiveAssignment: boolean;
  tripId?: string;
  tripNumber?: string;
  loadId?: string;
  loadNumber?: string;
}

/**
 * Check if a truck is assigned to an active trip or load
 */
export async function checkTruckActiveAssignment(
  truckId: string,
  userId: string
): Promise<ActiveAssignment> {
  const supabase = await createClient();

  // Check for active trips (status not 'completed' or 'cancelled')
  const { data: activeTrip } = await supabase
    .from('trips')
    .select('id, trip_number')
    .eq('truck_id', truckId)
    .eq('owner_id', userId)
    .not('status', 'in', '("completed","cancelled")')
    .limit(1)
    .maybeSingle();

  if (activeTrip) {
    return {
      hasActiveAssignment: true,
      tripId: activeTrip.id,
      tripNumber: activeTrip.trip_number,
    };
  }

  return { hasActiveAssignment: false };
}

/**
 * Check if a trailer is assigned to an active trip or load
 */
export async function checkTrailerActiveAssignment(
  trailerId: string,
  userId: string
): Promise<ActiveAssignment> {
  const supabase = await createClient();

  // Check for active trips
  const { data: activeTrip } = await supabase
    .from('trips')
    .select('id, trip_number')
    .eq('trailer_id', trailerId)
    .eq('owner_id', userId)
    .not('status', 'in', '("completed","cancelled")')
    .limit(1)
    .maybeSingle();

  if (activeTrip) {
    return {
      hasActiveAssignment: true,
      tripId: activeTrip.id,
      tripNumber: activeTrip.trip_number,
    };
  }

  return { hasActiveAssignment: false };
}

/**
 * Deactivate a truck (set status to 'inactive')
 * Fails if truck is assigned to an active trip
 */
export async function deactivateTruck(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkTruckActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    return {
      success: false,
      error: `Cannot deactivate truck: assigned to active trip ${assignment.tripNumber || assignment.tripId}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trucks')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Archive a truck (soft delete)
 * Fails if truck is assigned to an active trip
 */
export async function archiveTruck(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkTruckActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    return {
      success: false,
      error: `Cannot archive truck: assigned to active trip ${assignment.tripNumber || assignment.tripId}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trucks')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      assigned_driver_id: null, // Clear driver assignment
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a truck (set status to 'active')
 */
export async function reactivateTruck(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('trucks')
    .update({
      status: 'active',
      archived_at: null,
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a trailer (set status to 'inactive')
 * Fails if trailer is assigned to an active trip
 */
export async function deactivateTrailer(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkTrailerActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    return {
      success: false,
      error: `Cannot deactivate trailer: assigned to active trip ${assignment.tripNumber || assignment.tripId}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trailers')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Archive a trailer (soft delete)
 * Fails if trailer is assigned to an active trip
 */
export async function archiveTrailer(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Check for active assignments
  const assignment = await checkTrailerActiveAssignment(id, userId);
  if (assignment.hasActiveAssignment) {
    return {
      success: false,
      error: `Cannot archive trailer: assigned to active trip ${assignment.tripNumber || assignment.tripId}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trailers')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      assigned_driver_id: null, // Clear driver assignment
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reactivate a trailer (set status to 'active')
 */
export async function reactivateTrailer(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('trailers')
    .update({
      status: 'active',
      archived_at: null,
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}


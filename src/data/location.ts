import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

export const driverLocationPingSchema = z.object({
  driver_id: z.string().uuid(),
  truck_id: z.string().uuid().optional(),
  trailer_id: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speed_kph: z.coerce.number().min(0).optional(),
  heading_deg: z.coerce.number().min(0).max(359).optional(),
  odometer_miles: z.coerce.number().min(0).optional(),
  total_cubic_capacity: z.coerce.number().int().min(0).optional(),
  used_cubic: z.coerce.number().int().min(0).optional(),
  available_cubic: z.coerce.number().int().min(0).optional(),
  is_available_for_loads: z.boolean().optional().default(true),
  source: z.string().trim().max(100).optional(),
});

export type DriverLocationPingInput = z.infer<typeof driverLocationPingSchema>;

export interface DriverLocationRecord {
  id: string;
  owner_id: string;
  created_at: string;
  driver_id: string;
  truck_id: string | null;
  trailer_id: string | null;
  latitude: number | null;
  longitude: number | null;
  speed_kph: number | null;
  heading_deg: number | null;
  odometer_miles: number | null;
  total_cubic_capacity: number | null;
  used_cubic: number | null;
  available_cubic: number | null;
  is_available_for_loads: boolean;
  source: string | null;
  driver?: { id: string; first_name: string; last_name: string; status: string } | null;
  truck?: { id: string; unit_number: string } | null;
  trailer?: { id: string; unit_number: string } | null;
}

export interface DriverLocationWithDistance extends DriverLocationRecord {
  distance_km: number;
}

type Tables = 'drivers' | 'trucks' | 'trailers';

async function ensureOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: Tables,
  id: string | null | undefined,
  userId: string
) {
  if (!id) return;
  const { error } = await supabase.from(table).select('id').eq('id', id).eq('owner_id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`You do not have access to the provided ${table.slice(0, -1)}`);
    }
    throw new Error(`Failed to verify ${table.slice(0, -1)} ownership: ${error.message}`);
  }
}

export async function recordDriverLocationPing(userId: string, input: DriverLocationPingInput) {
  const supabase = await createClient();
  await Promise.all([
    ensureOwnership(supabase, 'drivers', input.driver_id, userId),
    ensureOwnership(supabase, 'trucks', input.truck_id, userId),
    ensureOwnership(supabase, 'trailers', input.trailer_id, userId),
  ]);

  let available = input.available_cubic;
  if (
    available === undefined &&
    typeof input.total_cubic_capacity === 'number' &&
    typeof input.used_cubic === 'number'
  ) {
    available = Math.max(input.total_cubic_capacity - input.used_cubic, 0);
  }

  const payload = {
    owner_id: userId,
    driver_id: input.driver_id,
    truck_id: input.truck_id ?? null,
    trailer_id: input.trailer_id ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    speed_kph: input.speed_kph ?? null,
    heading_deg: input.heading_deg ?? null,
    odometer_miles: input.odometer_miles ?? null,
    total_cubic_capacity: input.total_cubic_capacity ?? null,
    used_cubic: input.used_cubic ?? null,
    available_cubic: available ?? null,
    is_available_for_loads: input.is_available_for_loads ?? true,
    source: input.source ?? null,
  };

  const { data, error } = await supabase
    .from('driver_locations')
    .insert(payload)
    .select(
      `
        *,
        driver:drivers!driver_locations_driver_id_fkey(id, first_name, last_name, status),
        truck:trucks!driver_locations_truck_id_fkey(id, unit_number),
        trailer:trailers!driver_locations_trailer_id_fkey(id, unit_number)
      `
    )
    .single();

  if (error) {
    throw new Error(`Failed to record location ping: ${error.message}`);
  }

  return data as DriverLocationRecord;
}

export async function getLatestLocationsForOwner(userId: string): Promise<DriverLocationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('driver_locations')
    .select(
      `
        *,
        driver:drivers!driver_locations_driver_id_fkey(id, first_name, last_name, status),
        truck:trucks!driver_locations_truck_id_fkey(id, unit_number),
        trailer:trailers!driver_locations_trailer_id_fkey(id, unit_number)
      `
    )
    .eq('owner_id', userId)
    .order('driver_id', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch driver locations: ${error.message}`);
  }

  const latestByDriver = new Map<string, DriverLocationRecord>();
  (data as DriverLocationRecord[] | null)?.forEach((row) => {
    if (!latestByDriver.has(row.driver_id)) {
      latestByDriver.set(row.driver_id, row);
    }
  });

  return Array.from(latestByDriver.values());
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function findAvailableCapacityNear(
  userId: string,
  params: { latitude: number; longitude: number; radiusKm: number; minAvailableCubic?: number }
): Promise<DriverLocationWithDistance[]> {
  const { latitude, longitude, radiusKm, minAvailableCubic } = params;
  const latestLocations = await getLatestLocationsForOwner(userId);

  const results = latestLocations
    .filter((location) => location.latitude !== null && location.longitude !== null)
    .map((location) => {
      const distance = haversineDistanceKm(
        latitude,
        longitude,
        location.latitude as number,
        location.longitude as number
      );
      return { ...location, distance_km: distance } as DriverLocationWithDistance;
    })
    .filter((location) => {
      const withinRadius = location.distance_km <= radiusKm;
      const capacityOk =
        minAvailableCubic === undefined ||
        (location.available_cubic ?? 0) >= minAvailableCubic;
      return withinRadius && location.is_available_for_loads && capacityOk;
    })
    .sort((a, b) => a.distance_km - b.distance_km);

  return results;
}



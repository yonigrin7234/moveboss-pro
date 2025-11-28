import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import {
  geocodeAddress,
  calculateDistance,
  calculateAddedMiles,
  type GeoCoordinates,
} from '@/lib/geocoding';

interface SuggestedLoad {
  id: string;
  loadNumber: string;
  companyName: string;
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  cubicFeet: number | null;
  rate: number | null;
  rateType: string;
  postingType: 'pickup' | 'load';
  isReadyNow: boolean;
  availableDate: string | null;
  addedMiles: number;
  distanceFromRoute: number;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
}

/**
 * GET /api/trips/[id]/suggestions
 *
 * Returns marketplace loads that are:
 * 1. Along the trip route (within maxDetour miles)
 * 2. Fit within available truck capacity
 *
 * Query params:
 * - maxDetour: Maximum detour miles (default: 50)
 * - maxCuft: Maximum cubic feet to consider (for capacity filtering)
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: tripId } = await context.params;
  const { searchParams } = new URL(request.url);
  const maxDetour = parseInt(searchParams.get('maxDetour') || '50', 10);
  const maxCuft = searchParams.get('maxCuft')
    ? parseInt(searchParams.get('maxCuft')!, 10)
    : null;

  try {
    const supabase = await createClient();

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        origin_city, origin_state, origin_postal_code,
        destination_city, destination_state, destination_postal_code,
        truck:trucks(id, cubic_capacity),
        trailer:trailers(id, cubic_capacity)
      `)
      .eq('id', tripId)
      .eq('owner_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Geocode trip origin and destination
    const [originResult, destResult] = await Promise.all([
      geocodeAddress(trip.origin_city, trip.origin_state, trip.origin_postal_code),
      geocodeAddress(trip.destination_city, trip.destination_state, trip.destination_postal_code),
    ]);

    if (!originResult.success || !destResult.success) {
      return NextResponse.json({
        error: 'Could not geocode trip locations',
        suggestions: [],
      });
    }

    const tripOrigin = originResult.coordinates!;
    const tripDest = destResult.coordinates!;

    // Get current loads on the trip to calculate used capacity
    const { data: tripLoads } = await supabase
      .from('trip_loads')
      .select(`
        load:loads(id, cubic_feet)
      `)
      .eq('trip_id', tripId);

    const usedCapacity = (tripLoads || []).reduce((sum, tl) => {
      const load = Array.isArray(tl.load) ? tl.load[0] : tl.load;
      return sum + (load?.cubic_feet || 0);
    }, 0);

    const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
    const trailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;
    // Prioritize trailer capacity, then truck capacity (for box trucks)
    const truckCapacity = trailer?.cubic_capacity || truck?.cubic_capacity || 0;
    const availableCapacity = truckCapacity - usedCapacity;

    // Get marketplace loads
    // Note: loads table uses pickup_city/delivery_city, not origin_city/destination_city
    const { data: marketplaceLoads, error: loadsError } = await supabase
      .from('loads')
      .select(`
        id,
        load_number,
        company_id,
        company:companies!loads_company_id_fkey(id, name),
        posting_type,
        pickup_city,
        pickup_state,
        pickup_postal_code,
        delivery_city,
        delivery_state,
        delivery_postal_code,
        cubic_feet,
        rate_per_cuft,
        balance_due
      `)
      .eq('is_marketplace_visible', true)
      .eq('load_status', 'pending')
      .is('assigned_carrier_id', null);

    if (loadsError) {
      console.error('Error fetching marketplace loads:', loadsError);
      return NextResponse.json({ error: `Failed to fetch loads: ${loadsError.message}` }, { status: 500 });
    }

    // Filter and calculate distances for each load
    const suggestions: SuggestedLoad[] = [];

    for (const load of marketplaceLoads || []) {
      // Skip if over capacity
      if (maxCuft !== null && load.cubic_feet && load.cubic_feet > maxCuft) {
        continue;
      }
      if (load.cubic_feet && load.cubic_feet > availableCapacity) {
        continue;
      }

      // Geocode load origin (pickup location)
      const loadOriginResult = await geocodeAddress(
        load.pickup_city,
        load.pickup_state,
        load.pickup_postal_code
      );

      if (!loadOriginResult.success || !loadOriginResult.coordinates) {
        continue;
      }

      const loadOrigin = loadOriginResult.coordinates;

      // Calculate distance from route and added miles
      const addedMiles = calculateAddedMiles(tripOrigin, tripDest, loadOrigin);
      const distanceFromRoute = Math.min(
        calculateDistance(tripOrigin, loadOrigin),
        calculateDistance(tripDest, loadOrigin)
      );

      // Skip if detour is too large
      if (addedMiles > maxDetour) {
        continue;
      }

      // Geocode load destination (delivery location) for map display
      const loadDestResult = await geocodeAddress(
        load.delivery_city,
        load.delivery_state,
        load.delivery_postal_code
      );

      const company = Array.isArray(load.company) ? load.company[0] : load.company;

      suggestions.push({
        id: load.id,
        loadNumber: load.load_number,
        companyName: company?.name || 'Unknown',
        originCity: load.pickup_city,
        originState: load.pickup_state,
        originZip: load.pickup_postal_code,
        destinationCity: load.delivery_city,
        destinationState: load.delivery_state,
        destinationZip: load.delivery_postal_code,
        cubicFeet: load.cubic_feet,
        rate: load.rate_per_cuft || load.balance_due,
        rateType: load.rate_per_cuft ? 'per_cuft' : 'flat',
        postingType: load.posting_type || 'load',
        isReadyNow: true,
        availableDate: null,
        addedMiles: Math.round(addedMiles),
        distanceFromRoute: Math.round(distanceFromRoute),
        originCoords: {
          lat: loadOrigin.lat,
          lng: loadOrigin.lng,
        },
        destinationCoords: loadDestResult.success && loadDestResult.coordinates
          ? {
              lat: loadDestResult.coordinates.lat,
              lng: loadDestResult.coordinates.lng,
            }
          : undefined,
      });
    }

    // Sort by added miles (least detour first)
    suggestions.sort((a, b) => a.addedMiles - b.addedMiles);

    return NextResponse.json({
      tripId,
      tripOrigin: {
        city: trip.origin_city,
        state: trip.origin_state,
        zip: trip.origin_postal_code,
        coords: tripOrigin,
      },
      tripDestination: {
        city: trip.destination_city,
        state: trip.destination_state,
        zip: trip.destination_postal_code,
        coords: tripDest,
      },
      capacity: {
        truck: truckCapacity,
        used: usedCapacity,
        available: availableCapacity,
      },
      maxDetour,
      suggestions,
    });
  } catch (error) {
    console.error('Error in trip suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

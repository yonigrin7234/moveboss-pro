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
  const maxDetourParam = searchParams.get('maxDetour') || '50';
  // Handle "all" option - null means no limit
  const maxDetour = maxDetourParam === 'all' ? null : parseInt(maxDetourParam, 10);
  const maxCuft = searchParams.get('maxCuft')
    ? parseInt(searchParams.get('maxCuft')!, 10)
    : null;

  try {
    const supabase = await createClient();

    // Get user's workspace company to exclude their own loads from suggestions
    const { data: workspaceCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_workspace_company', true)
      .maybeSingle();

    const userCompanyId = workspaceCompany?.id;

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        owner_id,
        origin_city, origin_state, origin_postal_code,
        destination_city, destination_state, destination_postal_code,
        truck:trucks(id, cubic_capacity),
        trailer:trailers(id, capacity_cuft)
      `)
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Trip suggestions: Trip not found', { tripId, tripError });
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Log ownership info for debugging
    console.log('Trip suggestions debug:', {
      tripId,
      tripOwnerId: trip.owner_id,
      userId: user.id,
      userCompanyId,
      ownerMatch: trip.owner_id === user.id,
    });

    // Get current loads on the trip (with location data for derivation)
    const { data: tripLoads } = await supabase
      .from('trip_loads')
      .select(`
        sequence_index,
        load:loads(
          id,
          cubic_feet,
          pickup_city, pickup_state, pickup_postal_code,
          delivery_city, delivery_state, delivery_postal_code
        )
      `)
      .eq('trip_id', tripId)
      .order('sequence_index', { ascending: true });

    // Derive origin/destination from loads when trip fields are empty
    const sortedLoads = (tripLoads || [])
      .filter((tl: any) => tl.load)
      .sort((a: any, b: any) => a.sequence_index - b.sequence_index);

    const firstLoad = sortedLoads[0]?.load;
    const lastLoad = sortedLoads[sortedLoads.length - 1]?.load;
    const firstLoadData = Array.isArray(firstLoad) ? firstLoad[0] : firstLoad;
    const lastLoadData = Array.isArray(lastLoad) ? lastLoad[0] : lastLoad;

    // Use trip values if available, otherwise derive from loads
    const effectiveOriginCity = trip.origin_city || firstLoadData?.pickup_city;
    const effectiveOriginState = trip.origin_state || firstLoadData?.pickup_state;
    const effectiveOriginZip = trip.origin_postal_code || firstLoadData?.pickup_postal_code;
    const effectiveDestCity = trip.destination_city || lastLoadData?.delivery_city;
    const effectiveDestState = trip.destination_state || lastLoadData?.delivery_state;
    const effectiveDestZip = trip.destination_postal_code || lastLoadData?.delivery_postal_code;

    // Geocode trip origin and destination (using derived values if needed)
    const [originResult, destResult] = await Promise.all([
      geocodeAddress(effectiveOriginCity, effectiveOriginState, effectiveOriginZip),
      geocodeAddress(effectiveDestCity, effectiveDestState, effectiveDestZip),
    ]);

    if (!originResult.success || !destResult.success) {
      return NextResponse.json({
        error: 'Could not geocode trip locations. Please add loads or set trip origin/destination.',
        suggestions: [],
      });
    }

    const tripOrigin = originResult.coordinates!;
    const tripDest = destResult.coordinates!;

    const usedCapacity = (tripLoads || []).reduce((sum, tl) => {
      const load = Array.isArray(tl.load) ? tl.load[0] : tl.load;
      return sum + (load?.cubic_feet || 0);
    }, 0);

    const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
    const trailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;
    // Prioritize trailer capacity, then truck capacity (for box trucks)
    const truckCapacity = trailer?.capacity_cuft || truck?.cubic_capacity || 0;
    const availableCapacity = truckCapacity - usedCapacity;

    // Get marketplace loads
    // Note: loads table uses pickup_city/delivery_city, not origin_city/destination_city
    // Exclude user's own company's loads - they shouldn't see their own posted jobs
    let loadsQuery = supabase
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
      .eq('posting_status', 'posted')
      .is('assigned_carrier_id', null);

    // Filter out user's own company's loads
    if (userCompanyId) {
      loadsQuery = loadsQuery.neq('company_id', userCompanyId);
    }

    const { data: marketplaceLoads, error: loadsError } = await loadsQuery;

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

      // Skip if detour is too large (unless "all" is selected)
      if (maxDetour !== null && addedMiles > maxDetour) {
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
        city: effectiveOriginCity,
        state: effectiveOriginState,
        zip: effectiveOriginZip,
        coords: tripOrigin,
        isDerived: !trip.origin_city && !!firstLoadData?.pickup_city,
      },
      tripDestination: {
        city: effectiveDestCity,
        state: effectiveDestState,
        zip: effectiveDestZip,
        coords: tripDest,
        isDerived: !trip.destination_city && !!lastLoadData?.delivery_city,
      },
      capacity: {
        truck: truckCapacity,
        used: usedCapacity,
        available: availableCapacity,
      },
      maxDetour,
      suggestions,
      // Debug info
      _debug: {
        userId: user.id,
        tripOwnerId: trip.owner_id,
        userCompanyId,
        marketplaceLoadsFound: marketplaceLoads?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in trip suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/matching/trip-location
 * Updates a trip's current location (called from mobile app)
 *
 * Body:
 * - tripId: string (required)
 * - latitude: number (required)
 * - longitude: number (required)
 * - city?: string
 * - state?: string
 * - remainingCapacityCuft?: number
 *
 * Note: This endpoint allows both owner and driver (via auth_user_id) to update
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tripId, latitude, longitude, city, state, remainingCapacityCuft } = body;

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // First verify the user has access to this trip (either owner or assigned driver)
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        owner_id,
        driver_id,
        driver:drivers(id, auth_user_id)
      `)
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Check authorization
    const isOwner = trip.owner_id === user.id;
    const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
    const isDriver = driver?.auth_user_id === user.id;

    if (!isOwner && !isDriver) {
      return NextResponse.json({ error: 'Not authorized to update this trip' }, { status: 403 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      current_location_lat: latitude,
      current_location_lng: longitude,
      current_location_updated_at: new Date().toISOString(),
    };

    if (city) updateData.current_location_city = city;
    if (state) updateData.current_location_state = state;
    if (typeof remainingCapacityCuft === 'number') {
      updateData.remaining_capacity_cuft = remainingCapacityCuft;
    }

    // Update trip
    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId)
      .select('id, current_location_lat, current_location_lng, current_location_city, current_location_state, current_location_updated_at, remaining_capacity_cuft')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also record to driver_locations history if driver_id is set
    if (trip.driver_id) {
      await supabase.from('driver_locations').insert({
        owner_id: trip.owner_id,
        driver_id: trip.driver_id,
        trip_id: tripId,
        latitude,
        longitude,
        city: city || null,
        state: state || null,
        source: 'mobile_app',
      });
    }

    return NextResponse.json({
      success: true,
      location: {
        lat: data.current_location_lat,
        lng: data.current_location_lng,
        city: data.current_location_city,
        state: data.current_location_state,
        updatedAt: data.current_location_updated_at,
        remainingCapacityCuft: data.remaining_capacity_cuft,
      },
    });
  } catch (error) {
    console.error('Error updating trip location:', error);
    return NextResponse.json(
      { error: 'Failed to update trip location' },
      { status: 500 }
    );
  }
}

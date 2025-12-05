/**
 * API Route: GET /api/marketplace/capacity
 * Returns publicly visible truck capacity for the marketplace
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const minCapacity = searchParams.get('min_capacity');
  const maxCapacity = searchParams.get('max_capacity');

  // Get trips with public capacity visibility that have remaining capacity
  // Join with drivers, trucks, trailers, and companies
  let query = supabase
    .from('trips')
    .select(`
      id,
      trip_number,
      owner_id,
      driver_id,
      truck_id,
      trailer_id,
      status,
      current_location_city,
      current_location_state,
      current_location_lat,
      current_location_lng,
      current_location_updated_at,
      remaining_capacity_cuft,
      expected_completion_date,
      return_route_preference,
      destination_city,
      destination_state,
      share_capacity,
      trip_capacity_visibility,
      driver:drivers!trips_driver_id_fkey(
        id,
        first_name,
        last_name,
        capacity_visibility,
        auto_post_capacity,
        owner_id
      ),
      truck:trucks!trips_truck_id_fkey(
        id,
        unit_number,
        vehicle_type,
        cubic_capacity
      ),
      trailer:trailers!trips_trailer_id_fkey(
        id,
        unit_number,
        cubic_capacity
      ),
      company:companies!inner(
        id,
        company_name,
        name,
        dot_number,
        mc_number,
        is_verified
      )
    `)
    .in('status', ['active', 'en_route', 'planned'])
    .gt('remaining_capacity_cuft', 0);

  // Filter by state if provided
  if (state) {
    query = query.or(`current_location_state.eq.${state},destination_state.eq.${state}`);
  }

  // Filter by capacity range
  if (minCapacity) {
    query = query.gte('remaining_capacity_cuft', parseFloat(minCapacity));
  }
  if (maxCapacity) {
    query = query.lte('remaining_capacity_cuft', parseFloat(maxCapacity));
  }

  const { data: trips, error } = await query;

  if (error) {
    console.error('Error fetching capacity listings:', error);
    return NextResponse.json({ error: 'Failed to fetch capacity listings' }, { status: 500 });
  }

  // Filter to only include trips with public visibility
  const publicCapacity = (trips || []).filter((trip: any) => {
    // Check trip-level override first
    if (trip.trip_capacity_visibility === 'public') return true;
    if (trip.trip_capacity_visibility === 'private') return false;

    // Fall back to driver setting
    const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
    if (driver?.capacity_visibility === 'public') return true;

    return false;
  });

  // Transform data for the marketplace
  const listings = publicCapacity.map((trip: any) => {
    const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
    const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
    const trailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;
    const company = Array.isArray(trip.company) ? trip.company[0] : trip.company;

    // Calculate total capacity
    const totalCapacity = trailer?.cubic_capacity || truck?.cubic_capacity || 0;

    return {
      id: trip.id,
      trip_number: trip.trip_number,

      // Company info (public)
      company: {
        id: company?.id,
        name: company?.company_name || company?.name,
        dot_number: company?.dot_number,
        mc_number: company?.mc_number,
        is_verified: company?.is_verified,
      },

      // Equipment info
      equipment: {
        truck_type: truck?.vehicle_type || 'Unknown',
        truck_unit: truck?.unit_number,
        trailer_unit: trailer?.unit_number,
        total_capacity_cuft: totalCapacity,
      },

      // Capacity info
      capacity: {
        remaining_cuft: trip.remaining_capacity_cuft,
        total_cuft: totalCapacity,
        utilization_percent: totalCapacity > 0
          ? Math.round(((totalCapacity - trip.remaining_capacity_cuft) / totalCapacity) * 100)
          : 0,
      },

      // Location info
      location: {
        current_city: trip.current_location_city,
        current_state: trip.current_location_state,
        destination_city: trip.destination_city,
        destination_state: trip.destination_state,
        last_updated: trip.current_location_updated_at,
      },

      // Availability
      availability: {
        expected_date: trip.expected_completion_date,
        return_preferences: trip.return_route_preference || [],
        status: trip.status,
      },
    };
  });

  return NextResponse.json({
    listings,
    count: listings.length,
  });
}

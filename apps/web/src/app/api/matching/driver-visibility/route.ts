import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';

/**
 * GET /api/matching/driver-visibility?driverId=xxx
 * Returns a driver's visibility settings
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  if (!driverId) {
    return NextResponse.json({ error: 'driverId is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, first_name, last_name, location_sharing_enabled, auto_post_capacity, capacity_visibility')
      .eq('id', driverId)
      .eq('owner_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: `${driver.first_name} ${driver.last_name}`,
        locationSharingEnabled: driver.location_sharing_enabled || false,
        autoPostCapacity: driver.auto_post_capacity || false,
        capacityVisibility: driver.capacity_visibility || 'private',
      },
    });
  } catch (error) {
    console.error('Error fetching driver visibility:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver visibility' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/matching/driver-visibility
 * Updates a driver's visibility settings
 *
 * Body:
 * - driverId: string (required)
 * - locationSharingEnabled?: boolean
 * - autoPostCapacity?: boolean
 * - capacityVisibility?: 'private' | 'partners_only' | 'public'
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { driverId, locationSharingEnabled, autoPostCapacity, capacityVisibility } = body;

    if (!driverId) {
      return NextResponse.json({ error: 'driverId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (typeof locationSharingEnabled === 'boolean') {
      updateData.location_sharing_enabled = locationSharingEnabled;
    }

    if (typeof autoPostCapacity === 'boolean') {
      updateData.auto_post_capacity = autoPostCapacity;
    }

    if (capacityVisibility && ['private', 'partners_only', 'public'].includes(capacityVisibility)) {
      updateData.capacity_visibility = capacityVisibility;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('id', driverId)
      .eq('owner_id', user.id)
      .select('id, first_name, last_name, location_sharing_enabled, auto_post_capacity, capacity_visibility')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      driver: {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        locationSharingEnabled: data.location_sharing_enabled || false,
        autoPostCapacity: data.auto_post_capacity || false,
        capacityVisibility: data.capacity_visibility || 'private',
      },
    });
  } catch (error) {
    console.error('Error updating driver visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update driver visibility' },
      { status: 500 }
    );
  }
}

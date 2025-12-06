import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import { getLatestLocationsForOwner, type DriverLocationRecord } from '@/data/location';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await getLatestLocationsForOwner(user.id);

    // Calculate stats
    const totalDrivers = locations.length;
    const availableDrivers = locations.filter((loc) => loc.is_available_for_loads).length;
    const averageCapacity =
      locations.length > 0
        ? Math.round(
            locations.reduce((sum, loc) => sum + (loc.available_cubic ?? 0), 0) /
              locations.length
          )
        : 0;

    return NextResponse.json({
      locations,
      stats: {
        totalDrivers,
        availableDrivers,
        averageCapacity,
      },
    });
  } catch (error) {
    console.error('Error fetching live fleet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch live fleet' },
      { status: 500 }
    );
  }
}

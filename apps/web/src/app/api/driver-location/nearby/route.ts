import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { findAvailableCapacityNear } from '@/data/location';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusParam = searchParams.get('radiusKm');
  const minCapacityParam = searchParams.get('minAvailableCubic');

  if (!latParam || !lngParam) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const latitude = Number(latParam);
  const longitude = Number(lngParam);
  const radiusKm = radiusParam ? Number(radiusParam) : 100;
  const minAvailableCubic = minCapacityParam ? Number(minCapacityParam) : undefined;

  if ([latitude, longitude, radiusKm].some((value) => Number.isNaN(value))) {
    return NextResponse.json({ error: 'Invalid numeric parameters' }, { status: 400 });
  }

  if (minAvailableCubic !== undefined && Number.isNaN(minAvailableCubic)) {
    return NextResponse.json({ error: 'Invalid minAvailableCubic parameter' }, { status: 400 });
  }

  try {
    const matches = await findAvailableCapacityNear(user.id, {
      latitude,
      longitude,
      radiusKm,
      minAvailableCubic,
    });
    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to locate drivers' },
      { status: 500 }
    );
  }
}



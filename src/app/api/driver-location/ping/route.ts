import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { driverLocationPingSchema, recordDriverLocationPing } from '@/data/location';

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
    const payload = driverLocationPingSchema.parse(body);
    const record = await recordDriverLocationPing(user.id, payload);
    return NextResponse.json({ success: true, record });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record ping' },
      { status: 500 }
    );
  }
}



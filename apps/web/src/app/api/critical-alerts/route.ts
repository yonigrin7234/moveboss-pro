import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCriticalAlertsForUser } from '@/data/critical-alerts';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await getCriticalAlertsForUser(user.id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

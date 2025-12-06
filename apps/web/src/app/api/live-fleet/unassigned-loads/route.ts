import { NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get loads that need driver assignment
    const { data: loads, error } = await supabase
      .from('loads')
      .select(`
        id,
        load_number,
        pickup_city,
        pickup_state,
        delivery_city,
        delivery_state,
        pickup_date,
        cubic_feet,
        cubic_feet_estimate,
        linehaul_rate,
        status,
        service_type,
        company:companies!loads_company_id_fkey(id, name)
      `)
      .eq('owner_id', user.id)
      .is('assigned_driver_id', null)
      .is('trip_id', null)
      .in('status', ['pending', 'assigned'])
      .order('pickup_date', { ascending: true })
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({ loads: loads || [] });
  } catch (error) {
    console.error('Error fetching unassigned loads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch unassigned loads' },
      { status: 500 }
    );
  }
}

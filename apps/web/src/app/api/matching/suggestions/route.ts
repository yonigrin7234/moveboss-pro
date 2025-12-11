import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';

/**
 * GET /api/matching/suggestions
 * Returns load suggestions for the current user's trips
 *
 * Query params:
 * - tripId: Optional - filter to specific trip
 * - status: Optional - filter by status (default: pending)
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');
  const status = searchParams.get('status') || 'pending';

  try {
    const supabase = await createClient();

    let query = supabase
      .from('load_suggestions')
      .select(
        `
        *,
        load:loads(
          id,
          load_number,
          job_number,
          pickup_city,
          pickup_state,
          pickup_zip,
          delivery_city,
          delivery_state,
          delivery_zip,
          cubic_feet,
          total_rate,
          rate_per_cuft,
          balance_due,
          posting_type,
          pickup_date,
          company:companies!loads_company_id_fkey(id, name)
        ),
        trip:trips(id, trip_number, origin_city, origin_state, destination_city, destination_state),
        driver:drivers(id, first_name, last_name)
      `
      )
      .eq('owner_id', user.id)
      .order('match_score', { ascending: false });

    if (tripId) {
      query = query.eq('trip_id', tripId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching load suggestions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data || [] });
  } catch (error) {
    console.error('Error in load suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

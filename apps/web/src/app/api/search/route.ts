import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'load' | 'driver' | 'company' | 'trip';
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const type = searchParams.get('type'); // Optional filter by type

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [];
  const searchTerm = `%${query}%`;

  try {
    // Run searches in parallel
    const promises: Promise<void>[] = [];

    // Search Loads
    if (!type || type === 'load') {
      promises.push(
        (async () => {
          const { data: loads } = await supabase
            .from('loads')
            .select(`
              id,
              load_number,
              job_number,
              pickup_city,
              pickup_state,
              delivery_city,
              delivery_state,
              load_status,
              company:companies!loads_company_id_fkey(name)
            `)
            .eq('owner_id', user.id)
            .or(`pickup_city.ilike.${searchTerm},delivery_city.ilike.${searchTerm},load_number.ilike.${searchTerm},job_number.ilike.${searchTerm}`)
            .limit(5);

          for (const load of loads || []) {
            const origin = [load.pickup_city, load.pickup_state].filter(Boolean).join(', ');
            const dest = [load.delivery_city, load.delivery_state].filter(Boolean).join(', ');
            results.push({
              id: load.id,
              type: 'load',
              title: load.load_number || load.job_number || 'Load',
              subtitle: `${origin} → ${dest}`,
              href: `/dashboard/assigned-loads/${load.id}`,
              metadata: {
                status: load.load_status,
                company: (load.company as any)?.name,
              },
            });
          }
        })()
      );
    }

    // Search Drivers
    if (!type || type === 'driver') {
      promises.push(
        (async () => {
          const { data: drivers } = await supabase
            .from('drivers')
            .select('id, first_name, last_name, phone, status')
            .eq('owner_id', user.id)
            .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
            .limit(5);

          for (const driver of drivers || []) {
            results.push({
              id: driver.id,
              type: 'driver',
              title: `${driver.first_name} ${driver.last_name}`,
              subtitle: driver.phone || 'No phone',
              href: `/dashboard/drivers/${driver.id}`,
              metadata: {
                status: driver.status,
              },
            });
          }
        })()
      );
    }

    // Search Companies
    if (!type || type === 'company') {
      promises.push(
        (async () => {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name, city, state, dot_number')
            .eq('owner_id', user.id)
            .ilike('name', searchTerm)
            .limit(5);

          for (const company of companies || []) {
            const location = [company.city, company.state].filter(Boolean).join(', ');
            results.push({
              id: company.id,
              type: 'company',
              title: company.name,
              subtitle: company.dot_number ? `DOT: ${company.dot_number}` : location || 'Company',
              href: `/dashboard/companies/${company.id}`,
            });
          }
        })()
      );
    }

    // Search Trips
    if (!type || type === 'trip') {
      promises.push(
        (async () => {
          const { data: trips } = await supabase
            .from('trips')
            .select(`
              id,
              trip_number,
              status,
              origin_city,
              origin_state,
              destination_city,
              destination_state,
              driver:drivers!trips_driver_id_fkey(first_name, last_name)
            `)
            .eq('owner_id', user.id)
            .or(`trip_number.ilike.${searchTerm},origin_city.ilike.${searchTerm},destination_city.ilike.${searchTerm}`)
            .limit(5);

          for (const trip of trips || []) {
            const origin = [trip.origin_city, trip.origin_state].filter(Boolean).join(', ');
            const dest = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ');
            const driver = trip.driver as any;
            const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'No driver';
            results.push({
              id: trip.id,
              type: 'trip',
              title: trip.trip_number,
              subtitle: origin && dest ? `${origin} → ${dest}` : driverName,
              href: `/dashboard/trips/${trip.id}`,
              metadata: {
                status: trip.status,
                driver: driverName,
              },
            });
          }
        })()
      );
    }

    await Promise.all(promises);

    // Sort results: exact matches first, then by type priority
    const typePriority = { load: 0, driver: 1, trip: 2, company: 3 };
    results.sort((a, b) => {
      // Exact title match gets priority
      const aExact = a.title.toLowerCase().includes(query) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(query) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      // Then sort by type priority
      return typePriority[a.type] - typePriority[b.type];
    });

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

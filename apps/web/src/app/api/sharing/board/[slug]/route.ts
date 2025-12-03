import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { headers } from 'next/headers';

// GET /api/sharing/board/[slug] - Get public board data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = (page - 1) * limit;

    // Filters
    const originCity = searchParams.get('origin_city');
    const destCity = searchParams.get('dest_city');
    const minCf = searchParams.get('min_cf');
    const maxCf = searchParams.get('max_cf');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    // Fetch company by slug
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select(`
        id,
        name,
        public_board_enabled,
        public_board_slug,
        public_board_show_rates,
        public_board_show_contact,
        public_board_require_auth_to_claim,
        public_board_custom_message,
        public_board_logo_url,
        primary_contact_email,
        primary_contact_phone
      `)
      .eq('public_board_slug', slug)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    if (!company.public_board_enabled) {
      return NextResponse.json({ error: 'This board is currently disabled' }, { status: 403 });
    }

    // Build loads query
    let loadsQuery = adminClient
      .from('loads')
      .select(`
        id,
        load_number,
        pickup_city,
        pickup_state,
        pickup_date,
        pickup_window_start,
        pickup_window_end,
        delivery_city,
        delivery_state,
        delivery_date,
        delivery_window_start,
        delivery_window_end,
        cubic_feet,
        rate_per_cuft,
        total_rate,
        service_type,
        description,
        created_at
      `, { count: 'exact' })
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .order('pickup_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (originCity) {
      loadsQuery = loadsQuery.ilike('pickup_city', `%${originCity}%`);
    }
    if (destCity) {
      loadsQuery = loadsQuery.ilike('delivery_city', `%${destCity}%`);
    }
    if (minCf) {
      loadsQuery = loadsQuery.gte('cubic_feet', parseInt(minCf, 10));
    }
    if (maxCf) {
      loadsQuery = loadsQuery.lte('cubic_feet', parseInt(maxCf, 10));
    }
    if (dateFrom) {
      loadsQuery = loadsQuery.gte('pickup_date', dateFrom);
    }
    if (dateTo) {
      loadsQuery = loadsQuery.lte('pickup_date', dateTo);
    }

    const { data: loads, error: loadsError, count } = await loadsQuery;

    if (loadsError) {
      console.error('Error fetching loads:', loadsError);
      return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
    }

    // Sanitize data based on settings
    const showRates = company.public_board_show_rates;
    const showContact = company.public_board_show_contact;

    const sanitizedLoads = (loads || []).map(load => ({
      id: load.id,
      load_number: load.load_number,
      pickup_city: load.pickup_city,
      pickup_state: load.pickup_state,
      pickup_date: load.pickup_date,
      pickup_window_start: load.pickup_window_start,
      pickup_window_end: load.pickup_window_end,
      delivery_city: load.delivery_city,
      delivery_state: load.delivery_state,
      delivery_date: load.delivery_date,
      delivery_window_start: load.delivery_window_start,
      delivery_window_end: load.delivery_window_end,
      cubic_feet: load.cubic_feet,
      rate_per_cuft: showRates ? load.rate_per_cuft : null,
      total_rate: showRates ? load.total_rate : null,
      service_type: load.service_type,
      description: load.description,
    }));

    // Track analytics
    const headersList = await headers();
    await adminClient.from('share_analytics').insert({
      company_id: company.id,
      share_type: 'public_board',
      action: 'public_view',
      viewer_ip: headersList.get('x-forwarded-for')?.split(',')[0] || null,
      viewer_user_agent: headersList.get('user-agent') || null,
    });

    return NextResponse.json({
      company: {
        name: company.name,
        slug: company.public_board_slug,
        logo_url: company.public_board_logo_url,
        custom_message: company.public_board_custom_message,
        require_auth_to_claim: company.public_board_require_auth_to_claim,
        contact: showContact ? {
          email: company.primary_contact_email,
          phone: company.primary_contact_phone,
        } : null,
      },
      loads: sanitizedLoads,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Public board API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

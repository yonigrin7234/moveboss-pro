import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { headers } from 'next/headers';

// GET /api/sharing/load/[id] - Get single load public data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Load ID is required' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid load ID format' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    // Fetch the load with company info
    const { data: load, error: loadError } = await adminClient
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
        status,
        company_id,
        created_at,
        companies (
          id,
          name,
          public_board_enabled,
          public_board_slug,
          public_board_show_rates,
          public_board_show_contact,
          public_board_require_auth_to_claim,
          public_board_logo_url,
          primary_contact_email,
          primary_contact_phone
        )
      `)
      .eq('id', id)
      .single();

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if load is available (only pending loads are publicly accessible)
    if (load.status !== 'pending') {
      return NextResponse.json({ error: 'This load is no longer available' }, { status: 410 });
    }

    const company = load.companies as unknown as {
      id: string;
      name: string;
      public_board_enabled: boolean;
      public_board_slug: string | null;
      public_board_show_rates: boolean;
      public_board_show_contact: boolean;
      public_board_require_auth_to_claim: boolean;
      public_board_logo_url: string | null;
      primary_contact_email: string | null;
      primary_contact_phone: string | null;
    } | null;

    // Check if public sharing is enabled
    if (!company?.public_board_enabled) {
      return NextResponse.json({ error: 'Public sharing is disabled for this company' }, { status: 403 });
    }

    const showRates = company?.public_board_show_rates ?? true;
    const showContact = company?.public_board_show_contact ?? true;

    // Fetch related loads from same company (for "more loads" section)
    const { data: relatedLoads } = await adminClient
      .from('loads')
      .select(`
        id,
        load_number,
        pickup_city,
        pickup_state,
        pickup_date,
        delivery_city,
        delivery_state,
        cubic_feet,
        total_rate
      `)
      .eq('company_id', load.company_id)
      .eq('status', 'pending')
      .neq('id', id)
      .order('pickup_date', { ascending: true })
      .limit(6);

    // Track analytics
    const headersList = await headers();
    await adminClient.from('share_analytics').insert({
      company_id: load.company_id,
      share_type: 'single_load',
      load_id: id,
      action: 'public_view',
      viewer_ip: headersList.get('x-forwarded-for')?.split(',')[0] || null,
      viewer_user_agent: headersList.get('user-agent') || null,
    });

    return NextResponse.json({
      load: {
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
      },
      company: {
        name: company?.name,
        slug: company?.public_board_slug,
        logo_url: company?.public_board_logo_url,
        require_auth_to_claim: company?.public_board_require_auth_to_claim ?? true,
        contact: showContact ? {
          email: company?.primary_contact_email,
          phone: company?.primary_contact_phone,
        } : null,
      },
      related_loads: (relatedLoads || []).map(rl => ({
        id: rl.id,
        load_number: rl.load_number,
        pickup_city: rl.pickup_city,
        pickup_state: rl.pickup_state,
        pickup_date: rl.pickup_date,
        delivery_city: rl.delivery_city,
        delivery_state: rl.delivery_state,
        cubic_feet: rl.cubic_feet,
        total_rate: showRates ? rl.total_rate : null,
      })),
    });

  } catch (error) {
    console.error('Public load API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sharing/load/[id] - Track claim click
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Load ID and action are required' }, { status: 400 });
    }

    if (!['claim_click', 'claim_submitted'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    // Get the load to find company_id
    const { data: load } = await adminClient
      .from('loads')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Track analytics
    const headersList = await headers();
    await adminClient.from('share_analytics').insert({
      company_id: load.company_id,
      share_type: 'single_load',
      load_id: id,
      action,
      viewer_ip: headersList.get('x-forwarded-for')?.split(',')[0] || null,
      viewer_user_agent: headersList.get('user-agent') || null,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Track claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import { headers } from 'next/headers';

// GET /api/sharing/batch/[token] - Get batch share link data (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    // Fetch the share link
    const { data: shareLink, error: linkError } = await adminClient
      .from('load_share_links')
      .select(`
        id,
        company_id,
        load_ids,
        expires_at,
        view_count,
        is_active,
        created_at,
        companies (
          id,
          name,
          public_board_slug,
          public_board_show_rates,
          public_board_show_contact,
          public_board_logo_url
        )
      `)
      .eq('token', token)
      .single();

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if active
    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'This share link has been deactivated' }, { status: 410 });
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    const company = shareLink.companies as unknown as {
      id: string;
      name: string;
      public_board_slug: string;
      public_board_show_rates: boolean;
      public_board_show_contact: boolean;
      public_board_logo_url: string | null;
    } | null;

    // Fetch the loads (only OPEN/pending status)
    const { data: loads, error: loadsError } = await adminClient
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
        status
      `)
      .in('id', shareLink.load_ids)
      .eq('status', 'pending');

    if (loadsError) {
      console.error('Error fetching loads:', loadsError);
      return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
    }

    // Filter out sensitive data based on company settings
    const showRates = company?.public_board_show_rates ?? true;

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

    // Increment view count
    await adminClient
      .from('load_share_links')
      .update({ view_count: (shareLink.view_count || 0) + 1 })
      .eq('id', shareLink.id);

    // Track analytics
    const headersList = await headers();
    await adminClient.from('share_analytics').insert({
      company_id: shareLink.company_id,
      share_type: 'batch_link',
      batch_token: token,
      action: 'public_view',
      viewer_ip: headersList.get('x-forwarded-for')?.split(',')[0] || null,
      viewer_user_agent: headersList.get('user-agent') || null,
    });

    return NextResponse.json({
      company: company ? {
        name: company.name,
        slug: company.public_board_slug,
        logo_url: company.public_board_logo_url,
        show_contact: company.public_board_show_contact,
      } : null,
      loads: sanitizedLoads,
      expires_at: shareLink.expires_at,
      created_at: shareLink.created_at,
      total_loads: shareLink.load_ids.length,
      available_loads: sanitizedLoads.length,
    });

  } catch (error) {
    console.error('Batch share API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

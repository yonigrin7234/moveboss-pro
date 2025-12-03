import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';

// Types for sharing operations
interface Load {
  id: string;
  load_number: string;
  pickup_city: string;
  pickup_state: string;
  delivery_city: string;
  delivery_state: string;
  pickup_date: string;
  pickup_window_start: string;
  pickup_window_end: string;
  delivery_date: string;
  cubic_feet: number;
  rate_per_cuft: number;
  total_rate: number;
  service_type: string;
  status: string;
  company_id: string;
  description?: string;
}

interface GenerateTextRequest {
  loadIds: string[];
  format: 'whatsapp' | 'plain' | 'email';
  includeLink: boolean;
  linkType: 'single' | 'batch' | 'board';
  companySlug?: string;
}

interface CreateBatchLinkRequest {
  loadIds: string[];
  expiresIn?: '1d' | '7d' | '30d' | 'never';
}

// Helper to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to format date range
function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'TBD';
  if (start && end) {
    const startDate = formatDate(start);
    const endDate = formatDate(end);
    return startDate === endDate ? startDate : `${startDate}–${endDate}`;
  }
  return formatDate(start || end);
}

// Helper to format currency
function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Call for rate';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format route (city, state abbreviation)
function formatRoute(originCity: string, originState: string, destCity: string, destState: string): string {
  const origin = originCity && originState ? `${originCity}, ${originState}` : originCity || originState || 'TBD';
  const dest = destCity && destState ? `${destCity}, ${destState}` : destCity || destState || 'TBD';
  return `${origin} → ${dest}`;
}

// Generate WhatsApp formatted message for loads
function generateWhatsAppMessage(loads: Load[], link: string, showRates: boolean = true): string {
  if (loads.length === 1) {
    const load = loads[0];
    const route = formatRoute(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);
    const pickupRange = formatDateRange(load.pickup_window_start || load.pickup_date, load.pickup_window_end);
    const cf = load.cubic_feet ? `${load.cubic_feet.toLocaleString()} CF` : 'TBD';
    const rate = showRates && load.rate_per_cuft ? `@ $${load.rate_per_cuft.toFixed(2)}/cf` : '';
    const payout = showRates && load.total_rate ? formatCurrency(load.total_rate) : '';

    let message = `🚚 *LOAD AVAILABLE*\n`;
    message += `📍 ${route}\n`;
    message += `📦 ${cf}${rate ? ` ${rate}` : ''}\n`;
    message += `📅 Pickup: ${pickupRange}\n`;
    if (payout) {
      message += `💰 ${payout} payout\n`;
    }
    message += `\n🔗 Claim: ${link}`;

    return message;
  }

  // Multiple loads
  let message = `🚚 *${loads.length} LOADS AVAILABLE*\n\n`;

  loads.forEach((load, index) => {
    const route = formatRoute(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);
    const pickupRange = formatDateRange(load.pickup_window_start || load.pickup_date, load.pickup_window_end);
    const cf = load.cubic_feet ? `${load.cubic_feet.toLocaleString()} CF` : 'TBD';
    const payout = showRates && load.total_rate ? ` - ${formatCurrency(load.total_rate)}` : '';

    message += `*${index + 1}.* ${route}\n`;
    message += `   📦 ${cf}${payout}\n`;
    message += `   📅 ${pickupRange}\n\n`;
  });

  message += `🔗 View all: ${link}`;

  return message;
}

// Generate plain text message
function generatePlainMessage(loads: Load[], link: string, showRates: boolean = true): string {
  if (loads.length === 1) {
    const load = loads[0];
    const route = formatRoute(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);
    const pickupRange = formatDateRange(load.pickup_window_start || load.pickup_date, load.pickup_window_end);
    const cf = load.cubic_feet ? `${load.cubic_feet.toLocaleString()} CF` : 'TBD';
    const rate = showRates && load.rate_per_cuft ? `@ $${load.rate_per_cuft.toFixed(2)}/cf` : '';
    const payout = showRates && load.total_rate ? formatCurrency(load.total_rate) : '';

    let message = `LOAD AVAILABLE\n`;
    message += `Route: ${route}\n`;
    message += `Size: ${cf}${rate ? ` ${rate}` : ''}\n`;
    message += `Pickup: ${pickupRange}\n`;
    if (payout) {
      message += `Payout: ${payout}\n`;
    }
    message += `\nClaim: ${link}`;

    return message;
  }

  let message = `${loads.length} LOADS AVAILABLE\n\n`;

  loads.forEach((load, index) => {
    const route = formatRoute(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);
    const pickupRange = formatDateRange(load.pickup_window_start || load.pickup_date, load.pickup_window_end);
    const cf = load.cubic_feet ? `${load.cubic_feet.toLocaleString()} CF` : 'TBD';
    const payout = showRates && load.total_rate ? ` - ${formatCurrency(load.total_rate)}` : '';

    message += `${index + 1}. ${route}\n`;
    message += `   ${cf}${payout} - Pickup: ${pickupRange}\n\n`;
  });

  message += `View all: ${link}`;

  return message;
}

// Generate email HTML message
function generateEmailMessage(loads: Load[], link: string, showRates: boolean = true): string {
  const loadRows = loads.map(load => {
    const route = formatRoute(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);
    const pickupRange = formatDateRange(load.pickup_window_start || load.pickup_date, load.pickup_window_end);
    const cf = load.cubic_feet ? `${load.cubic_feet.toLocaleString()} CF` : 'TBD';
    const payout = showRates && load.total_rate ? formatCurrency(load.total_rate) : 'Call for rate';

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${route}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${cf}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${pickupRange}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${payout}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">${loads.length === 1 ? 'Load Available' : `${loads.length} Loads Available`}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 12px; text-align: left;">Route</th>
            <th style="padding: 12px; text-align: left;">Size</th>
            <th style="padding: 12px; text-align: left;">Pickup</th>
            <th style="padding: 12px; text-align: left;">Payout</th>
          </tr>
        </thead>
        <tbody>
          ${loadRows}
        </tbody>
      </table>
      <p>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View ${loads.length === 1 ? 'Load' : 'All Loads'}
        </a>
      </p>
    </div>
  `;
}

// Get base URL for links
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.pro';
}

// POST /api/sharing - Generate share text or create batch link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, companies(public_board_slug, public_board_show_rates)')
      .eq('user_id', user.id)
      .single();

    if (!membership?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const companyId = membership.company_id;
    const companySettings = membership.companies as unknown as { public_board_slug: string; public_board_show_rates: boolean } | null;
    const showRates = companySettings?.public_board_show_rates ?? true;

    if (action === 'generate-text') {
      const { loadIds, format, includeLink, linkType } = body as GenerateTextRequest;

      if (!loadIds || loadIds.length === 0) {
        return NextResponse.json({ error: 'No loads specified' }, { status: 400 });
      }

      // Fetch loads
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .in('id', loadIds)
        .eq('company_id', companyId)
        .eq('status', 'pending');

      if (loadsError || !loads || loads.length === 0) {
        return NextResponse.json({ error: 'Loads not found or not available' }, { status: 404 });
      }

      // Generate the appropriate link
      let link = '';
      const baseUrl = getBaseUrl();

      if (includeLink) {
        if (linkType === 'single' && loads.length === 1) {
          link = `${baseUrl}/loads/${loads[0].id}/public`;
        } else if (linkType === 'board' && companySettings?.public_board_slug) {
          link = `${baseUrl}/board/${companySettings.public_board_slug}`;
        } else {
          // Create batch link
          const adminClient = createServiceRoleClient();
          const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

          const { error: insertError } = await adminClient
            .from('load_share_links')
            .insert({
              company_id: companyId,
              created_by: user.id,
              load_ids: loadIds,
              token,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
              is_active: true,
            });

          if (insertError) {
            console.error('Error creating share link:', insertError);
            return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
          }

          link = `${baseUrl}/share/${token}`;
        }
      }

      // Generate the formatted message
      let text = '';
      switch (format) {
        case 'whatsapp':
          text = generateWhatsAppMessage(loads as Load[], link, showRates);
          break;
        case 'email':
          text = generateEmailMessage(loads as Load[], link, showRates);
          break;
        case 'plain':
        default:
          text = generatePlainMessage(loads as Load[], link, showRates);
      }

      // Track analytics
      const adminClient = createServiceRoleClient();
      await adminClient.from('share_analytics').insert({
        company_id: companyId,
        share_type: loads.length === 1 ? 'single_load' : 'batch_link',
        load_id: loads.length === 1 ? loads[0].id : null,
        channel: format,
        action: 'share_generated',
      });

      return NextResponse.json({ text, link });
    }

    if (action === 'create-batch-link') {
      const { loadIds, expiresIn } = body as CreateBatchLinkRequest;

      if (!loadIds || loadIds.length === 0) {
        return NextResponse.json({ error: 'No loads specified' }, { status: 400 });
      }

      // Verify loads belong to company and are open
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('id')
        .in('id', loadIds)
        .eq('company_id', companyId)
        .eq('status', 'pending');

      if (loadsError || !loads || loads.length === 0) {
        return NextResponse.json({ error: 'Loads not found or not available' }, { status: 404 });
      }

      // Calculate expiration
      let expiresAt: Date | null = null;
      switch (expiresIn) {
        case '1d':
          expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
          break;
        case '7d':
          expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'never':
        default:
          expiresAt = null;
      }

      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      const adminClient = createServiceRoleClient();
      const { data: shareLink, error: insertError } = await adminClient
        .from('load_share_links')
        .insert({
          company_id: companyId,
          created_by: user.id,
          load_ids: loads.map(l => l.id),
          token,
          expires_at: expiresAt?.toISOString() || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating share link:', insertError);
        return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
      }

      const link = `${getBaseUrl()}/share/${token}`;

      // Track analytics
      await adminClient.from('share_analytics').insert({
        company_id: companyId,
        share_type: 'batch_link',
        batch_token: token,
        action: 'share_generated',
      });

      return NextResponse.json({
        link,
        token,
        expiresAt: expiresAt?.toISOString() || null,
        loadCount: loads.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Sharing API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

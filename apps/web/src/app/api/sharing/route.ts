import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createServiceRoleClient } from '@/lib/supabase-admin';
import {
  buildShareMessage,
  type ShareableLoad,
  type ShareFormat,
} from '@/lib/sharing';
import { formatCompanyName } from '@/lib/utils';

interface GenerateTextRequest {
  loadIds: string[];
  format: ShareFormat;
  includeLink: boolean;
  linkType: 'single' | 'batch' | 'board';
  companySlug?: string;
}

interface CreateBatchLinkRequest {
  loadIds: string[];
  expiresIn?: '1d' | '7d' | '30d' | 'never';
}

// Get base URL for links
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.com';
}

// Generate a short token using base62 encoding (alphanumeric)
// 8 characters = 62^8 = ~218 trillion combinations
function generateShortToken(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes).map(b => chars[b % 62]).join('');
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

    // Get user's company with name
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, companies(name, public_board_slug, public_board_show_rates)')
      .eq('user_id', user.id)
      .single();

    if (!membership?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const companyId = membership.company_id;
    const companySettings = membership.companies as unknown as { name: string; public_board_slug: string; public_board_show_rates: boolean } | null;
    const companyName = formatCompanyName(companySettings?.name) || 'Unknown Company';
    const showRates = companySettings?.public_board_show_rates ?? true;

    if (action === 'generate-text') {
      const { loadIds, format, includeLink } = body as GenerateTextRequest;

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

      // Always generate a clean /share/[token] URL
      let link = '';
      const baseUrl = getBaseUrl();

      if (includeLink) {
        // Always create a share token for clean URLs
        const adminClient = createServiceRoleClient();
        const token = generateShortToken();

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

      // Generate the formatted message using unified builder
      const text = buildShareMessage(loads as ShareableLoad[], {
        format,
        link,
        showRates,
        companyName,
      });

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

      const token = generateShortToken();

      const adminClient = createServiceRoleClient();
      const { error: insertError } = await adminClient
        .from('load_share_links')
        .insert({
          company_id: companyId,
          created_by: user.id,
          load_ids: loads.map(l => l.id),
          token,
          expires_at: expiresAt?.toISOString() || null,
          is_active: true,
        });

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

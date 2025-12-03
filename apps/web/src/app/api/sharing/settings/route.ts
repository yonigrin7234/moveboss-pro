import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  public_board_enabled: z.boolean().optional(),
  public_board_slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only').optional(),
  public_board_show_rates: z.boolean().optional(),
  public_board_show_contact: z.boolean().optional(),
  public_board_require_auth_to_claim: z.boolean().optional(),
  public_board_custom_message: z.string().max(500).optional().nullable(),
  public_board_logo_url: z.string().url().max(2000).optional().nullable(),
});

// GET /api/sharing/settings - Get current sharing settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company membership
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!membership?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Get company sharing settings
    const { data: company, error: companyError } = await supabase
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
        public_board_logo_url
      `)
      .eq('id', membership.company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.pro';

    return NextResponse.json({
      settings: {
        public_board_enabled: company.public_board_enabled ?? true,
        public_board_slug: company.public_board_slug,
        public_board_show_rates: company.public_board_show_rates ?? true,
        public_board_show_contact: company.public_board_show_contact ?? true,
        public_board_require_auth_to_claim: company.public_board_require_auth_to_claim ?? true,
        public_board_custom_message: company.public_board_custom_message,
        public_board_logo_url: company.public_board_logo_url,
      },
      board_url: company.public_board_slug ? `${baseUrl}/board/${company.public_board_slug}` : null,
      company_name: company.name,
    });

  } catch (error) {
    console.error('Get sharing settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sharing/settings - Update sharing settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Get user's company membership
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Check for admin/owner role (optional - remove if all members can update)
    // if (membership.role !== 'owner' && membership.role !== 'admin') {
    //   return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    // }

    // If changing slug, check for uniqueness
    if (updates.public_board_slug) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('public_board_slug', updates.public_board_slug)
        .neq('id', membership.company_id)
        .single();

      if (existingCompany) {
        return NextResponse.json(
          { error: 'This slug is already taken. Please choose a different one.' },
          { status: 409 }
        );
      }
    }

    // Update company settings
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', membership.company_id)
      .select(`
        id,
        name,
        public_board_enabled,
        public_board_slug,
        public_board_show_rates,
        public_board_show_contact,
        public_board_require_auth_to_claim,
        public_board_custom_message,
        public_board_logo_url
      `)
      .single();

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.pro';

    return NextResponse.json({
      success: true,
      settings: {
        public_board_enabled: updatedCompany.public_board_enabled,
        public_board_slug: updatedCompany.public_board_slug,
        public_board_show_rates: updatedCompany.public_board_show_rates,
        public_board_show_contact: updatedCompany.public_board_show_contact,
        public_board_require_auth_to_claim: updatedCompany.public_board_require_auth_to_claim,
        public_board_custom_message: updatedCompany.public_board_custom_message,
        public_board_logo_url: updatedCompany.public_board_logo_url,
      },
      board_url: updatedCompany.public_board_slug
        ? `${baseUrl}/board/${updatedCompany.public_board_slug}`
        : null,
    });

  } catch (error) {
    console.error('Update sharing settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT for checking slug availability
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 2 || slug.length > 50) {
      return NextResponse.json({
        available: false,
        error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens (2-50 characters).',
      });
    }

    // Get user's company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    // Check if slug is taken by another company
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('public_board_slug', slug)
      .neq('id', membership?.company_id || '')
      .single();

    return NextResponse.json({
      available: !existingCompany,
      slug,
    });

  } catch (error) {
    console.error('Check slug availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

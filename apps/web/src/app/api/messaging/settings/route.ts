import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getLoadCommunicationSettings,
  updateDriverVisibility,
  getPartnerCommunicationSettings,
  updatePartnerCommunicationSettings,
  updateDriverVisibilitySchema,
  getLoadCommunicationPermissions,
} from '@/data/conversations';

// GET /api/messaging/settings
// Get communication settings for a load or partner relationship
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const loadId = searchParams.get('load_id');
    const carrierCompanyId = searchParams.get('carrier_company_id');
    const partnerCompanyId = searchParams.get('partner_company_id');

    if (loadId) {
      const settings = await getLoadCommunicationSettings(loadId);
      const permissions = await getLoadCommunicationPermissions(loadId, user.id);
      return NextResponse.json({ settings, permissions });
    }

    if (carrierCompanyId && partnerCompanyId) {
      const settings = await getPartnerCommunicationSettings(carrierCompanyId, partnerCompanyId);
      return NextResponse.json({ settings });
    }

    return NextResponse.json(
      { error: 'Either load_id or both carrier_company_id and partner_company_id are required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get settings API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/messaging/settings
// Update communication settings
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { setting_type, ...data } = body;

    switch (setting_type) {
      case 'driver_visibility': {
        const parsed = updateDriverVisibilitySchema.safeParse(data);
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 }
          );
        }

        // Check permissions first
        const permissions = await getLoadCommunicationPermissions(parsed.data.load_id, user.id);
        if (!permissions.can_change_driver_visibility) {
          return NextResponse.json(
            { error: 'You do not have permission to change driver visibility' },
            { status: 403 }
          );
        }

        if (permissions.is_visibility_locked) {
          return NextResponse.json(
            { error: 'Driver visibility is locked by partner settings' },
            { status: 403 }
          );
        }

        const settings = await updateDriverVisibility(
          parsed.data.load_id,
          parsed.data.driver_visibility,
          user.id,
          parsed.data.driver_id
        );

        return NextResponse.json({ settings });
      }

      case 'partner_settings': {
        const { carrier_company_id, partner_company_id, ...settingsData } = data;

        if (!carrier_company_id || !partner_company_id) {
          return NextResponse.json(
            { error: 'carrier_company_id and partner_company_id are required' },
            { status: 400 }
          );
        }

        // Verify user has permission (must be member of carrier company with appropriate role)
        const { data: membership } = await supabase
          .from('company_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_id', carrier_company_id)
          .single();

        if (!membership || !['owner', 'dispatcher', 'admin'].includes(membership.role)) {
          return NextResponse.json(
            { error: 'You do not have permission to update partner settings' },
            { status: 403 }
          );
        }

        const settings = await updatePartnerCommunicationSettings(
          carrier_company_id,
          partner_company_id,
          settingsData,
          user.id
        );

        return NextResponse.json({ settings });
      }

      default:
        return NextResponse.json({ error: 'Invalid setting_type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Update settings API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

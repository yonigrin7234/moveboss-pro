import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';

const DEFAULT_SETTINGS = {
  min_profit_per_mile: 1.0,
  max_deadhead_miles: 150,
  min_match_score: 50,
  preferred_return_states: [],
  excluded_states: [],
  min_capacity_utilization_percent: 30,
  max_capacity_utilization_percent: 100,
  notification_preference: 'push_and_dashboard',
  auto_post_capacity_enabled: false,
  auto_post_min_capacity_cuft: 500,
  default_location_sharing: false,
  default_capacity_visibility: 'private',
};

/**
 * GET /api/matching/settings
 * Returns the user's matching preferences
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get user's company ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { data: settings, error } = await supabase
      .from('company_matching_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return settings with defaults for any missing fields
    return NextResponse.json({
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
        owner_id: user.id,
        company_id: profile?.company_id || null,
      },
    });
  } catch (error) {
    console.error('Error fetching matching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/matching/settings
 * Updates the user's matching preferences
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const supabase = await createClient();

    // Get user's company ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    // Validate and sanitize updates
    const allowedFields = [
      'min_profit_per_mile',
      'max_deadhead_miles',
      'min_match_score',
      'preferred_return_states',
      'excluded_states',
      'min_capacity_utilization_percent',
      'max_capacity_utilization_percent',
      'notification_preference',
      'auto_post_capacity_enabled',
      'auto_post_min_capacity_cuft',
      'default_location_sharing',
      'default_capacity_visibility',
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('company_matching_settings')
      .upsert(
        {
          owner_id: user.id,
          company_id: profile?.company_id || null,
          ...sanitizedUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      settings: {
        ...DEFAULT_SETTINGS,
        ...data,
      },
    });
  } catch (error) {
    console.error('Error updating matching settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

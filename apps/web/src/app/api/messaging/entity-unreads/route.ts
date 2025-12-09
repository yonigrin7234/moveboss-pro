import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getUnreadByLoadForUser,
  getUnreadByTripForUser,
  getUnreadForEntity,
} from '@/data/conversations';

/**
 * GET /api/messaging/entity-unreads
 * Returns unread message counts aggregated by entity (load or trip)
 *
 * Query params:
 * - type: 'load' | 'trip' (required)
 * - entityId: string (optional) - if provided, returns count for single entity
 *
 * Response:
 * - { type: 'load', items: { [loadId]: unreadCount } }
 * - { type: 'trip', items: { [tripId]: unreadCount } }
 * - { type: 'load', entityId: '...', unreadCount: number } (single entity mode)
 */
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
    const type = searchParams.get('type') as 'load' | 'trip' | null;
    const entityId = searchParams.get('entityId');

    if (!type || (type !== 'load' && type !== 'trip')) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "load" or "trip".' },
        { status: 400 }
      );
    }

    // Get user's primary company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!membership) {
      return NextResponse.json({ type, items: {} });
    }

    // Single entity mode
    if (entityId) {
      const unreadCount = await getUnreadForEntity(
        user.id,
        membership.company_id,
        type,
        entityId
      );
      return NextResponse.json({ type, entityId, unreadCount });
    }

    // Bulk mode - get all unreads for the entity type
    if (type === 'load') {
      const items = await getUnreadByLoadForUser(user.id, membership.company_id);
      return NextResponse.json({ type, items });
    } else {
      const items = await getUnreadByTripForUser(user.id, membership.company_id);
      return NextResponse.json({ type, items });
    }
  } catch (error) {
    console.error('Entity unreads API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch entity unreads' },
      { status: 500 }
    );
  }
}

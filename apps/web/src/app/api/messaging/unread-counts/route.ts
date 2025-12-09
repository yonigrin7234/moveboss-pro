import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * GET /api/messaging/unread-counts
 * Returns total unread message counts for sidebar badges
 * - messages: Total unread across non-dispatch conversations
 * - dispatch: Total unread across driver_dispatch conversations
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's primary company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!membership) {
      return NextResponse.json({ messages: 0, dispatch: 0 });
    }

    // Get all participant records for this user with unread counts
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        unread_count,
        conversation:conversation_id (
          type,
          owner_company_id,
          partner_company_id,
          carrier_company_id
        )
      `)
      .eq('user_id', user.id)
      .gt('unread_count', 0);

    if (!participants || participants.length === 0) {
      return NextResponse.json({ messages: 0, dispatch: 0 });
    }

    let messagesUnread = 0;
    let dispatchUnread = 0;

    for (const participant of participants) {
      const conv = Array.isArray(participant.conversation)
        ? participant.conversation[0]
        : participant.conversation;

      if (!conv) continue;

      // Check if user's company has access to this conversation
      const hasAccess =
        conv.owner_company_id === membership.company_id ||
        conv.partner_company_id === membership.company_id ||
        conv.carrier_company_id === membership.company_id;

      if (!hasAccess) continue;

      if (conv.type === 'driver_dispatch') {
        dispatchUnread += participant.unread_count;
      } else {
        messagesUnread += participant.unread_count;
      }
    }

    return NextResponse.json({
      messages: messagesUnread,
      dispatch: dispatchUnread,
    });
  } catch (error) {
    console.error('Unread counts API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch unread counts' },
      { status: 500 }
    );
  }
}

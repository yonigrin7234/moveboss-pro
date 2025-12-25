import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * GET /api/messaging/unread-counts
 * Returns total unread message counts for sidebar badges
 * - messages: Total unread across non-dispatch conversations
 * - dispatch: Total unread across driver_dispatch conversations
 *
 * NOTE: We calculate unread counts directly from messages rather than relying
 * on the conversation_participants.unread_count field, because the database
 * trigger that updates that field runs in the sender's context and may be
 * blocked by RLS policies when a driver sends a message.
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

    // Get all conversations the user's company has access to
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, type')
      .or(`owner_company_id.eq.${membership.company_id},partner_company_id.eq.${membership.company_id},carrier_company_id.eq.${membership.company_id}`)
      .eq('is_archived', false);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ messages: 0, dispatch: 0 });
    }

    // Get participant records (for last_read_at timestamps)
    const conversationIds = conversations.map((c) => c.id);
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
      .in('conversation_id', conversationIds);

    const lastReadMap = new Map(
      (participants ?? []).map((p) => [p.conversation_id, p.last_read_at])
    );

    let messagesUnread = 0;
    let dispatchUnread = 0;

    // For each conversation, count messages not sent by this user
    // that were created after the user's last_read_at (or all if never read)
    for (const conv of conversations) {
      const lastReadAt = lastReadMap.get(conv.id);

      // Count messages not sent by this user (includes driver messages where sender_user_id is null)
      let query = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .or(`sender_user_id.is.null,sender_user_id.neq.${user.id}`);

      // If user has read this conversation before, only count messages after that
      if (lastReadAt) {
        query = query.gt('created_at', lastReadAt);
      }

      const { count } = await query;
      const unreadCount = count ?? 0;

      if (unreadCount > 0) {
        if (conv.type === 'driver_dispatch') {
          dispatchUnread += unreadCount;
        } else {
          messagesUnread += unreadCount;
        }
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

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

    // CRITICAL: First, ensure participant records exist for all conversations the user has access to
    // This fixes the issue where dispatchers don't see unread badges because they don't have participant records
    await ensureParticipantRecords(supabase, user.id, membership.company_id);

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

/**
 * Ensures participant records exist for all conversations the user has access to.
 * For new participant records, calculates the initial unread count based on messages
 * not sent by this user.
 */
async function ensureParticipantRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string
): Promise<void> {
  // Find all conversations the user's company has access to
  const { data: accessibleConversations } = await supabase
    .from('conversations')
    .select('id, type')
    .or(`owner_company_id.eq.${companyId},partner_company_id.eq.${companyId},carrier_company_id.eq.${companyId}`)
    .eq('is_archived', false);

  if (!accessibleConversations || accessibleConversations.length === 0) {
    return;
  }

  const conversationIds = accessibleConversations.map((c) => c.id);

  // Find which conversations the user already has participant records for
  const { data: existingParticipants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds);

  const existingConvIds = new Set((existingParticipants ?? []).map((p) => p.conversation_id));

  // Find conversations without participant records
  const missingConversations = accessibleConversations.filter((c) => !existingConvIds.has(c.id));

  if (missingConversations.length === 0) {
    return;
  }

  // For each missing conversation, calculate the unread count (messages not from this user)
  // and create a participant record
  const participantsToInsert = [];

  for (const conv of missingConversations) {
    // Count messages not sent by this user
    // NOTE: For driver messages, sender_user_id is NULL (they use sender_driver_id)
    // In SQL, NULL != value returns NULL (falsy), so we need to handle this case
    // We count messages where sender_user_id is NULL OR sender_user_id != userId
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .or(`sender_user_id.is.null,sender_user_id.neq.${userId}`)
      .eq('is_deleted', false);

    participantsToInsert.push({
      conversation_id: conv.id,
      user_id: userId,
      company_id: companyId,
      role: 'dispatcher' as const,
      can_read: true,
      can_write: true,
      is_driver: false,
      unread_count: count ?? 0,
    });
  }

  if (participantsToInsert.length > 0) {
    // Use upsert to handle race conditions
    await supabase
      .from('conversation_participants')
      .upsert(participantsToInsert, { onConflict: 'conversation_id,user_id' });
  }
}

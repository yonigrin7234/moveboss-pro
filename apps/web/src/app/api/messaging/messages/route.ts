import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getConversationMessages,
  getConversation,
  sendMessage,
  sendMessageSchema,
} from '@/data/conversations';
import {
  sendPushToDriver,
  sendPushToUser,
  getConversationNotificationTitle,
} from '@/lib/push-notifications';

// GET /api/messaging/messages?conversation_id=xxx
// Get messages for a conversation
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
    const conversationId = searchParams.get('conversation_id');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const before = searchParams.get('before') ?? undefined;
    const after = searchParams.get('after') ?? undefined;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    console.log('[Messages API] Fetching messages for:', { conversationId, userId: user.id });

    // Fetch messages first (RLS will enforce access)
    let messagesResult;
    try {
      messagesResult = await getConversationMessages(conversationId, user.id, {
        limit,
        before,
        after,
      });
      console.log('[Messages API] Messages fetched:', messagesResult.messages.length);
    } catch (msgError) {
      console.error('[Messages API] Failed to fetch messages:', msgError);
      throw msgError;
    }

    // Try to get conversation details, but don't fail if RLS blocks it
    let conversation = null;
    try {
      conversation = await getConversation(conversationId, user.id);
    } catch (convError) {
      console.error('Failed to fetch conversation details:', convError);
      // Continue without conversation details - messages still work
    }

    // If we couldn't get conversation details, create a minimal one from the request
    if (!conversation) {
      // Get basic info from messages if available
      conversation = {
        id: conversationId,
        type: 'general' as const,
        title: 'Conversation',
        message_count: messagesResult.messages.length,
      };
    }

    return NextResponse.json({
      messages: messagesResult.messages,
      hasMore: messagesResult.hasMore,
      conversation,
    });
  } catch (error) {
    console.error('Get messages API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/messaging/messages
// Send a message
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { conversation_id, body: messageBody, message_type, attachments, metadata, reply_to_message_id } = parsed.data;

    // Get user's company
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'messages/route.ts:POST:SENDING',message:'Sending message via API',data:{conversation_id,userId:user.id,messageBodyLength:messageBody.length,companyId:membership?.company_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    const message = await sendMessage(conversation_id, user.id, messageBody, {
      message_type,
      attachments,
      metadata,
      reply_to_message_id,
      sender_company_id: membership?.company_id,
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'messages/route.ts:POST:MESSAGE_SENT',message:'Message sent successfully',data:{conversation_id,messageId:message.id,messageBodyLength:messageBody.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    // Send push notifications to other participants
    await sendMessageNotifications(supabase, conversation_id, user.id, messageBody);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}

// Helper to send push notifications to conversation participants
async function sendMessageNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  senderUserId: string,
  messagePreview: string
) {
  // Get conversation info with all related data for proper titles
  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      type,
      title,
      load_id,
      trip_id,
      partner_company_id,
      context,
      loads:load_id (load_number),
      trips:trip_id (trip_number),
      partner_company:partner_company_id (name)
    `)
    .eq('id', conversationId)
    .single();

  // Get sender info
  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', senderUserId)
    .single();

  // Get other participants who have notifications enabled
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('user_id, driver_id, notifications_enabled, is_muted')
    .eq('conversation_id', conversationId)
    .eq('can_read', true)
    .eq('notifications_enabled', true)
    .eq('is_muted', false);

  if (!participants) return;

  // Extract related data (Supabase returns as arrays for FK joins)
  const load = Array.isArray(conversation?.loads) ? conversation.loads[0] : conversation?.loads;
  const trip = Array.isArray(conversation?.trips) ? conversation.trips[0] : conversation?.trips;
  const partnerCompany = Array.isArray(conversation?.partner_company)
    ? conversation.partner_company[0]
    : conversation?.partner_company;

  // Get driver name for driver_dispatch conversations from context
  const conversationContext = conversation?.context as { driver_name?: string } | null;
  const driverName = conversationContext?.driver_name;

  // Generate notification title using the centralized helper
  const title = getConversationNotificationTitle({
    type: conversation?.type || 'general',
    title: conversation?.title,
    load_number: load?.load_number,
    trip_number: trip?.trip_number,
    partner_company_name: partnerCompany?.name,
    driver_name: driverName,
  });

  const preview = messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview;
  const notificationBody = sender?.full_name ? `${sender.full_name}: ${preview}` : preview;

  // Send to users (excluding sender)
  const userIds = participants
    .filter(p => p.user_id && p.user_id !== senderUserId)
    .map(p => p.user_id!);

  for (const userId of userIds) {
    try {
      await sendPushToUser(userId, title, notificationBody, {
        type: 'message',
        conversation_id: conversationId,
        load_id: conversation?.load_id ?? undefined,
      });
    } catch (error) {
      console.error(`Failed to send push to user ${userId}:`, error);
    }
  }

  // Send to drivers
  const driverIds = participants
    .filter(p => p.driver_id)
    .map(p => p.driver_id!);

  for (const driverId of driverIds) {
    try {
      await sendPushToDriver(driverId, title, notificationBody, {
        type: 'message',
        conversation_id: conversationId,
        load_id: conversation?.load_id ?? undefined,
      });
    } catch (error) {
      console.error(`Failed to send push to driver ${driverId}:`, error);
    }
  }
}

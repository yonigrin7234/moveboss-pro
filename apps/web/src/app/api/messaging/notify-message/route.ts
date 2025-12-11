import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendPushToDriver,
  sendPushToUser,
  getConversationNotificationTitle,
} from '@/lib/push-notifications';

/**
 * POST /api/messaging/notify-message
 * Internal endpoint to send push notifications when a message is inserted
 * This is called from database triggers or mobile app after direct DB inserts
 * Uses service role key for authentication
 */
export async function POST(request: Request) {
  // Verify service role key, internal secret, or valid session token
  const authHeader = request.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  // Accept either Bearer token with service key, X-Internal-Secret header, or valid session token
  const token = authHeader.replace('Bearer ', '');
  const secretHeader = request.headers.get('x-internal-secret');

  // Check if it's a service key or internal secret
  const isAuthorized = token === serviceKey || secretHeader === internalSecret;

  // If not service key/secret, verify it's a valid session token
  let isValidSession = false;
  if (!isAuthorized) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        const { data: { user } } = await supabase.auth.getUser(token);
        isValidSession = !!user;
      }
    } catch {
      // Invalid token
    }
  }

  if (!isAuthorized && !isValidSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversation_id, sender_user_id, sender_driver_id, message_preview } = body;

    if (!conversation_id || !message_preview) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get conversation info
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
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get sender info
    let senderName: string | null = null;
    if (sender_user_id) {
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', sender_user_id)
        .single();
      senderName = sender?.full_name || null;
    } else if (sender_driver_id) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('first_name, last_name')
        .eq('id', sender_driver_id)
        .single();
      if (driver) {
        senderName = `${driver.first_name} ${driver.last_name}`.trim() || null;
      }
    }

    // Get other participants who have notifications enabled
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, driver_id, notifications_enabled, is_muted')
      .eq('conversation_id', conversation_id)
      .eq('can_read', true)
      .eq('notifications_enabled', true)
      .eq('is_muted', false);

    if (!participants || participants.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    // Extract related data
    const load = Array.isArray(conversation?.loads) ? conversation.loads[0] : conversation?.loads;
    const trip = Array.isArray(conversation?.trips) ? conversation.trips[0] : conversation?.trips;
    const partnerCompany = Array.isArray(conversation?.partner_company)
      ? conversation.partner_company[0]
      : conversation?.partner_company;

    // Get driver name for driver_dispatch conversations from context
    const conversationContext = conversation?.context as { driver_name?: string } | null;
    const driverName = conversationContext?.driver_name;

    // Generate notification title
    const title = getConversationNotificationTitle({
      type: conversation?.type || 'general',
      title: conversation?.title,
      load_number: load?.load_number,
      trip_number: trip?.trip_number,
      partner_company_name: partnerCompany?.name,
      driver_name: driverName,
    });

    const preview = message_preview.length > 100 ? message_preview.slice(0, 100) + '...' : message_preview;
    const notificationBody = senderName ? `${senderName}: ${preview}` : preview;

    let notifiedCount = 0;

    // Send to users (excluding sender)
    const userIds = participants
      .filter(p => p.user_id && p.user_id !== sender_user_id)
      .map(p => p.user_id!);

    for (const userId of userIds) {
      try {
        await sendPushToUser(userId, title, notificationBody, {
          type: 'message',
          conversation_id: conversation_id,
          load_id: conversation?.load_id ?? undefined,
        });
        notifiedCount++;
      } catch (error) {
        console.error(`Failed to send push to user ${userId}:`, error);
      }
    }

    // Send to drivers (excluding sender)
    const driverIds = participants
      .filter(p => p.driver_id && p.driver_id !== sender_driver_id)
      .map(p => p.driver_id!);

    for (const driverId of driverIds) {
      try {
        await sendPushToDriver(driverId, title, notificationBody, {
          type: 'message',
          conversation_id: conversation_id,
          load_id: conversation?.load_id ?? undefined,
        });
        notifiedCount++;
      } catch (error) {
        console.error(`Failed to send push to driver ${driverId}:`, error);
      }
    }

    return NextResponse.json({ success: true, notified: notifiedCount });
  } catch (error) {
    console.error('Notify message API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

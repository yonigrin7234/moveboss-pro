/**
 * Push Notifications Library
 *
 * Sends push notifications to mobile devices using Expo Push API.
 * This module handles:
 * - Fetching push tokens from database
 * - Sending notifications via Expo Push API
 * - Logging sent notifications
 * - Chunking for batch sends
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification types matching mobile app
export type PushNotificationType =
  | 'trip_assigned'
  | 'load_assigned'
  | 'load_status_changed'
  | 'payment_received'
  | 'settlement_approved'
  | 'message'
  | 'general';

export interface PushNotificationData {
  type: PushNotificationType;
  tripId?: string;
  loadId?: string;
  message?: string;
  [key: string]: string | undefined;
}

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string; // Android notification channel
  priority?: 'default' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

// Create admin client for server-side operations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }

  return (data || []).map((row) => row.token);
}

/**
 * Get push tokens for a driver
 */
export async function getDriverPushTokens(driverId: string): Promise<string[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('driver_id', driverId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching driver push tokens:', error);
    return [];
  }

  return (data || []).map((row) => row.token);
}

/**
 * Get push tokens for multiple drivers
 */
export async function getMultipleDriverPushTokens(
  driverIds: string[]
): Promise<Map<string, string[]>> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('driver_id, token')
    .in('driver_id', driverIds)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching push tokens:', error);
    return new Map();
  }

  const tokenMap = new Map<string, string[]>();
  for (const row of data || []) {
    if (row.driver_id) {
      const tokens = tokenMap.get(row.driver_id) || [];
      tokens.push(row.token);
      tokenMap.set(row.driver_id, tokens);
    }
  }

  return tokenMap;
}

/**
 * Send push notifications via Expo Push API
 * Handles chunking for large batches (Expo limit is 100 per request)
 */
export async function sendPushNotifications(
  messages: PushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  const tickets: ExpoPushTicket[] = [];
  const CHUNK_SIZE = 100;

  // Process in chunks of 100
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();

      if (result.data) {
        tickets.push(...result.data);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // Add error tickets for this chunk
      tickets.push(
        ...chunk.map(() => ({
          status: 'error' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
        }))
      );
    }
  }

  return tickets;
}

/**
 * Send a push notification to a user
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: PushNotificationData,
  options?: {
    channelId?: string;
    sound?: 'default' | null;
    badge?: number;
  }
): Promise<{ success: boolean; ticketCount: number }> {
  const tokens = await getUserPushTokens(userId);

  if (tokens.length === 0) {
    return { success: true, ticketCount: 0 };
  }

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: options?.sound ?? 'default',
    channelId: options?.channelId,
    badge: options?.badge,
  }));

  const tickets = await sendPushNotifications(messages);

  // Log the notification
  await logNotification(userId, undefined, data?.type || 'general', title, body, data);

  const successCount = tickets.filter((t) => t.status === 'ok').length;
  return { success: successCount > 0, ticketCount: successCount };
}

/**
 * Send a push notification to a driver
 */
export async function sendPushToDriver(
  driverId: string,
  title: string,
  body: string,
  data?: PushNotificationData,
  options?: {
    channelId?: string;
    sound?: 'default' | null;
  }
): Promise<{ success: boolean; ticketCount: number }> {
  const tokens = await getDriverPushTokens(driverId);

  if (tokens.length === 0) {
    return { success: true, ticketCount: 0 };
  }

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: options?.sound ?? 'default',
    channelId: options?.channelId,
  }));

  const tickets = await sendPushNotifications(messages);

  // Log the notification
  await logNotification(undefined, driverId, data?.type || 'general', title, body, data);

  const successCount = tickets.filter((t) => t.status === 'ok').length;
  return { success: successCount > 0, ticketCount: successCount };
}

/**
 * Send push notifications to multiple drivers
 */
export async function sendPushToDrivers(
  driverIds: string[],
  title: string,
  body: string,
  data?: PushNotificationData,
  options?: {
    channelId?: string;
  }
): Promise<{ success: boolean; sentCount: number }> {
  const tokenMap = await getMultipleDriverPushTokens(driverIds);

  if (tokenMap.size === 0) {
    return { success: true, sentCount: 0 };
  }

  const messages: PushMessage[] = [];
  for (const [, tokens] of tokenMap) {
    for (const token of tokens) {
      messages.push({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        channelId: options?.channelId,
      });
    }
  }

  const tickets = await sendPushNotifications(messages);
  const successCount = tickets.filter((t) => t.status === 'ok').length;

  return { success: successCount > 0, sentCount: successCount };
}

/**
 * Log notification to database
 */
async function logNotification(
  userId: string | undefined,
  driverId: string | undefined,
  type: string,
  title: string,
  body: string,
  data?: PushNotificationData
): Promise<void> {
  try {
    const supabase = getAdminClient();

    await supabase.from('notification_log').insert({
      user_id: userId || null,
      driver_id: driverId || null,
      notification_type: type,
      title,
      body,
      data: data || {},
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Deactivate a push token (e.g., when device unregisters)
 */
export async function deactivatePushToken(token: string): Promise<void> {
  const supabase = getAdminClient();

  await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('token', token);
}

/**
 * Remove invalid tokens from failed push receipts
 */
export async function handlePushReceipts(
  tickets: ExpoPushTicket[]
): Promise<void> {
  // Expo returns receipts with error details for invalid tokens
  // Check receipts after some delay (15+ minutes) using ticket IDs
  // This is typically done via a background job

  for (const ticket of tickets) {
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      // Token is no longer valid - would need to track token<->ticket mapping
      console.log('Device not registered:', ticket.message);
    }
  }
}

// ============================================
// DRIVER NOTIFICATION HELPERS
// ============================================

/**
 * Notify driver of new trip assignment
 */
export async function notifyDriverTripAssigned(
  driverId: string,
  tripNumber: number,
  tripId: string,
  route: string,
  startDate: string
): Promise<void> {
  await sendPushToDriver(
    driverId,
    'New Trip Assigned',
    `Trip #${tripNumber}: ${route} on ${startDate}`,
    {
      type: 'trip_assigned',
      tripId,
    },
    { channelId: 'trips' }
  );
}

/**
 * Notify driver of load assignment
 */
export async function notifyDriverLoadAssigned(
  driverId: string,
  loadNumber: string,
  loadId: string,
  tripId: string,
  pickupLocation: string
): Promise<void> {
  await sendPushToDriver(
    driverId,
    'New Load Added',
    `${loadNumber} - Pickup: ${pickupLocation}`,
    {
      type: 'load_assigned',
      loadId,
      tripId,
    },
    { channelId: 'trips' }
  );
}

/**
 * Notify driver of load status change
 */
export async function notifyDriverLoadStatusChanged(
  driverId: string,
  loadNumber: string,
  loadId: string,
  tripId: string,
  newStatus: string,
  message?: string
): Promise<void> {
  await sendPushToDriver(
    driverId,
    `Load ${loadNumber} Updated`,
    message || `Status changed to ${newStatus}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId,
    },
    { channelId: 'trips' }
  );
}

/**
 * Notify driver of payment/settlement
 */
export async function notifyDriverPayment(
  driverId: string,
  tripNumber: number,
  amount: number,
  status: 'approved' | 'paid'
): Promise<void> {
  const title =
    status === 'approved' ? 'Settlement Approved' : 'Payment Received';
  const body =
    status === 'approved'
      ? `Trip #${tripNumber}: $${amount.toFixed(2)} approved for payment`
      : `Trip #${tripNumber}: $${amount.toFixed(2)} has been paid`;

  await sendPushToDriver(
    driverId,
    title,
    body,
    {
      type: status === 'approved' ? 'settlement_approved' : 'payment_received',
    },
    { channelId: 'payments' }
  );
}

/**
 * Send a general message to driver
 */
export async function notifyDriverMessage(
  driverId: string,
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  await sendPushToDriver(driverId, title, message, {
    type: 'message',
    ...data,
  });
}

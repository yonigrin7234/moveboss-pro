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
  | 'load_added'
  | 'load_removed'
  | 'delivery_order_changed'
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
      
      // Log any errors from Expo
      if (result.errors && result.errors.length > 0) {
        console.error('Expo Push API errors:', result.errors);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'push-notifications.ts:179',message:'Error sending push notifications',data:{error:error instanceof Error ? error.message : 'Unknown error',chunkSize:chunk.length},timestamp:Date.now(),sessionId:'debug-session',runId:'push-debug',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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

  const successCount = tickets.filter((t) => t.status === 'ok').length;
  const ticketIds = tickets.filter((t) => t.status === 'ok' && t.id).map((t) => t.id!);

  // Check receipts after a short delay to verify delivery and handle errors
  // Note: Receipts may not be immediately available, so this is best-effort
  if (ticketIds.length > 0) {
    setTimeout(async () => {
      const receipts = await checkPushReceipts(ticketIds);
      const deliveryErrors = receipts.filter((r) => r.status === 'error');
      
      if (deliveryErrors.length > 0) {
        // Check for DeviceNotRegistered errors which indicate invalid tokens
        for (const receipt of deliveryErrors) {
          if (receipt.details?.error === 'DeviceNotRegistered') {
            console.error('Push notification delivery failed - device not registered:', receipt.message);
          } else {
            console.error('Push notification delivery error:', receipt.details?.error || receipt.message);
          }
        }
      }
    }, 5000); // Check after 5 seconds
  }

  // Log the notification
  await logNotification(undefined, driverId, data?.type || 'general', title, body, data);

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
 * Check push notification receipts to verify delivery
 * Expo receipts are available after a short delay (usually within minutes)
 */
export async function checkPushReceipts(
  ticketIds: string[]
): Promise<ExpoPushReceipt[]> {
  if (ticketIds.length === 0) return [];

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
    });

    const result = await response.json();
    const receipts: ExpoPushReceipt[] = [];

    if (result.data) {
      for (const [ticketId, receipt] of Object.entries(result.data)) {
        receipts.push(receipt as ExpoPushReceipt);
      }
    }


    return receipts;
  } catch (error) {
    console.error('Error checking push notification receipts:', error);
    return [];
  }
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'push-notifications.ts:409',message:'notifyDriverTripAssigned called',data:{driverId,tripNumber,tripId,route,startDate},timestamp:Date.now(),sessionId:'debug-session',runId:'push-debug',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'push-notifications.ts:431',message:'notifyDriverLoadAssigned called',data:{driverId,loadNumber,loadId,tripId,pickupLocation},timestamp:Date.now(),sessionId:'debug-session',runId:'push-debug',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
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

/**
 * Notify driver when a load is ADDED to their trip
 * AGGRESSIVE: High priority notification
 */
export async function notifyDriverLoadAddedToTrip(
  driverId: string,
  loadNumber: string,
  loadId: string,
  tripId: string,
  tripNumber: number,
  deliveryOrder: number | null,
  pickupLocation: string,
  deliveryLocation: string
): Promise<void> {
  const orderText = deliveryOrder ? ` (Delivery #${deliveryOrder})` : '';
  await sendPushToDriver(
    driverId,
    '🚨 NEW LOAD ADDED',
    `Load ${loadNumber}${orderText} added to Trip #${tripNumber}: ${pickupLocation} → ${deliveryLocation}`,
    {
      type: 'load_added',
      loadId,
      tripId,
    },
    { channelId: 'trips', sound: 'default' }
  );
}

/**
 * Notify driver when a load is REMOVED from their trip
 * AGGRESSIVE: High priority notification
 */
export async function notifyDriverLoadRemovedFromTrip(
  driverId: string,
  loadNumber: string,
  tripId: string,
  tripNumber: number,
  reason?: string
): Promise<void> {
  const reasonText = reason ? ` - ${reason}` : '';
  await sendPushToDriver(
    driverId,
    '⚠️ LOAD REMOVED',
    `Load ${loadNumber} removed from Trip #${tripNumber}${reasonText}`,
    {
      type: 'load_removed',
      tripId,
    },
    { channelId: 'trips', sound: 'default' }
  );
}

/**
 * Notify driver when delivery order changes
 * AGGRESSIVE: High priority notification - affects which load they can deliver next
 */
export async function notifyDriverDeliveryOrderChanged(
  driverId: string,
  tripId: string,
  tripNumber: number,
  message?: string
): Promise<void> {
  await sendPushToDriver(
    driverId,
    '🔄 DELIVERY ORDER CHANGED',
    message || `Delivery order updated for Trip #${tripNumber}. Check your loads for new sequence.`,
    {
      type: 'delivery_order_changed',
      tripId,
    },
    { channelId: 'trips', sound: 'default' }
  );
}

/**
 * Notify driver of specific load delivery order change
 * AGGRESSIVE: Tells driver exactly what changed
 */
export async function notifyDriverLoadOrderChanged(
  driverId: string,
  loadNumber: string,
  loadId: string,
  tripId: string,
  tripNumber: number,
  oldOrder: number | null,
  newOrder: number | null
): Promise<void> {
  let message: string;
  if (oldOrder && newOrder) {
    message = `Load ${loadNumber} moved from delivery #${oldOrder} to #${newOrder} in Trip #${tripNumber}`;
  } else if (newOrder) {
    message = `Load ${loadNumber} is now delivery #${newOrder} in Trip #${tripNumber}`;
  } else {
    message = `Delivery order removed for load ${loadNumber} in Trip #${tripNumber}`;
  }

  await sendPushToDriver(
    driverId,
    '🔄 LOAD ORDER CHANGED',
    message,
    {
      type: 'delivery_order_changed',
      loadId,
      tripId,
    },
    { channelId: 'trips', sound: 'default' }
  );
}

// ============================================
// OWNER NOTIFICATION HELPERS
// ============================================

/**
 * Get trip owner and driver info for notifications
 */
async function getTripOwnerInfo(tripId: string): Promise<{
  ownerId: string | null;
  tripNumber: number | null;
  driverName: string | null;
}> {
  const supabase = getAdminClient();

  const { data: trip } = await supabase
    .from('trips')
    .select(`
      owner_id,
      trip_number,
      drivers:driver_id (first_name, last_name)
    `)
    .eq('id', tripId)
    .single();

  if (!trip) return { ownerId: null, tripNumber: null, driverName: null };

  // Supabase returns relations as arrays even with .single()
  const drivers = trip.drivers as unknown as { first_name: string; last_name: string }[] | null;
  const driver = Array.isArray(drivers) && drivers.length > 0 ? drivers[0] : null;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

  return {
    ownerId: trip.owner_id,
    tripNumber: trip.trip_number,
    driverName,
  };
}

/**
 * Get load owner and driver info for notifications
 */
async function getLoadOwnerInfo(loadId: string): Promise<{
  ownerId: string | null;
  loadNumber: string | null;
  driverName: string | null;
  tripId: string | null;
}> {
  const supabase = getAdminClient();

  const { data: load } = await supabase
    .from('loads')
    .select(`
      owner_id,
      load_number,
      trip_id,
      trips:trip_id (
        drivers:driver_id (first_name, last_name)
      )
    `)
    .eq('id', loadId)
    .single();

  if (!load) return { ownerId: null, loadNumber: null, driverName: null, tripId: null };

  // Supabase returns nested relations as arrays
  const trips = load.trips as unknown as { drivers: { first_name: string; last_name: string }[] | null }[] | null;
  const trip = Array.isArray(trips) && trips.length > 0 ? trips[0] : null;
  const drivers = trip?.drivers;
  const driver = Array.isArray(drivers) && drivers.length > 0 ? drivers[0] : null;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

  return {
    ownerId: load.owner_id,
    loadNumber: load.load_number,
    driverName,
    tripId: load.trip_id,
  };
}

/**
 * Notify owner when driver starts a trip
 */
export async function notifyOwnerTripStarted(
  tripId: string,
  odometerStart: number
): Promise<void> {
  const { ownerId, tripNumber, driverName } = await getTripOwnerInfo(tripId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '🚛 Trip Started',
    `${driverName} started Trip #${tripNumber} (Odometer: ${odometerStart.toLocaleString()})`,
    {
      type: 'general',
      tripId,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver completes a trip
 */
export async function notifyOwnerTripCompleted(
  tripId: string,
  odometerEnd?: number
): Promise<void> {
  const { ownerId, tripNumber, driverName } = await getTripOwnerInfo(tripId);

  if (!ownerId) return;

  const body = odometerEnd
    ? `${driverName} completed Trip #${tripNumber} (Odometer: ${odometerEnd.toLocaleString()})`
    : `${driverName} completed Trip #${tripNumber}`;

  await sendPushToUser(
    ownerId,
    '✅ Trip Completed',
    body,
    {
      type: 'general',
      tripId,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver captures odometer photo
 */
export async function notifyOwnerOdometerPhoto(
  tripId: string,
  type: 'start' | 'end',
  odometerValue: number
): Promise<void> {
  const { ownerId, tripNumber, driverName } = await getTripOwnerInfo(tripId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '📸 Odometer Photo Captured',
    `${driverName} captured ${type} odometer photo for Trip #${tripNumber} (${odometerValue.toLocaleString()} mi)`,
    {
      type: 'general',
      tripId,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver accepts a load
 */
export async function notifyOwnerLoadAccepted(loadId: string): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '👍 Load Accepted',
    `${driverName} accepted load ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver starts loading
 */
export async function notifyOwnerLoadingStarted(loadId: string): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '📦 Loading Started',
    `${driverName} started loading ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver finishes loading
 */
export async function notifyOwnerLoadingFinished(loadId: string): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '📦 Loading Complete',
    `${driverName} finished loading ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver starts delivery (in transit)
 */
export async function notifyOwnerDeliveryStarted(loadId: string): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '🚚 In Transit',
    `${driverName} is now in transit with ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver completes delivery
 */
export async function notifyOwnerDeliveryCompleted(loadId: string): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '✅ Delivered',
    `${driverName} completed delivery of ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver uploads load photo
 */
export async function notifyOwnerLoadPhoto(
  loadId: string,
  photoType: 'loading-start' | 'loading-end' | 'delivery' | 'document'
): Promise<void> {
  const { ownerId, loadNumber, driverName, tripId } = await getLoadOwnerInfo(loadId);

  if (!ownerId) return;

  const photoTypeLabels: Record<string, string> = {
    'loading-start': 'pickup start',
    'loading-end': 'pickup complete',
    'delivery': 'delivery',
    'document': 'document',
  };

  await sendPushToUser(
    ownerId,
    '📸 Photo Uploaded',
    `${driverName} uploaded ${photoTypeLabels[photoType] || photoType} photo for ${loadNumber}`,
    {
      type: 'load_status_changed',
      loadId,
      tripId: tripId || undefined,
    },
    { channelId: 'activity' }
  );
}

/**
 * Notify owner when driver adds expense/receipt
 */
export async function notifyOwnerExpenseAdded(
  tripId: string,
  expenseType: string,
  amount: number
): Promise<void> {
  const { ownerId, tripNumber, driverName } = await getTripOwnerInfo(tripId);

  if (!ownerId) return;

  await sendPushToUser(
    ownerId,
    '🧾 Expense Added',
    `${driverName} added ${expenseType} expense: $${amount.toFixed(2)} for Trip #${tripNumber}`,
    {
      type: 'general',
      tripId,
    },
    { channelId: 'activity' }
  );
}

// ============================================
// MARKETPLACE NOTIFICATION HELPERS
// ============================================

/**
 * Get carrier company name by ID
 */
async function getCarrierName(carrierId: string): Promise<string> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', carrierId)
    .single();

  return data?.name || 'Carrier';
}

/**
 * Get load info for marketplace notifications
 */
async function getLoadMarketplaceInfo(loadId: string): Promise<{
  ownerId: string | null;
  loadNumber: string | null;
  companyId: string | null;
  origin: string | null;
  destination: string | null;
}> {
  const supabase = getAdminClient();

  const { data: load } = await supabase
    .from('loads')
    .select(`
      owner_id,
      load_number,
      company_id,
      pickup_city,
      pickup_state,
      delivery_city,
      delivery_state
    `)
    .eq('id', loadId)
    .single();

  if (!load) {
    return { ownerId: null, loadNumber: null, companyId: null, origin: null, destination: null };
  }

  const origin = load.pickup_city && load.pickup_state
    ? `${load.pickup_city}, ${load.pickup_state}`
    : null;
  const destination = load.delivery_city && load.delivery_state
    ? `${load.delivery_city}, ${load.delivery_state}`
    : null;

  return {
    ownerId: load.owner_id,
    loadNumber: load.load_number,
    companyId: load.company_id,
    origin,
    destination,
  };
}

/**
 * Notify owner when a carrier releases a load back to marketplace
 */
export async function notifyOwnerLoadReleased(
  loadId: string,
  carrierId: string,
  reason?: string
): Promise<void> {
  const [loadInfo, carrierName] = await Promise.all([
    getLoadMarketplaceInfo(loadId),
    getCarrierName(carrierId),
  ]);

  if (!loadInfo.ownerId) return;

  const route = loadInfo.origin && loadInfo.destination
    ? ` (${loadInfo.origin} → ${loadInfo.destination})`
    : '';

  const body = reason
    ? `${carrierName} released load ${loadInfo.loadNumber}${route} back to marketplace. Reason: ${reason}`
    : `${carrierName} released load ${loadInfo.loadNumber}${route} back to marketplace`;

  await sendPushToUser(
    loadInfo.ownerId,
    '🔄 Load Released',
    body,
    {
      type: 'load_status_changed',
      loadId,
    },
    { channelId: 'marketplace' }
  );
}

/**
 * Notify carrier when a load they were assigned to is cancelled
 */
export async function notifyCarrierLoadCancelled(
  loadId: string,
  carrierId: string,
  reason?: string
): Promise<void> {
  const loadInfo = await getLoadMarketplaceInfo(loadId);

  // Get carrier owner's user ID for push notification
  const supabase = getAdminClient();
  const { data: carrier } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', carrierId)
    .single();

  if (!carrier?.owner_id) return;

  const route = loadInfo.origin && loadInfo.destination
    ? ` (${loadInfo.origin} → ${loadInfo.destination})`
    : '';

  const body = reason
    ? `Load ${loadInfo.loadNumber}${route} has been cancelled. Reason: ${reason}`
    : `Load ${loadInfo.loadNumber}${route} has been cancelled by the shipper`;

  await sendPushToUser(
    carrier.owner_id,
    '❌ Load Cancelled',
    body,
    {
      type: 'load_status_changed',
      loadId,
    },
    { channelId: 'marketplace' }
  );
}

/**
 * Notify owner when a carrier requests their load
 */
export async function notifyOwnerNewLoadRequest(
  loadId: string,
  carrierId: string,
  requestType: 'accept_listed' | 'counter_offer',
  offeredRate?: number
): Promise<void> {
  const [loadInfo, carrierName] = await Promise.all([
    getLoadMarketplaceInfo(loadId),
    getCarrierName(carrierId),
  ]);

  if (!loadInfo.ownerId) return;

  let body: string;
  if (requestType === 'counter_offer' && offeredRate) {
    body = `${carrierName} made a counter offer of $${offeredRate.toFixed(2)} on load ${loadInfo.loadNumber}`;
  } else {
    body = `${carrierName} requested load ${loadInfo.loadNumber}`;
  }

  await sendPushToUser(
    loadInfo.ownerId,
    '📬 New Load Request',
    body,
    {
      type: 'general',
      loadId,
    },
    { channelId: 'marketplace' }
  );
}

/**
 * Notify carrier when their load request is accepted
 */
export async function notifyCarrierRequestAccepted(
  loadId: string,
  carrierId: string,
  finalRate?: number
): Promise<void> {
  const loadInfo = await getLoadMarketplaceInfo(loadId);

  // Get carrier owner's user ID
  const supabase = getAdminClient();
  const { data: carrier } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', carrierId)
    .single();

  if (!carrier?.owner_id) return;

  const route = loadInfo.origin && loadInfo.destination
    ? ` (${loadInfo.origin} → ${loadInfo.destination})`
    : '';

  const body = finalRate
    ? `Your request for load ${loadInfo.loadNumber}${route} was accepted at $${finalRate.toFixed(2)}`
    : `Your request for load ${loadInfo.loadNumber}${route} was accepted`;

  await sendPushToUser(
    carrier.owner_id,
    '✅ Request Accepted',
    body,
    {
      type: 'load_assigned',
      loadId,
    },
    { channelId: 'marketplace' }
  );
}

/**
 * Notify carrier when their load request is declined
 */
export async function notifyCarrierRequestDeclined(
  loadId: string,
  carrierId: string,
  message?: string
): Promise<void> {
  const loadInfo = await getLoadMarketplaceInfo(loadId);

  // Get carrier owner's user ID
  const supabase = getAdminClient();
  const { data: carrier } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', carrierId)
    .single();

  if (!carrier?.owner_id) return;

  const body = message
    ? `Your request for load ${loadInfo.loadNumber} was declined: ${message}`
    : `Your request for load ${loadInfo.loadNumber} was declined`;

  await sendPushToUser(
    carrier.owner_id,
    '❌ Request Declined',
    body,
    {
      type: 'general',
      loadId,
    },
    { channelId: 'marketplace' }
  );
}

// ============================================
// MESSAGE NOTIFICATION HELPERS
// ============================================

/**
 * Conversation context for notification title generation
 */
export interface ConversationNotificationContext {
  type: string;
  title?: string | null;
  load_number?: string | null;
  trip_number?: string | number | null;
  partner_company_name?: string | null;
  driver_name?: string | null;
}

/**
 * Generate a human-readable notification title for a conversation
 * Used for push notifications when a new message is sent
 */
export function getConversationNotificationTitle(
  context: ConversationNotificationContext
): string {
  // If conversation has an explicit title, use it
  if (context.title) {
    return context.title;
  }

  switch (context.type) {
    case 'load_internal':
      return context.load_number
        ? `Load ${context.load_number} - Team`
        : 'Team Discussion';

    case 'load_shared':
      if (context.load_number && context.partner_company_name) {
        return `Load ${context.load_number} - ${context.partner_company_name}`;
      }
      return context.load_number
        ? `Load ${context.load_number}`
        : 'Shared Load Chat';

    case 'trip_internal':
      return context.trip_number
        ? `Trip #${context.trip_number}`
        : 'Trip Discussion';

    case 'company_to_company':
      return context.partner_company_name || 'Partner Chat';

    case 'driver_dispatch':
      return context.driver_name
        ? `Dispatch - ${context.driver_name}`
        : 'Dispatch Message';

    case 'general':
    default:
      return 'New Message';
  }
}

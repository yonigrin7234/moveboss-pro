import { createClient } from '@/lib/supabase-server';

export interface Notification {
  id: string;
  user_id: string;
  company_id: string | null;
  type: string;
  title: string;
  message: string | null;
  load_id: string | null;
  request_id: string | null;
  partnership_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// Get notifications for a user
export async function getUserNotifications(
  userId: string,
  limit: number = 20
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

// Get unread count for a user
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting notifications:', error);
    return 0;
  }

  return count || 0;
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

// Mark all notifications as read for a user
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// Create a notification
export async function createNotification(data: {
  user_id: string;
  company_id?: string;
  type: string;
  title: string;
  message?: string;
  load_id?: string;
  request_id?: string;
  partnership_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: data.user_id,
    company_id: data.company_id || null,
    type: data.type,
    title: data.title,
    message: data.message || null,
    load_id: data.load_id || null,
    request_id: data.request_id || null,
    partnership_id: data.partnership_id || null,
    is_read: false,
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// NOTIFICATION CREATORS FOR SPECIFIC EVENTS
// ============================================

// When carrier requests a load
export async function notifyLoadRequested(
  companyOwnerId: string,
  companyId: string,
  loadId: string,
  requestId: string,
  carrierName: string,
  loadNumber: string,
  route: string
): Promise<void> {
  await createNotification({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'load_request_received',
    title: `${carrierName} wants your load`,
    message: `${loadNumber}: ${route}`,
    load_id: loadId,
    request_id: requestId,
  });
}

// When company accepts carrier's request
export async function notifyRequestAccepted(
  carrierOwnerId: string,
  carrierId: string,
  loadId: string,
  requestId: string,
  companyName: string,
  loadNumber: string,
  route: string
): Promise<void> {
  await createNotification({
    user_id: carrierOwnerId,
    company_id: carrierId,
    type: 'request_accepted',
    title: `Request accepted by ${companyName}`,
    message: `${loadNumber}: ${route} - Confirm load details to proceed`,
    load_id: loadId,
    request_id: requestId,
  });
}

// When company declines carrier's request
export async function notifyRequestDeclined(
  carrierOwnerId: string,
  carrierId: string,
  loadId: string,
  requestId: string,
  companyName: string,
  loadNumber: string
): Promise<void> {
  await createNotification({
    user_id: carrierOwnerId,
    company_id: carrierId,
    type: 'request_declined',
    title: `Request declined by ${companyName}`,
    message: `${loadNumber} - You can request other loads`,
    load_id: loadId,
    request_id: requestId,
  });
}

// When carrier confirms load
export async function notifyLoadConfirmed(
  companyOwnerId: string,
  companyId: string,
  loadId: string,
  carrierName: string,
  loadNumber: string,
  expectedDate: string,
  driverName?: string
): Promise<void> {
  const driverInfo = driverName ? `Driver: ${driverName}` : 'Driver TBD';

  await createNotification({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'load_confirmed',
    title: `${carrierName} confirmed ${loadNumber}`,
    message: `Expected: ${expectedDate}. ${driverInfo}`,
    load_id: loadId,
  });
}

// When carrier assigns driver
export async function notifyDriverAssigned(
  companyOwnerId: string,
  companyId: string,
  loadId: string,
  carrierName: string,
  loadNumber: string,
  driverName: string,
  driverPhone: string
): Promise<void> {
  await createNotification({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'driver_assigned',
    title: `Driver assigned to ${loadNumber}`,
    message: `${driverName} - ${driverPhone}`,
    load_id: loadId,
  });
}

// When carrier withdraws request
export async function notifyRequestWithdrawn(
  companyOwnerId: string,
  companyId: string,
  loadId: string,
  carrierName: string,
  loadNumber: string
): Promise<void> {
  await createNotification({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'request_withdrawn',
    title: `${carrierName} withdrew request`,
    message: `${loadNumber} - Request canceled by carrier`,
    load_id: loadId,
  });
}

// When carrier gives load back
export async function notifyLoadGivenBack(
  companyOwnerId: string,
  companyId: string,
  loadId: string,
  carrierName: string,
  loadNumber: string,
  reason: string
): Promise<void> {
  await createNotification({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'load_given_back',
    title: `${carrierName} returned ${loadNumber}`,
    message: `Reason: ${reason}. Load is back on marketplace.`,
    load_id: loadId,
  });
}

// When company cancels carrier
export async function notifyCarrierCanceled(
  carrierOwnerId: string,
  carrierId: string,
  loadId: string,
  companyName: string,
  loadNumber: string,
  reason: string
): Promise<void> {
  await createNotification({
    user_id: carrierOwnerId,
    company_id: carrierId,
    type: 'carrier_canceled',
    title: `${companyName} canceled your assignment`,
    message: `${loadNumber} - Reason: ${reason}`,
    load_id: loadId,
  });
}

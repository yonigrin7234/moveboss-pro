import { createClient } from '@/lib/supabase-server';
import { shouldSendNotification, NotificationType } from './notification-policies';

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

/**
 * Create a notification with policy checks
 * Checks workspace policies and user overrides before sending
 */
export async function createNotificationWithPolicy(data: {
  user_id: string;
  company_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  load_id?: string;
  request_id?: string;
  partnership_id?: string;
  user_role?: string;
}): Promise<{
  success: boolean;
  error?: string;
  channels: { inApp: boolean; push: boolean; email: boolean };
}> {
  // Check policy to determine which channels should be used
  const { shouldSend, channels } = await shouldSendNotification(
    data.user_id,
    data.company_id,
    data.type,
    data.user_role
  );

  // If no channels are enabled for this user/notification type, skip
  if (!shouldSend) {
    return {
      success: true, // Not an error, just filtered by policy
      channels: { inApp: false, push: false, email: false },
    };
  }

  // Create in-app notification if enabled
  if (channels.inApp) {
    const result = await createNotification({
      user_id: data.user_id,
      company_id: data.company_id,
      type: data.type,
      title: data.title,
      message: data.message,
      load_id: data.load_id,
      request_id: data.request_id,
      partnership_id: data.partnership_id,
    });

    if (!result.success) {
      return { ...result, channels };
    }
  }

  // TODO: Future - send push notification if channels.push is true
  // TODO: Future - send email notification if channels.email is true

  return { success: true, channels };
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
  route: string,
  userRole?: string
): Promise<void> {
  await createNotificationWithPolicy({
    user_id: companyOwnerId,
    company_id: companyId,
    type: 'load_request_received',
    title: `${carrierName} wants your load`,
    message: `${loadNumber}: ${route}`,
    load_id: loadId,
    request_id: requestId,
    user_role: userRole,
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
  route: string,
  userRole?: string
): Promise<void> {
  await createNotificationWithPolicy({
    user_id: carrierOwnerId,
    company_id: carrierId,
    type: 'load_request_accepted',
    title: `Request accepted by ${companyName}`,
    message: `${loadNumber}: ${route} - Confirm load details to proceed`,
    load_id: loadId,
    request_id: requestId,
    user_role: userRole,
  });
}

// When company declines carrier's request
export async function notifyRequestDeclined(
  carrierOwnerId: string,
  carrierId: string,
  loadId: string,
  requestId: string,
  companyName: string,
  loadNumber: string,
  userRole?: string
): Promise<void> {
  await createNotificationWithPolicy({
    user_id: carrierOwnerId,
    company_id: carrierId,
    type: 'load_request_declined',
    title: `Request declined by ${companyName}`,
    message: `${loadNumber} - You can request other loads`,
    load_id: loadId,
    request_id: requestId,
    user_role: userRole,
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

// ============================================
// COMPANY-SPECIFIC NOTIFICATION FUNCTIONS
// ============================================

// Get notifications for a company (company portal context)
export async function getCompanyNotifications(
  companyId: string,
  limit: number = 20
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching company notifications:', error);
    return [];
  }

  return data || [];
}

// Get unread count for a company
export async function getUnreadCompanyNotificationCount(companyId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_read', false);

  if (error) {
    console.error('Error counting company notifications:', error);
    return 0;
  }

  return count || 0;
}

// Mark all company notifications as read
export async function markAllCompanyNotificationsRead(companyId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)
    .eq('is_read', false);
}

// Notify partner carriers when load is posted
export async function notifyPartnersOfNewLoad(
  companyId: string,
  companyName: string,
  loadId: string,
  loadNumber: string,
  route: string,
  cuft: number,
  rate: number | null
): Promise<void> {
  const supabase = await createClient();

  // Get all active carrier partners
  const { data: partnerships } = await supabase
    .from('company_partnerships')
    .select(`
      id,
      company_a_id,
      company_b_id,
      company_a:companies!company_partnerships_company_a_id_fkey(id, owner_id, name),
      company_b:companies!company_partnerships_company_b_id_fkey(id, owner_id, name)
    `)
    .or(`company_a_id.eq.${companyId},company_b_id.eq.${companyId}`)
    .eq('status', 'active');

  if (!partnerships || partnerships.length === 0) return;

  // Create notification for each partner
  for (const partnership of partnerships) {
    // Determine which company is the partner (not us)
    const isCompanyA = partnership.company_a_id === companyId;
    const partnerCompanyRaw = isCompanyA ? partnership.company_b : partnership.company_a;
    const partnerCompany = Array.isArray(partnerCompanyRaw) ? partnerCompanyRaw[0] : partnerCompanyRaw;

    if (!partnerCompany) continue;

    const rateText = rate ? `$${rate}/cf` : 'Make an offer';

    await createNotification({
      user_id: partnerCompany.owner_id,
      company_id: partnerCompany.id,
      type: 'partner_load_posted',
      title: `${companyName} posted a load`,
      message: `${route} • ${cuft} CUFT • ${rateText}`,
      load_id: loadId,
    });
  }
}

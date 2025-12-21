import { createClient } from '@/lib/supabase-server';

/**
 * Notification types that can be configured
 */
export type NotificationType =
  | 'load_request_received'
  | 'load_request_accepted'
  | 'load_request_declined'
  | 'rfd_critical'
  | 'rfd_urgent'
  | 'rfd_approaching'
  | 'compliance_expired'
  | 'compliance_expiring_soon'
  | 'driver_status_change'
  | 'trip_completed'
  | 'settlement_ready'
  | 'message_received';

/**
 * Human-readable labels for notification types
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  load_request_received: 'Load Request Received',
  load_request_accepted: 'Load Request Accepted',
  load_request_declined: 'Load Request Declined',
  rfd_critical: 'Critical RFD (Today/Overdue)',
  rfd_urgent: 'Urgent RFD (48 hours)',
  rfd_approaching: 'Approaching RFD (7 days)',
  compliance_expired: 'Compliance Expired',
  compliance_expiring_soon: 'Compliance Expiring Soon',
  driver_status_change: 'Driver Status Change',
  trip_completed: 'Trip Completed',
  settlement_ready: 'Settlement Ready',
  message_received: 'New Message',
};

/**
 * Categories for grouping notification types in UI
 */
export const NOTIFICATION_CATEGORIES = {
  marketplace: ['load_request_received', 'load_request_accepted', 'load_request_declined'] as NotificationType[],
  rfd: ['rfd_critical', 'rfd_urgent', 'rfd_approaching'] as NotificationType[],
  compliance: ['compliance_expired', 'compliance_expiring_soon'] as NotificationType[],
  operations: ['driver_status_change', 'trip_completed', 'settlement_ready'] as NotificationType[],
  communication: ['message_received'] as NotificationType[],
};

/**
 * Workspace notification policy
 */
export interface WorkspaceNotificationPolicy {
  id: string;
  company_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  is_mandatory: boolean;
  roles_enabled: string[];
  created_at: string;
  updated_at: string;
}

/**
 * User notification override
 */
export interface UserNotificationOverride {
  id: string;
  user_id: string;
  company_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean | null;
  push_enabled: boolean | null;
  email_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Effective notification settings (after applying overrides)
 */
export interface EffectiveNotificationSettings {
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  is_mandatory: boolean;
}

/**
 * Get all notification policies for a company
 */
export async function getWorkspacePolicies(companyId: string): Promise<WorkspaceNotificationPolicy[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspace_notification_policies')
    .select('*')
    .eq('company_id', companyId)
    .order('notification_type');

  if (error) {
    console.error('Error fetching workspace policies:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific notification policy
 */
export async function getWorkspacePolicy(
  companyId: string,
  notificationType: NotificationType
): Promise<WorkspaceNotificationPolicy | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workspace_notification_policies')
    .select('*')
    .eq('company_id', companyId)
    .eq('notification_type', notificationType)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching workspace policy:', error);
    return null;
  }

  return data || null;
}

/**
 * Create or update a workspace notification policy
 */
export async function upsertWorkspacePolicy(
  companyId: string,
  notificationType: NotificationType,
  settings: {
    in_app_enabled?: boolean;
    push_enabled?: boolean;
    email_enabled?: boolean;
    sms_enabled?: boolean;
    is_mandatory?: boolean;
    roles_enabled?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('workspace_notification_policies')
    .upsert(
      {
        company_id: companyId,
        notification_type: notificationType,
        in_app_enabled: settings.in_app_enabled ?? true,
        push_enabled: settings.push_enabled ?? true,
        email_enabled: settings.email_enabled ?? true,
        sms_enabled: settings.sms_enabled ?? false,
        is_mandatory: settings.is_mandatory ?? false,
        roles_enabled: settings.roles_enabled ?? ['owner', 'admin', 'dispatcher'],
      },
      { onConflict: 'company_id,notification_type' }
    );

  if (error) {
    console.error('Error upserting workspace policy:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a workspace notification policy
 */
export async function deleteWorkspacePolicy(
  companyId: string,
  notificationType: NotificationType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('workspace_notification_policies')
    .delete()
    .eq('company_id', companyId)
    .eq('notification_type', notificationType);

  if (error) {
    console.error('Error deleting workspace policy:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all notification overrides for a user
 */
export async function getUserOverrides(
  userId: string,
  companyId: string
): Promise<UserNotificationOverride[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_notification_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .order('notification_type');

  if (error) {
    console.error('Error fetching user overrides:', error);
    return [];
  }

  return data || [];
}

/**
 * Create or update a user notification override
 */
export async function upsertUserOverride(
  userId: string,
  companyId: string,
  notificationType: NotificationType,
  settings: {
    in_app_enabled?: boolean | null;
    push_enabled?: boolean | null;
    email_enabled?: boolean | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First check if the policy is mandatory
  const policy = await getWorkspacePolicy(companyId, notificationType);
  if (policy?.is_mandatory) {
    return { success: false, error: 'Cannot override mandatory notification settings' };
  }

  const { error } = await supabase
    .from('user_notification_overrides')
    .upsert(
      {
        user_id: userId,
        company_id: companyId,
        notification_type: notificationType,
        in_app_enabled: settings.in_app_enabled,
        push_enabled: settings.push_enabled,
        email_enabled: settings.email_enabled,
      },
      { onConflict: 'user_id,company_id,notification_type' }
    );

  if (error) {
    console.error('Error upserting user override:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a user notification override
 */
export async function deleteUserOverride(
  userId: string,
  companyId: string,
  notificationType: NotificationType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_notification_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('notification_type', notificationType);

  if (error) {
    console.error('Error deleting user override:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get effective notification settings for a user (considering policy + overrides)
 */
export async function getEffectiveSettings(
  userId: string,
  companyId: string,
  notificationType: NotificationType
): Promise<EffectiveNotificationSettings> {
  const supabase = await createClient();

  // Use the database function for consistency
  const { data, error } = await supabase.rpc('get_effective_notification_settings', {
    p_user_id: userId,
    p_company_id: companyId,
    p_notification_type: notificationType,
  });

  if (error || !data || data.length === 0) {
    // Default: all enabled, not mandatory
    return {
      in_app_enabled: true,
      push_enabled: true,
      email_enabled: true,
      is_mandatory: false,
    };
  }

  return data[0];
}

/**
 * Check if a notification should be sent to a user
 * Returns the channels that should be used
 */
export async function shouldSendNotification(
  userId: string,
  companyId: string,
  notificationType: NotificationType,
  userRole?: string
): Promise<{
  shouldSend: boolean;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
}> {
  // Get workspace policy
  const policy = await getWorkspacePolicy(companyId, notificationType);

  // If no policy exists, send on all channels (backward compatible)
  if (!policy) {
    return {
      shouldSend: true,
      channels: { inApp: true, push: true, email: true },
    };
  }

  // Check if user's role is in the enabled roles
  if (userRole && !policy.roles_enabled.includes(userRole)) {
    return {
      shouldSend: false,
      channels: { inApp: false, push: false, email: false },
    };
  }

  // Get effective settings (policy + user override)
  const settings = await getEffectiveSettings(userId, companyId, notificationType);

  const shouldSend = settings.in_app_enabled || settings.push_enabled || settings.email_enabled;

  return {
    shouldSend,
    channels: {
      inApp: settings.in_app_enabled,
      push: settings.push_enabled,
      email: settings.email_enabled,
    },
  };
}

/**
 * Bulk get effective settings for all notification types
 */
export async function getAllEffectiveSettings(
  userId: string,
  companyId: string
): Promise<Map<NotificationType, EffectiveNotificationSettings>> {
  const policies = await getWorkspacePolicies(companyId);
  const overrides = await getUserOverrides(userId, companyId);

  const overrideMap = new Map(
    overrides.map((o) => [o.notification_type, o])
  );

  const result = new Map<NotificationType, EffectiveNotificationSettings>();

  // Process each notification type
  const allTypes = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

  for (const notificationType of allTypes) {
    const policy = policies.find((p) => p.notification_type === notificationType);
    const override = overrideMap.get(notificationType);

    if (!policy) {
      // No policy = all enabled
      result.set(notificationType, {
        in_app_enabled: true,
        push_enabled: true,
        email_enabled: true,
        is_mandatory: false,
      });
      continue;
    }

    if (policy.is_mandatory || !override) {
      // Mandatory or no override = use policy
      result.set(notificationType, {
        in_app_enabled: policy.in_app_enabled,
        push_enabled: policy.push_enabled,
        email_enabled: policy.email_enabled,
        is_mandatory: policy.is_mandatory,
      });
      continue;
    }

    // Apply override
    result.set(notificationType, {
      in_app_enabled: override.in_app_enabled ?? policy.in_app_enabled,
      push_enabled: override.push_enabled ?? policy.push_enabled,
      email_enabled: override.email_enabled ?? policy.email_enabled,
      is_mandatory: policy.is_mandatory,
    });
  }

  return result;
}

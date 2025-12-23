/**
 * useNotificationSettings Hook
 * Fetches and manages notification preferences for mobile users
 * Works with workspace policies and user overrides
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

// Notification types matching the database enum
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

// Human-readable labels for notification types
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

// Categories for grouping notification types in UI
export const NOTIFICATION_CATEGORIES: Record<string, { label: string; types: NotificationType[] }> = {
  marketplace: {
    label: 'Marketplace',
    types: ['load_request_received', 'load_request_accepted', 'load_request_declined'],
  },
  rfd: {
    label: 'RFD Tracking',
    types: ['rfd_critical', 'rfd_urgent', 'rfd_approaching'],
  },
  compliance: {
    label: 'Compliance',
    types: ['compliance_expired', 'compliance_expiring_soon'],
  },
  operations: {
    label: 'Operations',
    types: ['driver_status_change', 'trip_completed', 'settlement_ready'],
  },
  communication: {
    label: 'Communication',
    types: ['message_received'],
  },
};

// All notification types
export const ALL_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

// Effective settings for a notification type
export interface EffectiveNotificationSettings {
  notificationType: NotificationType;
  label: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  isMandatory: boolean;
}

// Workspace policy (company-level settings)
interface WorkspacePolicy {
  notification_type: NotificationType;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  is_mandatory: boolean;
  roles_enabled: string[];
}

// User override
interface UserOverride {
  notification_type: NotificationType;
  in_app_enabled: boolean | null;
  push_enabled: boolean | null;
  email_enabled: boolean | null;
}

interface UseNotificationSettingsReturn {
  settings: EffectiveNotificationSettings[];
  isLoading: boolean;
  error: string | null;
  companyId: string | null;
  refresh: () => Promise<void>;
  updateSetting: (
    notificationType: NotificationType,
    channel: 'push' | 'inApp' | 'email',
    enabled: boolean
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EffectiveNotificationSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First get user's company
      const { data: membership, error: membershipError } = await supabase
        .from('company_memberships')
        .select('company_id, role')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        // User has no company membership - use defaults
        const defaultSettings: EffectiveNotificationSettings[] = ALL_NOTIFICATION_TYPES.map((type) => ({
          notificationType: type,
          label: NOTIFICATION_TYPE_LABELS[type],
          inAppEnabled: true,
          pushEnabled: true,
          emailEnabled: true,
          isMandatory: false,
        }));
        setSettings(defaultSettings);
        setIsLoading(false);
        return;
      }

      setCompanyId(membership.company_id);

      // Fetch workspace policies
      const { data: policies, error: policiesError } = await supabase
        .from('workspace_notification_policies')
        .select('*')
        .eq('company_id', membership.company_id);

      if (policiesError) {
        throw policiesError;
      }

      // Fetch user overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('user_notification_overrides')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', membership.company_id);

      if (overridesError) {
        throw overridesError;
      }

      // Create lookup maps
      const policyMap = new Map<NotificationType, WorkspacePolicy>(
        (policies || []).map((p) => [p.notification_type as NotificationType, p as WorkspacePolicy])
      );
      const overrideMap = new Map<NotificationType, UserOverride>(
        (overrides || []).map((o) => [o.notification_type as NotificationType, o as UserOverride])
      );

      // Calculate effective settings for each notification type
      const effectiveSettings: EffectiveNotificationSettings[] = ALL_NOTIFICATION_TYPES.map((type) => {
        const policy = policyMap.get(type);
        const override = overrideMap.get(type);

        // Default values if no policy exists
        if (!policy) {
          return {
            notificationType: type,
            label: NOTIFICATION_TYPE_LABELS[type],
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: true,
            isMandatory: false,
          };
        }

        // If mandatory or no override, use policy values
        if (policy.is_mandatory || !override) {
          return {
            notificationType: type,
            label: NOTIFICATION_TYPE_LABELS[type],
            inAppEnabled: policy.in_app_enabled,
            pushEnabled: policy.push_enabled,
            emailEnabled: policy.email_enabled,
            isMandatory: policy.is_mandatory,
          };
        }

        // Apply overrides (null means use policy default)
        return {
          notificationType: type,
          label: NOTIFICATION_TYPE_LABELS[type],
          inAppEnabled: override.in_app_enabled ?? policy.in_app_enabled,
          pushEnabled: override.push_enabled ?? policy.push_enabled,
          emailEnabled: override.email_enabled ?? policy.email_enabled,
          isMandatory: policy.is_mandatory,
        };
      });

      setSettings(effectiveSettings);
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(
    async (
      notificationType: NotificationType,
      channel: 'push' | 'inApp' | 'email',
      enabled: boolean
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id || !companyId) {
        return { success: false, error: 'Not authenticated or no company' };
      }

      // Check if setting is mandatory
      const currentSetting = settings.find((s) => s.notificationType === notificationType);
      if (currentSetting?.isMandatory) {
        return { success: false, error: 'Cannot modify mandatory notification settings' };
      }

      try {
        // Map channel to database column
        const columnMap = {
          push: 'push_enabled',
          inApp: 'in_app_enabled',
          email: 'email_enabled',
        };

        // Upsert the override
        const { error: upsertError } = await supabase
          .from('user_notification_overrides')
          .upsert(
            {
              user_id: user.id,
              company_id: companyId,
              notification_type: notificationType,
              [columnMap[channel]]: enabled,
            },
            {
              onConflict: 'user_id,company_id,notification_type',
            }
          );

        if (upsertError) {
          throw upsertError;
        }

        // Update local state optimistically
        setSettings((prev) =>
          prev.map((s) => {
            if (s.notificationType === notificationType) {
              return {
                ...s,
                ...(channel === 'push' && { pushEnabled: enabled }),
                ...(channel === 'inApp' && { inAppEnabled: enabled }),
                ...(channel === 'email' && { emailEnabled: enabled }),
              };
            }
            return s;
          })
        );

        return { success: true };
      } catch (err) {
        console.error('Error updating notification setting:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update setting',
        };
      }
    },
    [user?.id, companyId, settings]
  );

  return {
    settings,
    isLoading,
    error,
    companyId,
    refresh: fetchSettings,
    updateSetting,
  };
}

/**
 * Get settings grouped by category
 */
export function groupSettingsByCategory(
  settings: EffectiveNotificationSettings[]
): { category: string; label: string; settings: EffectiveNotificationSettings[] }[] {
  return Object.entries(NOTIFICATION_CATEGORIES).map(([key, { label, types }]) => ({
    category: key,
    label,
    settings: settings.filter((s) => types.includes(s.notificationType)),
  }));
}

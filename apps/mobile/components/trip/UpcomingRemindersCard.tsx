/**
 * UpcomingRemindersCard Component
 *
 * Displays scheduled reminders for a trip.
 * Shows countdown to next reminder and allows managing reminders.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { Icon } from '../ui';

interface Reminder {
  type: string;
  scheduledFor: string;
  loadId?: string;
}

interface UpcomingRemindersCardProps {
  tripId: string;
  tripNumber: number;
  reminders: Reminder[];
  onCancelReminder?: (type: string, loadId?: string) => void;
}

// Get friendly name for reminder type
function getReminderLabel(type: string): string {
  switch (type) {
    case 'trip_start_day_before':
      return 'Trip starts tomorrow';
    case 'trip_start_morning':
      return 'Trip starts today';
    case 'pickup_reminder':
      return 'Pickup reminder';
    case 'delivery_reminder':
      return 'Delivery reminder';
    case 'rfd_window_reminder':
      return 'Delivery window ending';
    default:
      return 'Reminder';
  }
}

// Get icon for reminder type
function getReminderIcon(type: string): 'calendar' | 'truck' | 'package' | 'clock' {
  switch (type) {
    case 'trip_start_day_before':
    case 'trip_start_morning':
      return 'calendar';
    case 'pickup_reminder':
      return 'truck';
    case 'delivery_reminder':
    case 'rfd_window_reminder':
      return 'package';
    default:
      return 'clock';
  }
}

// Format time until reminder
function formatTimeUntil(scheduledFor: string): string {
  const now = Date.now();
  const scheduled = new Date(scheduledFor).getTime();
  const diff = scheduled - now;

  if (diff < 0) return 'Past';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }

  return `in ${minutes}m`;
}

// Format date/time for reminder
function formatReminderTime(scheduledFor: string): string {
  const date = new Date(scheduledFor);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UpcomingRemindersCard({
  tripId,
  tripNumber,
  reminders,
  onCancelReminder,
}: UpcomingRemindersCardProps) {
  const [, setTick] = useState(0);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelReminder = useCallback(
    (type: string, loadId?: string) => {
      Alert.alert(
        'Cancel Reminder',
        'Are you sure you want to cancel this reminder?',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Reminder',
            style: 'destructive',
            onPress: () => onCancelReminder?.(type, loadId),
          },
        ]
      );
    },
    [onCancelReminder]
  );

  // Filter to only future reminders
  const futureReminders = reminders
    .filter((r) => new Date(r.scheduledFor).getTime() > Date.now())
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  if (futureReminders.length === 0) {
    return null;
  }

  const nextReminder = futureReminders[0];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="bell" size="sm" color={colors.warning} />
          <Text style={styles.title}>Upcoming Reminders</Text>
        </View>
        <Text style={styles.count}>{futureReminders.length}</Text>
      </View>

      {/* Next reminder highlight */}
      <View style={styles.nextReminder}>
        <View style={styles.nextReminderIcon}>
          <Icon name={getReminderIcon(nextReminder.type)} size="md" color={colors.textPrimary} />
        </View>
        <View style={styles.nextReminderContent}>
          <Text style={styles.nextReminderLabel}>{getReminderLabel(nextReminder.type)}</Text>
          <Text style={styles.nextReminderTime}>{formatReminderTime(nextReminder.scheduledFor)}</Text>
        </View>
        <Text style={styles.nextReminderCountdown}>{formatTimeUntil(nextReminder.scheduledFor)}</Text>
      </View>

      {/* Additional reminders (collapsed) */}
      {futureReminders.length > 1 && (
        <View style={styles.moreReminders}>
          {futureReminders.slice(1, 3).map((reminder, index) => (
            <View key={`${reminder.type}-${reminder.loadId || 'trip'}-${index}`} style={styles.reminderRow}>
              <Icon name={getReminderIcon(reminder.type)} size="sm" color={colors.textMuted} />
              <Text style={styles.reminderRowLabel}>{getReminderLabel(reminder.type)}</Text>
              <Text style={styles.reminderRowTime}>{formatTimeUntil(reminder.scheduledFor)}</Text>
            </View>
          ))}
          {futureReminders.length > 3 && (
            <Text style={styles.moreText}>+{futureReminders.length - 3} more reminders</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  count: {
    ...typography.label,
    color: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  // Next reminder (highlighted)
  nextReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  nextReminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextReminderContent: {
    flex: 1,
  },
  nextReminderLabel: {
    ...typography.subheadline,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  nextReminderTime: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  nextReminderCountdown: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
  // More reminders list
  moreReminders: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderRowLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  reminderRowTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  moreText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default UpcomingRemindersCard;

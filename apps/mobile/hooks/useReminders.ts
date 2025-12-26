/**
 * useReminders Hook
 *
 * Manages local notification reminders for trips and loads.
 * Schedules reminders for:
 * - Trip start (day before and morning of)
 * - Pickup times
 * - Delivery dates/windows
 *
 * Uses expo-notifications for scheduling local notifications.
 */

import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, Load, TripWithLoads, TripLoad } from '../types';

// Reminder types
export type ReminderType =
  | 'trip_start_day_before'
  | 'trip_start_morning'
  | 'pickup_reminder'
  | 'delivery_reminder'
  | 'rfd_window_reminder';

export interface ReminderData {
  type: ReminderType;
  tripId: string;
  loadId?: string;
  tripNumber?: number;
  message?: string;
}

interface ScheduledReminder {
  notificationId: string;
  type: ReminderType;
  tripId: string;
  loadId?: string;
  scheduledFor: string;
}

const STORAGE_KEY = 'scheduled_reminders';

// Reminder timing configuration (in milliseconds)
const REMINDER_TIMING = {
  dayBefore: 24 * 60 * 60 * 1000, // 24 hours before
  morningOf: 3 * 60 * 60 * 1000, // 3 hours before (morning reminder)
  pickupBefore: 2 * 60 * 60 * 1000, // 2 hours before pickup
  deliveryBefore: 24 * 60 * 60 * 1000, // 24 hours before delivery
};

// Default reminder times (hour of day for morning reminders)
const MORNING_REMINDER_HOUR = 7; // 7 AM

export function useReminders() {
  const scheduledRemindersRef = useRef<ScheduledReminder[]>([]);

  // Load scheduled reminders from storage on mount
  useEffect(() => {
    loadScheduledReminders();
  }, []);

  const loadScheduledReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        scheduledRemindersRef.current = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const saveScheduledReminders = async (reminders: ScheduledReminder[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
      scheduledRemindersRef.current = reminders;
    } catch {
      // Ignore storage errors
    }
  };

  /**
   * Schedule a single reminder notification
   */
  const scheduleReminder = useCallback(
    async (
      title: string,
      body: string,
      triggerDate: Date,
      data: ReminderData
    ): Promise<string | null> => {
      // Don't schedule if date is in the past
      if (triggerDate.getTime() <= Date.now()) {
        return null;
      }

      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data as unknown as Record<string, unknown>,
            sound: true,
            categoryIdentifier: 'reminder',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: 'reminders',
          },
        });

        // Track this scheduled reminder
        const newReminder: ScheduledReminder = {
          notificationId,
          type: data.type,
          tripId: data.tripId,
          loadId: data.loadId,
          scheduledFor: triggerDate.toISOString(),
        };

        const updated = [...scheduledRemindersRef.current, newReminder];
        await saveScheduledReminders(updated);

        return notificationId;
      } catch (error) {
        console.error('Failed to schedule reminder:', error);
        return null;
      }
    },
    []
  );

  /**
   * Cancel a specific reminder by notification ID
   */
  const cancelReminder = useCallback(async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      const updated = scheduledRemindersRef.current.filter(
        (r) => r.notificationId !== notificationId
      );
      await saveScheduledReminders(updated);
    } catch {
      // Ignore errors
    }
  }, []);

  /**
   * Cancel all reminders for a specific trip
   */
  const cancelTripReminders = useCallback(async (tripId: string) => {
    const tripReminders = scheduledRemindersRef.current.filter(
      (r) => r.tripId === tripId
    );

    for (const reminder of tripReminders) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch {
        // Ignore errors
      }
    }

    const updated = scheduledRemindersRef.current.filter((r) => r.tripId !== tripId);
    await saveScheduledReminders(updated);
  }, []);

  /**
   * Cancel all reminders for a specific load
   */
  const cancelLoadReminders = useCallback(async (loadId: string) => {
    const loadReminders = scheduledRemindersRef.current.filter(
      (r) => r.loadId === loadId
    );

    for (const reminder of loadReminders) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch {
        // Ignore errors
      }
    }

    const updated = scheduledRemindersRef.current.filter((r) => r.loadId !== loadId);
    await saveScheduledReminders(updated);
  }, []);

  /**
   * Check if a reminder already exists
   */
  const hasReminder = useCallback(
    (type: ReminderType, tripId: string, loadId?: string): boolean => {
      return scheduledRemindersRef.current.some(
        (r) => r.type === type && r.tripId === tripId && r.loadId === loadId
      );
    },
    []
  );

  /**
   * Schedule reminders for a trip start
   * - Day before reminder (evening)
   * - Morning of reminder
   */
  const scheduleTripStartReminders = useCallback(
    async (trip: Trip | TripWithLoads) => {
      if (!trip.start_date || trip.status === 'completed' || trip.status === 'settled' || trip.status === 'cancelled') {
        return;
      }

      const startDate = new Date(trip.start_date);
      const tripNumber = trip.trip_number;

      // Day before reminder (6 PM the day before)
      if (!hasReminder('trip_start_day_before', trip.id)) {
        const dayBefore = new Date(startDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(18, 0, 0, 0); // 6 PM

        if (dayBefore.getTime() > Date.now()) {
          await scheduleReminder(
            `Trip #${tripNumber} Tomorrow`,
            `Your trip starts tomorrow. Make sure you're ready!`,
            dayBefore,
            {
              type: 'trip_start_day_before',
              tripId: trip.id,
              tripNumber,
            }
          );
        }
      }

      // Morning of reminder (7 AM day of)
      if (!hasReminder('trip_start_morning', trip.id)) {
        const morningOf = new Date(startDate);
        morningOf.setHours(MORNING_REMINDER_HOUR, 0, 0, 0);

        if (morningOf.getTime() > Date.now()) {
          await scheduleReminder(
            `Trip #${tripNumber} Today`,
            `Your trip starts today. Time to get moving!`,
            morningOf,
            {
              type: 'trip_start_morning',
              tripId: trip.id,
              tripNumber,
            }
          );
        }
      }
    },
    [hasReminder, scheduleReminder]
  );

  /**
   * Schedule reminders for a load's pickup
   */
  const schedulePickupReminder = useCallback(
    async (load: Load, tripId: string, tripNumber?: number) => {
      if (!load.pickup_date || load.load_status === 'delivered' || load.load_status === 'storage_completed') {
        return;
      }

      // Don't schedule if already loading or past loading
      if (['loading', 'loaded', 'in_transit', 'delivered'].includes(load.load_status)) {
        return;
      }

      if (hasReminder('pickup_reminder', tripId, load.id)) {
        return;
      }

      const pickupDate = new Date(load.pickup_date);

      // Reminder 2 hours before pickup
      const reminderTime = new Date(pickupDate.getTime() - REMINDER_TIMING.pickupBefore);

      if (reminderTime.getTime() > Date.now()) {
        const location = [load.pickup_city, load.pickup_state].filter(Boolean).join(', ');
        await scheduleReminder(
          'Pickup Reminder',
          `Pickup in ${location || 'scheduled location'} in 2 hours${tripNumber ? ` (Trip #${tripNumber})` : ''}`,
          reminderTime,
          {
            type: 'pickup_reminder',
            tripId,
            loadId: load.id,
            tripNumber,
          }
        );
      }
    },
    [hasReminder, scheduleReminder]
  );

  /**
   * Schedule reminders for a load's delivery
   */
  const scheduleDeliveryReminder = useCallback(
    async (load: Load, tripId: string, tripNumber?: number) => {
      // Use delivery_date or customer_rfd_date
      const deliveryDateStr = load.delivery_date || load.customer_rfd_date;

      if (!deliveryDateStr || load.load_status === 'delivered' || load.load_status === 'storage_completed') {
        return;
      }

      // Only schedule for loads that are loaded or in transit
      if (!['loaded', 'in_transit'].includes(load.load_status)) {
        return;
      }

      if (hasReminder('delivery_reminder', tripId, load.id)) {
        return;
      }

      const deliveryDate = new Date(deliveryDateStr);

      // Morning reminder on delivery day
      const reminderTime = new Date(deliveryDate);
      reminderTime.setHours(MORNING_REMINDER_HOUR, 0, 0, 0);

      if (reminderTime.getTime() > Date.now()) {
        const location = [
          load.delivery_city || load.dropoff_city,
          load.delivery_state || load.dropoff_state,
        ]
          .filter(Boolean)
          .join(', ');

        await scheduleReminder(
          'Delivery Day',
          `Delivery to ${location || 'customer'} is scheduled for today${tripNumber ? ` (Trip #${tripNumber})` : ''}`,
          reminderTime,
          {
            type: 'delivery_reminder',
            tripId,
            loadId: load.id,
            tripNumber,
          }
        );
      }

      // If there's an RFD window, also remind about window end
      if (load.customer_rfd_date_end && !hasReminder('rfd_window_reminder', tripId, load.id)) {
        const windowEnd = new Date(load.customer_rfd_date_end);
        const windowEndReminder = new Date(windowEnd);
        windowEndReminder.setHours(MORNING_REMINDER_HOUR, 0, 0, 0);

        if (windowEndReminder.getTime() > Date.now() && windowEndReminder.getTime() !== reminderTime.getTime()) {
          await scheduleReminder(
            'Delivery Window Ending',
            `Last day of delivery window for customer${tripNumber ? ` (Trip #${tripNumber})` : ''}`,
            windowEndReminder,
            {
              type: 'rfd_window_reminder',
              tripId,
              loadId: load.id,
              tripNumber,
            }
          );
        }
      }
    },
    [hasReminder, scheduleReminder]
  );

  /**
   * Schedule all relevant reminders for a trip and its loads
   */
  const scheduleAllTripReminders = useCallback(
    async (trip: TripWithLoads) => {
      // Schedule trip start reminders
      await scheduleTripStartReminders(trip);

      // Schedule load-specific reminders
      if (trip.trip_loads) {
        for (const tripLoad of trip.trip_loads) {
          await schedulePickupReminder(tripLoad.loads, trip.id, trip.trip_number);
          await scheduleDeliveryReminder(tripLoad.loads, trip.id, trip.trip_number);
        }
      }
    },
    [scheduleTripStartReminders, schedulePickupReminder, scheduleDeliveryReminder]
  );

  /**
   * Clear all expired reminders from storage
   */
  const cleanupExpiredReminders = useCallback(async () => {
    const now = Date.now();
    const updated = scheduledRemindersRef.current.filter((r) => {
      const scheduledTime = new Date(r.scheduledFor).getTime();
      return scheduledTime > now;
    });

    if (updated.length !== scheduledRemindersRef.current.length) {
      await saveScheduledReminders(updated);
    }
  }, []);

  /**
   * Get all scheduled reminders for display
   */
  const getScheduledReminders = useCallback((): ScheduledReminder[] => {
    return [...scheduledRemindersRef.current].sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );
  }, []);

  /**
   * Get count of scheduled reminders
   */
  const getReminderCount = useCallback((): number => {
    return scheduledRemindersRef.current.length;
  }, []);

  return {
    scheduleReminder,
    cancelReminder,
    cancelTripReminders,
    cancelLoadReminders,
    scheduleTripStartReminders,
    schedulePickupReminder,
    scheduleDeliveryReminder,
    scheduleAllTripReminders,
    cleanupExpiredReminders,
    getScheduledReminders,
    getReminderCount,
    hasReminder,
  };
}

export default useReminders;

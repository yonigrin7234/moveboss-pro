import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { usePushNotifications, NotificationData } from '../hooks/usePushNotifications';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
  error: null,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { expoPushToken, notification, error } = usePushNotifications();

  // Handle notification response (user taps notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const rawData = response.notification.request.content.data;
      const data = rawData as unknown as NotificationData;

      // Only navigate if user is in the app (authenticated)
      const inAppGroup = segments[0] === '(app)';
      if (!inAppGroup) return;

      // Navigate based on notification type
      switch (data.type) {
        case 'trip_assigned':
        case 'load_status_changed':
        case 'load_removed':
          if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        case 'load_assigned':
        case 'load_added':
          if (data.tripId && data.loadId) {
            router.push(`/(app)/trips/${data.tripId}/loads/${data.loadId}`);
          } else if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        case 'delivery_order_changed':
          // Navigate to load if specified, otherwise trip
          if (data.tripId && data.loadId) {
            router.push(`/(app)/trips/${data.tripId}/loads/${data.loadId}`);
          } else if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        case 'payment_received':
        case 'settlement_approved':
          router.push('/(app)/earnings');
          break;

        // Reminder notifications - navigate to trip or load
        case 'trip_start_day_before':
        case 'trip_start_morning':
          if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        case 'pickup_reminder':
        case 'delivery_reminder':
        case 'rfd_window_reminder':
          if (data.tripId && data.loadId) {
            router.push(`/(app)/trips/${data.tripId}/loads/${data.loadId}`);
          } else if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        default:
          // Just go to home for general notifications
          break;
      }
    });

    return () => subscription.remove();
  }, [router, segments]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        error,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

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
          if (data.tripId) {
            router.push(`/(app)/trips/${data.tripId}`);
          }
          break;

        case 'load_assigned':
          if (data.tripId && data.loadId) {
            router.push(`/(app)/trips/${data.tripId}/loads/${data.loadId}`);
          }
          break;

        case 'payment_received':
        case 'settlement_approved':
          router.push('/(app)/earnings');
          break;

        default:
          // Just go to home for general notifications
          break;
      }
    });

    return () => subscription.remove();
  }, [router, segments]);

  // Log when notification is received in foreground
  useEffect(() => {
    if (notification) {
      console.log('Notification received in foreground:', notification.request.content);
    }
  }, [notification]);

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

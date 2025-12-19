import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType =
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

export interface NotificationData {
  type: NotificationType;
  tripId?: string;
  loadId?: string;
  message?: string;
  // Message notification fields (sent from backend with snake_case)
  conversation_id?: string;
  load_id?: string;
  trip_id?: string;
}

interface UsePushNotificationsResult {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
  registerForPushNotifications: () => Promise<string | null>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const { user } = useAuth();

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    // Must be a physical device
    if (!Device.isDevice) {
      setError('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission not granted for push notifications');
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;

      setExpoPushToken(token);

      // Save token to database if user is logged in
      if (user && token) {
        await savePushToken(token);
      }

      // Android-specific channel configuration
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0066CC',
        });

        await Notifications.setNotificationChannelAsync('trips', {
          name: 'Trip Updates',
          description: 'Notifications about trip assignments and status',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0066CC',
        });

        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Payments',
          description: 'Notifications about payments and settlements',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
        });
      }

      return token;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register for push notifications');
      return null;
    }
  }, [user]);

  const savePushToken = async (token: string) => {
    if (!user) return;

    try {
      // Get driver record
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!driver) return;

      // Upsert push token
      // Explicitly set is_active to true to ensure tokens are active
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            driver_id: driver.id,
            token,
            platform: Platform.OS,
            device_name: Device.deviceName || undefined,
            is_active: true, // Explicitly set to ensure token is active
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (upsertError) {
        console.error('Failed to save push token:', upsertError);
      }
    } catch {
      // Silently fail - non-critical
    }
  };

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listen for notification responses (user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const rawData = response.notification.request.content.data;
      const data = rawData as unknown as NotificationData;
      handleNotificationResponse(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [registerForPushNotifications]);

  // Re-save token when user changes
  useEffect(() => {
    if (user && expoPushToken) {
      savePushToken(expoPushToken);
    }
  }, [user, expoPushToken]);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
  };
}

// Handle notification tap - navigate to appropriate screen
function handleNotificationResponse(_data: NotificationData) {
  // Navigation will be handled by the component that uses this hook
  // This is just a placeholder for custom logic
}

// Helper to schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  seconds: number = 1
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: (data || {}) as Record<string, unknown>,
      sound: true,
    },
    trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

// Helper to send a push notification (for testing - normally done server-side)
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: NotificationData
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

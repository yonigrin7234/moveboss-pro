/**
 * Owner Layout - Tab navigation for owner/dispatcher experience
 *
 * Main tabs: Dashboard, Requests, Loads, Messages, More
 * Detail screens: Hide tab bar for focused experience
 */

import { useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { OwnerTabBar } from '../../components/OwnerTabBar';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { colors } from '../../lib/theme';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '../../lib/queryClient';
import { useOwnerDashboardData } from '../../hooks/useOwnerDashboardData';
import { useOwnerRealtime } from '../../hooks/useOwnerRealtime';
import { useOwnerUnreadCount, useIncomingMessageNotifications } from '../../hooks/useOwnerMessaging';
import { useToast } from '../../components/ui/Toast';
import { haptics } from '../../lib/haptics';

function OwnerTabBarWithBadges(props: any) {
  const { requestCount, criticalRfdCount } = useOwnerDashboardData();
  const messageCount = useOwnerUnreadCount();
  const router = useRouter();
  const toast = useToast();

  // Enable real-time subscriptions for the owner experience
  useOwnerRealtime();

  // Handle incoming message notifications with toasts
  const handleIncomingMessage = useCallback((message: {
    conversationId: string;
    senderName: string;
    preview: string;
    conversationType: string;
  }) => {
    // Play haptic feedback for incoming message
    haptics.attention();

    // Show toast notification with action to open the conversation
    toast.showToast(`${message.senderName}: ${message.preview}`, 'info', {
      duration: 5000,
      action: {
        label: 'View',
        onPress: () => {
          router.push(`/(owner)/messages/${message.conversationId}`);
        },
      },
    });
  }, [toast, router]);

  // Subscribe to incoming messages for notifications
  useIncomingMessageNotifications({
    onNewMessage: handleIncomingMessage,
  });

  return (
    <OwnerTabBar
      {...props}
      requestCount={requestCount}
      criticalRfdCount={criticalRfdCount}
      messageCount={messageCount}
    />
  );
}

export default function OwnerLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
      <ErrorBoundary>
        <Tabs
          tabBar={(props) => <OwnerTabBarWithBadges {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: false,
            tabBarStyle: { display: 'flex' },
            lazy: true,
            sceneStyle: { backgroundColor: colors.background },
          }}
        >
          {/* Main tabs */}
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="requests/index"
            options={{
              title: 'Requests',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="loads/index"
            options={{
              title: 'Loads',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="messages/index"
            options={{
              title: 'Messages',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              headerShown: false,
            }}
          />

          {/* Detail screens - hide from tab bar */}
          <Tabs.Screen
            name="requests/[id]"
            options={{
              href: null,
              headerShown: true,
              title: 'Request Details',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="loads/new"
            options={{
              href: null,
              headerShown: true,
              title: 'New Load',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="loads/[id]"
            options={{
              href: null,
              headerShown: true,
              title: 'Load Details',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="drivers/map"
            options={{
              href: null,
              headerShown: true,
              title: 'Driver Map',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="drivers/[id]"
            options={{
              href: null,
              headerShown: true,
              title: 'Driver Details',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="trips/index"
            options={{
              href: null,
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="trips/new"
            options={{
              href: null,
              headerShown: true,
              title: 'New Trip',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="trips/[id]"
            options={{
              href: null,
              headerShown: true,
              title: 'Trip Details',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="settings/index"
            options={{
              href: null,
              headerShown: true,
              title: 'Settings',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="settings/notifications"
            options={{
              href: null,
              headerShown: false,
              title: 'Notifications',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="messages/[id]"
            options={{
              href: null,
              headerShown: false,
              title: 'Chat',
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="drivers/index"
            options={{
              href: null,
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs>
      </ErrorBoundary>
    </PersistQueryClientProvider>
  );
}

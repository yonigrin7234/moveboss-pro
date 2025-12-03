/**
 * App Layout - Premium tab navigation with custom tab bar
 *
 * Main tabs: Home, Trips, Docs, Earnings
 * Detail screens: Hide tab bar for focused experience
 */

import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/CustomTabBar';
import { colors } from '../../lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
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
        // Default: show tab bar
        tabBarStyle: { display: 'flex' },
      }}
    >
      {/* Main tabs */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trips/index"
        options={{
          title: 'Trips',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          headerShown: false,
        }}
      />

      {/* Detail screens - hide from tab bar */}
      <Tabs.Screen
        name="trips/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          title: 'Trip Details',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/start"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/expenses"
        options={{
          href: null,
          headerShown: true,
          title: 'Expenses',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/loads/[loadId]"
        options={{
          href: null,
          headerShown: true,
          title: 'Load Details',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/loads/[loadId]/complete-delivery"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/loads/[loadId]/pickup-completion"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/loads/[loadId]/collect-payment"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="trips/[id]/loads/[loadId]/contract-details"
        options={{
          href: null,
          headerShown: true,
          title: 'Contract',
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

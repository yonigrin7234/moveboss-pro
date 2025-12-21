/**
 * OwnerTabBar - Bottom navigation for owner/dispatcher experience
 *
 * Features:
 * - Blur effect background with floating design
 * - Animated active state with background pill
 * - Haptic feedback on tap
 * - Badge support for notifications
 * - Hide on detail/modal screens
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, typography, spacing, radius } from '../lib/theme';
import { haptics } from '../lib/haptics';
import { Icon, IconName } from './ui/Icon';

const TAB_BAR_HEIGHT = 70;

interface TabConfig {
  name: string;
  icon: IconName;
  label: string;
}

const OWNER_TABS: TabConfig[] = [
  { name: 'index', icon: 'home', label: 'Dashboard' },
  { name: 'requests/index', icon: 'bell', label: 'Requests' },
  { name: 'loads/index', icon: 'package', label: 'Loads' },
  { name: 'messages/index', icon: 'message-circle', label: 'Messages' },
  { name: 'more', icon: 'menu', label: 'More' },
];

interface TabItemProps {
  route: any;
  index: number;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number;
  showDot?: boolean;
}

function TabItem({
  route,
  index,
  isFocused,
  onPress,
  onLongPress,
  badge,
  showDot,
}: TabItemProps) {
  const scale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(isFocused ? 1 : 0);

  // Update background when focus changes
  React.useEffect(() => {
    backgroundOpacity.value = withSpring(isFocused ? 1 : 0, {
      damping: 20,
      stiffness: 300,
    });
  }, [isFocused]);

  const handlePress = useCallback(() => {
    // Animate press
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, 100);

    haptics.selection();
    onPress();
  }, [onPress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
    transform: [{ scale: backgroundOpacity.value * 0.1 + 0.9 }],
  }));

  const tabConfig = OWNER_TABS[index];
  if (!tabConfig) return null;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={tabConfig.label}
    >
      <Animated.View style={[styles.tabContent, animatedContainerStyle]}>
        {/* Background pill */}
        <Animated.View
          style={[styles.activeBackground, animatedBackgroundStyle]}
        />

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Icon
            name={tabConfig.icon}
            size="md"
            color={isFocused ? colors.primary : colors.textMuted}
            strokeWidth={isFocused ? 2.5 : 2}
          />

          {/* Badge */}
          {(badge !== undefined && badge > 0) && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          )}

          {/* Dot indicator */}
          {showDot && !badge && <View style={styles.dot} />}
        </View>

        {/* Label */}
        <Text
          style={[
            styles.label,
            { color: isFocused ? colors.primary : colors.textMuted },
            isFocused && styles.labelActive,
          ]}
        >
          {tabConfig.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface OwnerTabBarProps extends BottomTabBarProps {
  /** Number of pending load requests */
  requestCount?: number;
  /** Number of critical RFD loads */
  criticalRfdCount?: number;
  /** Number of unread messages */
  messageCount?: number;
}

export function OwnerTabBar({
  state,
  descriptors,
  navigation,
  requestCount = 0,
  criticalRfdCount = 0,
  messageCount = 0,
}: OwnerTabBarProps) {
  const insets = useSafeAreaInsets();

  // Check if tab bar should be hidden for current route
  const currentRoute = state.routes[state.index];
  const currentRouteOptions = descriptors[currentRoute?.key]?.options;
  const tabBarStyle = currentRouteOptions?.tabBarStyle as { display?: string } | undefined;
  const shouldHideTabBar = tabBarStyle?.display === 'none';

  // Get badge counts
  const getBadge = (routeName: string): number | undefined => {
    if (routeName === 'requests/index') {
      return requestCount > 0 ? requestCount : undefined;
    }
    if (routeName === 'loads/index') {
      return criticalRfdCount > 0 ? criticalRfdCount : undefined;
    }
    if (routeName === 'messages/index') {
      return messageCount > 0 ? messageCount : undefined;
    }
    return undefined;
  };

  const getShowDot = (routeName: string): boolean => {
    return false;
  };

  // Hide tab bar if current route has display: 'none'
  if (shouldHideTabBar) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={80}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
      )}

      {/* Top border glow */}
      <View style={styles.topBorder} />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          // Only show tabs that are in our OWNER_TABS config
          const tabIndex = OWNER_TABS.findIndex(t => t.name === route.name);
          if (tabIndex === -1) return null;

          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              index={tabIndex}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              badge={getBadge(route.name)}
              showDot={getShowDot(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  androidBackground: {
    backgroundColor: 'rgba(15, 15, 25, 0.98)',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    ...typography.label,
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.background,
  },
});

export default OwnerTabBar;

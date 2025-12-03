/**
 * ScreenContainer - Consistent screen wrapper with safe areas
 *
 * Features:
 * - Safe area handling for notches/home indicators
 * - Keyboard avoiding behavior for forms
 * - Consistent background color
 * - Optional scroll behavior
 */

import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../lib/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Use ScrollView wrapper */
  scroll?: boolean;
  /** Add keyboard avoiding behavior */
  keyboardAvoiding?: boolean;
  /** Custom padding (default: screenPadding) */
  padding?: number;
  /** Disable horizontal padding */
  noPadding?: boolean;
  /** Add extra bottom padding for tab bar */
  tabBarPadding?: boolean;
  /** Pull to refresh handler */
  onRefresh?: () => void;
  /** Refresh loading state */
  refreshing?: boolean;
  /** Custom style for container */
  style?: ViewStyle;
  /** Custom style for content */
  contentStyle?: ViewStyle;
  /** Edges to apply safe area insets */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padding = spacing.screenPadding,
  noPadding = false,
  tabBarPadding = false,
  onRefresh,
  refreshing = false,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const contentPadding: ViewStyle = {
    paddingHorizontal: noPadding ? 0 : padding,
    paddingBottom: tabBarPadding ? 100 : spacing.xxl,
  };

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  ) : undefined;

  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[contentPadding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentPadding, contentStyle]}>
      {children}
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={[containerStyle, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={[containerStyle, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenContainer;

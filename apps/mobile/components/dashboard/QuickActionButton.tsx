/**
 * QuickActionButton Component
 *
 * Dashboard quick action button with icon, label, and optional badge.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from '../ui';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface QuickActionButtonProps {
  icon: IconName;
  label: string;
  badge?: number;
  badgeVariant?: 'error' | 'warning';
  onPress: () => void;
}

export function QuickActionButton({
  icon,
  label,
  badge,
  badgeVariant,
  onPress,
}: QuickActionButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickActionButton,
        pressed && styles.quickActionButtonPressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.quickActionIconContainer}>
        <Icon name={icon} size="lg" color={colors.textPrimary} />
        {badge !== undefined && (
          <View
            style={[
              styles.quickActionBadge,
              badgeVariant === 'error' ? styles.badgeError : styles.badgeWarning,
            ]}
          >
            <Text style={styles.quickActionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickActionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  quickActionIconContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  quickActionBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeError: {
    backgroundColor: colors.error,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  quickActionBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
  },
});

export default QuickActionButton;

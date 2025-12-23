/**
 * ExpenseItem Component
 *
 * Individual expense row with category icon, amount, and swipe-to-delete.
 * Premium styling with haptic feedback.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { TripExpense } from '../../types';
import { Icon, IconName } from '../ui/Icon';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface ExpenseItemProps {
  expense: TripExpense;
  onDelete: () => void;
  onPress?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: IconName; color: string; bgColor: string }> = {
  fuel: { icon: 'fuel', color: colors.warning, bgColor: colors.warningSoft },
  tolls: { icon: 'credit-card', color: colors.info, bgColor: colors.infoSoft },
  lumper: { icon: 'package', color: colors.primary, bgColor: colors.primarySoft },
  parking: { icon: 'map-pin', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  maintenance: { icon: 'tool', color: colors.error, bgColor: colors.errorSoft },
  other: { icon: 'more-horizontal', color: colors.textMuted, bgColor: colors.surfaceElevated },
};

const DELETE_THRESHOLD = -80;

export function ExpenseItem({ expense, onDelete, onPress }: ExpenseItemProps) {
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const triggerDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swipe left
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -120);
        deleteOpacity.value = Math.min(Math.abs(event.translationX) / 80, 1);
      }
    })
    .onEnd((event) => {
      if (event.translationX < DELETE_THRESHOLD) {
        // Trigger delete
        translateX.value = withTiming(-400, { duration: 200 });
        runOnJS(triggerDelete)();
      } else {
        // Spring back
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        deleteOpacity.value = withSpring(0);
      }
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
    transform: [{ scale: 0.8 + deleteOpacity.value * 0.2 }],
  }));

  const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
  const isReimbursable = expense.paid_by === 'driver_personal' || expense.paid_by === 'driver_cash';

  return (
    <View style={styles.container}>
      {/* Delete Action Background */}
      <Animated.View style={[styles.deleteAction, animatedDeleteStyle]}>
        <Icon name="trash" size="md" color={colors.white} />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>

      {/* Swipeable Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.itemContainer, animatedRowStyle]}>
          <Pressable
            style={styles.expenseItem}
            onPress={onPress}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDelete();
            }}
          >
            {/* Category Icon */}
            <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
              <Icon name={config.icon} size="md" color={config.color} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.category}>
                  {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                </Text>
                {isReimbursable && (
                  <View style={styles.reimbursableBadge}>
                    <Text style={styles.reimbursableBadgeText}>Reimbursable</Text>
                  </View>
                )}
              </View>
              {expense.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {expense.description}
                </Text>
              )}
              <Text style={styles.date}>{formatDate(expense.incurred_at)}</Text>
            </View>

            {/* Amount */}
            <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  deleteText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  itemContainer: {
    backgroundColor: colors.surface,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  category: {
    ...typography.subheadline,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reimbursableBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  reimbursableBadgeText: {
    ...typography.label,
    color: colors.success,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  amount: {
    ...typography.subheadline,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
});

export default ExpenseItem;

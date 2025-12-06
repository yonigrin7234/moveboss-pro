/**
 * Skeleton - Shimmer loading placeholder
 *
 * Features:
 * - Smooth shimmer animation
 * - Multiple shapes (rectangle, circle, text lines)
 * - Configurable sizing
 * - Dark mode compatible
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../../lib/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
    // Cleanup on unmount
    return () => {
      shimmerProgress.value = 0;
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.08)',
            'rgba(255, 255, 255, 0.12)',
            'rgba(255, 255, 255, 0.08)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Circle skeleton for avatars
 */
interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size = 40, style }: SkeletonCircleProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

/**
 * Text skeleton with multiple lines
 */
interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  style?: ViewStyle;
}

export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '60%',
  style,
}: SkeletonTextProps) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          style={index < lines - 1 ? { marginBottom: spacing.sm } : undefined}
        />
      ))}
    </View>
  );
}

/**
 * Card skeleton placeholder
 */
interface SkeletonCardProps {
  hasAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}

export function SkeletonCard({
  hasAvatar = false,
  lines = 2,
  style,
}: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      {hasAvatar && (
        <View style={styles.cardHeader}>
          <SkeletonCircle size={48} />
          <View style={styles.cardHeaderText}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={14} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      )}
      <SkeletonText lines={lines} style={hasAvatar ? { marginTop: spacing.md } : undefined} />
    </View>
  );
}

/**
 * List skeleton with multiple items
 */
interface SkeletonListProps {
  items?: number;
  itemHeight?: number;
  style?: ViewStyle;
}

export function SkeletonList({
  items = 5,
  itemHeight = 72,
  style,
}: SkeletonListProps) {
  return (
    <View style={style}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={[styles.listItem, { height: itemHeight }]}>
          <SkeletonCircle size={44} />
          <View style={styles.listItemContent}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={14} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Stats card skeleton
 */
export function SkeletonStats({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.statsContainer, style]}>
      <View style={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={60} height={32} />
        <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
      </View>
    </View>
  );
}

/**
 * Button skeleton
 */
interface SkeletonButtonProps {
  width?: DimensionValue;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function SkeletonButton({
  width = '100%',
  size = 'md',
  style,
}: SkeletonButtonProps) {
  const heights = { sm: 36, md: 48, lg: 56 };
  return (
    <Skeleton
      width={width}
      height={heights[size]}
      borderRadius={radius.button}
      style={style}
    />
  );
}

// =============================================================================
// SCREEN-SPECIFIC SKELETONS
// =============================================================================

/**
 * Trip Card Skeleton - Matches TripCard layout exactly
 */
export function TripCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.tripCard, style]}>
      {/* Header row */}
      <View style={styles.tripCardHeader}>
        <Skeleton width={100} height={24} borderRadius={radius.full} />
        <Skeleton width={80} height={20} />
      </View>

      {/* Route info */}
      <View style={styles.tripCardRoute}>
        <View style={styles.tripCardLocation}>
          <SkeletonCircle size={12} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={14} style={{ marginTop: 4 }} />
          </View>
        </View>
        <View style={styles.tripCardDivider}>
          <Skeleton width={2} height={24} />
        </View>
        <View style={styles.tripCardLocation}>
          <SkeletonCircle size={12} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Skeleton width="65%" height={16} />
            <Skeleton width="45%" height={14} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.tripCardFooter}>
        <Skeleton width={60} height={14} />
        <Skeleton width={80} height={14} />
      </View>
    </View>
  );
}

/**
 * Load Card Skeleton - Matches load list items
 */
export function LoadCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.loadCard, style]}>
      <View style={styles.loadCardHeader}>
        <Skeleton width={70} height={22} borderRadius={radius.sm} />
        <Skeleton width={90} height={22} borderRadius={radius.full} />
      </View>
      <View style={styles.loadCardBody}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={14} style={{ marginTop: spacing.xs }} />
      </View>
      <View style={styles.loadCardFooter}>
        <Skeleton width={100} height={14} />
        <Skeleton width={70} height={18} />
      </View>
    </View>
  );
}

/**
 * Load Detail Skeleton - Full load detail screen
 */
export function LoadDetailSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.loadDetail, style]}>
      {/* Status banner */}
      <Skeleton width="100%" height={48} borderRadius={radius.md} />

      {/* Customer info */}
      <View style={styles.loadDetailSection}>
        <Skeleton width={80} height={12} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="70%" height={20} />
        <Skeleton width="50%" height={16} style={{ marginTop: spacing.xs }} />
      </View>

      {/* Address cards */}
      <View style={styles.loadDetailAddresses}>
        <View style={styles.loadDetailAddressCard}>
          <Skeleton width={60} height={12} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="90%" height={16} />
          <Skeleton width="70%" height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.loadDetailAddressCard}>
          <Skeleton width={60} height={12} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="85%" height={16} />
          <Skeleton width="65%" height={14} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.loadDetailActions}>
        <SkeletonButton size="lg" />
      </View>

      {/* Details grid */}
      <View style={styles.loadDetailGrid}>
        <View style={styles.loadDetailGridItem}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.loadDetailGridItem}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.loadDetailGridItem}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={styles.loadDetailGridItem}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Payment/Earnings Skeleton
 */
export function PaymentCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.paymentCard, style]}>
      <View style={styles.paymentHeader}>
        <View>
          <Skeleton width={100} height={14} />
          <Skeleton width={120} height={32} style={{ marginTop: spacing.xs }} />
        </View>
        <Skeleton width={80} height={28} borderRadius={radius.full} />
      </View>
      <View style={styles.paymentDivider} />
      <View style={styles.paymentDetails}>
        <View style={styles.paymentRow}>
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} />
        </View>
        <View style={styles.paymentRow}>
          <Skeleton width={100} height={14} />
          <Skeleton width={50} height={14} />
        </View>
      </View>
    </View>
  );
}

/**
 * Next Action Card Skeleton - Hero card at top of home
 */
export function NextActionSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.nextAction, style]}>
      {/* Badge */}
      <Skeleton width={100} height={24} borderRadius={radius.full} />

      {/* Title */}
      <Skeleton width="70%" height={28} style={{ marginTop: spacing.lg }} />

      {/* Subtitle */}
      <Skeleton width="50%" height={18} style={{ marginTop: spacing.sm }} />

      {/* Action button */}
      <View style={styles.nextActionButton}>
        <Skeleton width={140} height={44} borderRadius={radius.full} />
      </View>
    </View>
  );
}

/**
 * Home Screen Skeleton - Full home screen loading state
 */
export function HomeScreenSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.homeScreen, style]}>
      {/* Next action card */}
      <NextActionSkeleton style={{ marginBottom: spacing.lg }} />

      {/* Quick stats */}
      <SkeletonStats style={{ marginBottom: spacing.lg }} />

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Skeleton width={120} height={20} />
        <Skeleton width={60} height={16} />
      </View>

      {/* Trip cards */}
      <TripCardSkeleton style={{ marginBottom: spacing.md }} />
      <TripCardSkeleton />
    </View>
  );
}

/**
 * Document List Skeleton
 */
export function DocumentListSkeleton({ items = 3, style }: { items?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={styles.documentItem}>
          <Skeleton width={48} height={48} borderRadius={radius.sm} />
          <View style={styles.documentContent}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={14} style={{ marginTop: spacing.xs }} />
          </View>
          <Skeleton width={24} height={24} borderRadius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

/**
 * Expense List Skeleton
 */
export function ExpenseListSkeleton({ items = 4, style }: { items?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={styles.expenseItem}>
          <View style={{ flex: 1 }}>
            <View style={styles.expenseHeader}>
              <Skeleton width={80} height={16} />
              <Skeleton width={70} height={18} borderRadius={radius.sm} />
            </View>
            <Skeleton width="50%" height={14} style={{ marginTop: spacing.xs }} />
          </View>
          <Skeleton width={70} height={20} />
        </View>
      ))}
    </View>
  );
}

/**
 * Profile Screen Skeleton
 */
export function ProfileSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.profile, style]}>
      {/* Avatar and name */}
      <View style={styles.profileHeader}>
        <SkeletonCircle size={80} />
        <Skeleton width={150} height={24} style={{ marginTop: spacing.md }} />
        <Skeleton width={200} height={16} style={{ marginTop: spacing.xs }} />
      </View>

      {/* Stats */}
      <SkeletonStats style={{ marginVertical: spacing.xl }} />

      {/* Menu items */}
      <View style={styles.profileMenu}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.profileMenuItem}>
            <Skeleton width={24} height={24} borderRadius={radius.sm} />
            <Skeleton width="60%" height={16} style={{ marginLeft: spacing.md }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Trip Detail Screen Skeleton - Full trip detail loading state
 */
export function TripDetailSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.tripDetail, style]}>
      {/* Header */}
      <View style={styles.tripDetailHeader}>
        <View>
          <Skeleton width={140} height={28} style={{ marginBottom: spacing.sm }} />
          <Skeleton width={200} height={18} />
        </View>
        <Skeleton width={80} height={28} borderRadius={radius.full} />
      </View>

      {/* Action Card */}
      <View style={styles.tripDetailActionCard}>
        <Skeleton width={140} height={24} style={{ marginBottom: spacing.sm }} />
        <Skeleton width={180} height={16} style={{ marginBottom: spacing.lg }} />
        <Skeleton width="100%" height={52} borderRadius={radius.md} />
      </View>

      {/* Equipment Card */}
      <View style={styles.tripDetailEquipment}>
        <View style={styles.tripDetailEquipmentItem}>
          <Skeleton width={32} height={32} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Skeleton width={50} height={12} style={{ marginBottom: spacing.xs }} />
            <Skeleton width={80} height={18} />
          </View>
        </View>
        <View style={styles.tripDetailEquipmentItem}>
          <Skeleton width={32} height={32} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Skeleton width={50} height={12} style={{ marginBottom: spacing.xs }} />
            <Skeleton width={80} height={18} />
          </View>
        </View>
      </View>

      {/* Trip Info Card */}
      <View style={styles.tripDetailCard}>
        <Skeleton width={120} height={18} style={{ marginBottom: spacing.lg }} />
        <View style={styles.tripDetailGrid}>
          <View style={styles.tripDetailGridItem}>
            <Skeleton width={70} height={12} style={{ marginBottom: spacing.xs }} />
            <Skeleton width={100} height={18} />
          </View>
          <View style={styles.tripDetailGridItem}>
            <Skeleton width={60} height={12} style={{ marginBottom: spacing.xs }} />
            <Skeleton width={90} height={18} />
          </View>
        </View>
      </View>

      {/* Loads Section */}
      <View style={styles.tripDetailSection}>
        <Skeleton width={100} height={20} style={{ marginBottom: spacing.md }} />
        <LoadCardSkeleton />
        <LoadCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 400,
  },
  shimmer: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },

  // Trip Card
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tripCardRoute: {
    marginBottom: spacing.md,
  },
  tripCardLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tripCardDivider: {
    marginLeft: 6,
    paddingVertical: spacing.xs,
  },
  tripCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Load Card
  loadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  loadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadCardBody: {
    marginBottom: spacing.md,
  },
  loadCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Load Detail
  loadDetail: {
    padding: spacing.screenPadding,
  },
  loadDetailSection: {
    marginTop: spacing.xl,
  },
  loadDetailAddresses: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  loadDetailAddressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadDetailActions: {
    marginTop: spacing.xl,
  },
  loadDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  loadDetailGridItem: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Payment Card
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  paymentDetails: {
    gap: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Next Action
  nextAction: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  nextActionButton: {
    marginTop: spacing.xl,
  },

  // Home Screen
  homeScreen: {
    padding: spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Document List
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  documentContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  // Expense List
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Profile
  profile: {
    padding: spacing.screenPadding,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  profileMenu: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Trip Detail
  tripDetail: {
    padding: spacing.screenPadding,
  },
  tripDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  tripDetailActionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  tripDetailEquipment: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  tripDetailEquipmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  tripDetailGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  tripDetailGridItem: {
    flex: 1,
  },
  tripDetailSection: {
    marginBottom: spacing.lg,
  },
});

export default Skeleton;

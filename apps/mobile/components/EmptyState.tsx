/**
 * EmptyState - Delightful empty states that don't feel like errors
 *
 * Features:
 * - Beautiful illustrations for different scenarios
 * - Animated entrance
 * - Optional action button
 * - Scales responsively
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../lib/theme';
import { springs } from '../lib/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ILLUSTRATION_SIZE = Math.min(SCREEN_WIDTH * 0.5, 200);

export type IllustrationType =
  | 'no-trips'
  | 'no-documents'
  | 'no-loads'
  | 'no-expenses'
  | 'all-done'
  | 'error'
  | 'offline'
  | 'search-empty';

interface EmptyStateProps {
  illustration: IllustrationType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.illustrationContainer, compact && styles.illustrationCompact]}>
        <Illustration type={illustration} size={compact ? ILLUSTRATION_SIZE * 0.7 : ILLUSTRATION_SIZE} />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]}>
        {title}
      </Text>

      {description && (
        <Text style={[styles.description, compact && styles.descriptionCompact]}>
          {description}
        </Text>
      )}

      {action && (
        <View>
          <Pressable
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Illustration Components
interface IllustrationProps {
  type: IllustrationType;
  size: number;
}

function Illustration({ type, size }: IllustrationProps) {
  switch (type) {
    case 'no-trips':
      return <NoTripsIllustration size={size} />;
    case 'no-documents':
      return <NoDocumentsIllustration size={size} />;
    case 'no-loads':
      return <NoLoadsIllustration size={size} />;
    case 'no-expenses':
      return <NoExpensesIllustration size={size} />;
    case 'all-done':
      return <AllDoneIllustration size={size} />;
    case 'error':
      return <ErrorIllustration size={size} />;
    case 'offline':
      return <OfflineIllustration size={size} />;
    case 'search-empty':
      return <SearchEmptyIllustration size={size} />;
    default:
      return <AllDoneIllustration size={size} />;
  }
}

// No Trips - Stylized truck on empty road
function NoTripsIllustration({ size }: { size: number }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => { bounce.value = 0; };
  }, []);

  const truckStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  return (
    <View style={[styles.illustration, { width: size, height: size }]}>
      {/* Road */}
      <View style={[styles.road, { width: size * 0.9, height: size * 0.15 }]}>
        <View style={styles.roadLine} />
      </View>

      {/* Truck */}
      <Animated.View style={[styles.truck, truckStyle, { bottom: size * 0.15 }]}>
        {/* Truck body */}
        <View style={[styles.truckBody, { width: size * 0.35, height: size * 0.22 }]}>
          <View style={styles.truckWindow} />
        </View>
        {/* Truck trailer */}
        <View style={[styles.truckTrailer, { width: size * 0.3, height: size * 0.25 }]} />
        {/* Wheels */}
        <View style={[styles.wheel, styles.wheelFront]} />
        <View style={[styles.wheel, styles.wheelBack]} />
      </Animated.View>

      {/* Clouds */}
      <View style={[styles.cloud, { top: size * 0.1, left: size * 0.1 }]} />
      <View style={[styles.cloudSmall, { top: size * 0.2, right: size * 0.15 }]} />
    </View>
  );
}

// No Documents - Clean folder icon
function NoDocumentsIllustration({ size }: { size: number }) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => { float.value = 0; };
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View style={[styles.illustration, { width: size, height: size }, floatStyle]}>
      {/* Folder back */}
      <View style={[styles.folderBack, { width: size * 0.6, height: size * 0.45 }]} />
      {/* Folder tab */}
      <View style={[styles.folderTab, { width: size * 0.25, height: size * 0.08 }]} />
      {/* Folder front */}
      <View style={[styles.folderFront, { width: size * 0.6, height: size * 0.4 }]}>
        {/* Document lines */}
        <View style={styles.docLine} />
        <View style={[styles.docLine, styles.docLineShort]} />
        <View style={styles.docLine} />
      </View>
    </Animated.View>
  );
}

// No Loads - Empty box
function NoLoadsIllustration({ size }: { size: number }) {
  return (
    <View style={[styles.illustration, { width: size, height: size }]}>
      {/* Box */}
      <View style={[styles.box, { width: size * 0.5, height: size * 0.4 }]}>
        <View style={styles.boxFlap} />
        <View style={styles.boxFlapRight} />
      </View>
      {/* Sparkles */}
      <View style={[styles.sparkle, { top: size * 0.2, left: size * 0.2 }]} />
      <View style={[styles.sparkle, { top: size * 0.15, right: size * 0.25 }]} />
      <View style={[styles.sparkleSmall, { bottom: size * 0.3, left: size * 0.15 }]} />
    </View>
  );
}

// No Expenses - Wallet/receipt
function NoExpensesIllustration({ size }: { size: number }) {
  return (
    <View style={[styles.illustration, { width: size, height: size }]}>
      {/* Wallet */}
      <View style={[styles.wallet, { width: size * 0.55, height: size * 0.35 }]}>
        <View style={styles.walletClasp} />
      </View>
      {/* Receipt */}
      <View style={[styles.receipt, { width: size * 0.25, height: size * 0.35 }]}>
        <View style={styles.receiptLine} />
        <View style={[styles.receiptLine, styles.receiptLineShort]} />
        <View style={styles.receiptLine} />
        <View style={styles.receiptTotal} />
      </View>
    </View>
  );
}

// All Done - Celebration checkmark
function AllDoneIllustration({ size }: { size: number }) {
  const scale = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springs.bouncy);
    sparkleOpacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      )
    );
    return () => {
      scale.value = 0;
      sparkleOpacity.value = 0;
    };
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  return (
    <View style={[styles.illustration, { width: size, height: size }]}>
      {/* Sparkles */}
      <Animated.View style={[styles.sparkleGroup, sparkleStyle]}>
        <View style={[styles.sparkle, { top: size * 0.1, left: size * 0.15 }]} />
        <View style={[styles.sparkle, { top: size * 0.05, right: size * 0.2 }]} />
        <View style={[styles.sparkleSmall, { bottom: size * 0.15, left: size * 0.1 }]} />
        <View style={[styles.sparkleSmall, { bottom: size * 0.2, right: size * 0.1 }]} />
      </Animated.View>

      {/* Circle */}
      <Animated.View style={[styles.celebrationCircle, { width: size * 0.5, height: size * 0.5 }, checkStyle]}>
        <Text style={styles.celebrationCheck}>✓</Text>
      </Animated.View>
    </View>
  );
}

// Error - Friendly warning
function ErrorIllustration({ size }: { size: number }) {
  const wobble = useSharedValue(0);

  useEffect(() => {
    wobble.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 150 }),
        withTiming(3, { duration: 150 }),
        withTiming(-2, { duration: 150 }),
        withTiming(2, { duration: 150 }),
        withTiming(0, { duration: 150 }),
        withDelay(2000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    return () => { wobble.value = 0; };
  }, []);

  const wobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.illustration, { width: size, height: size }, wobbleStyle]}>
      {/* Warning triangle */}
      <View style={[styles.warningTriangle, {
        borderLeftWidth: size * 0.25,
        borderRightWidth: size * 0.25,
        borderBottomWidth: size * 0.45
      }]} />
      <View style={[styles.warningInner, {
        borderLeftWidth: size * 0.2,
        borderRightWidth: size * 0.2,
        borderBottomWidth: size * 0.36
      }]} />
      <Text style={[styles.warningMark, { fontSize: size * 0.18 }]}>!</Text>
    </Animated.View>
  );
}

// Offline - Cloud with slash
function OfflineIllustration({ size }: { size: number }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    return () => { pulse.value = 1; };
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.illustration, { width: size, height: size }, pulseStyle]}>
      {/* Cloud */}
      <View style={[styles.offlineCloud, { width: size * 0.55, height: size * 0.3 }]}>
        <View style={[styles.cloudBubble, styles.cloudBubbleLeft]} />
        <View style={[styles.cloudBubble, styles.cloudBubbleRight]} />
      </View>
      {/* Slash */}
      <View style={[styles.offlineSlash, { width: size * 0.5, height: 4 }]} />
    </Animated.View>
  );
}

// Search Empty - Magnifying glass with question
function SearchEmptyIllustration({ size }: { size: number }) {
  return (
    <View style={[styles.illustration, { width: size, height: size }]}>
      {/* Magnifying glass */}
      <View style={[styles.searchCircle, { width: size * 0.4, height: size * 0.4 }]}>
        <Text style={styles.searchQuestion}>?</Text>
      </View>
      <View style={[styles.searchHandle, { width: size * 0.15, height: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  containerCompact: {
    paddingVertical: spacing.xl,
  },
  illustrationContainer: {
    marginBottom: spacing.xl,
  },
  illustrationCompact: {
    marginBottom: spacing.lg,
  },
  illustration: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.headline,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleCompact: {
    fontSize: 18,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  descriptionCompact: {
    fontSize: 14,
  },
  actionButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.white,
  },

  // No Trips styles
  road: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadLine: {
    width: '80%',
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  truck: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  truckBody: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    marginRight: -4,
  },
  truckWindow: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: '40%',
    height: '35%',
    backgroundColor: colors.info,
    borderRadius: 3,
  },
  truckTrailer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  wheel: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    bottom: -8,
  },
  wheelFront: {
    left: 8,
  },
  wheelBack: {
    right: 8,
  },
  cloud: {
    position: 'absolute',
    width: 40,
    height: 20,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
  },
  cloudSmall: {
    position: 'absolute',
    width: 30,
    height: 15,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
  },

  // No Documents styles
  folderBack: {
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    position: 'absolute',
  },
  folderTab: {
    position: 'absolute',
    top: '18%',
    left: '20%',
    backgroundColor: colors.warning,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  folderFront: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    position: 'absolute',
    bottom: '20%',
    padding: spacing.md,
    justifyContent: 'center',
  },
  docLine: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.xs,
    width: '80%',
  },
  docLineShort: {
    width: '50%',
  },

  // Box styles
  box: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  boxFlap: {
    position: 'absolute',
    top: -12,
    left: '15%',
    width: '35%',
    height: 12,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.border,
    transform: [{ rotate: '-15deg' }],
  },
  boxFlapRight: {
    position: 'absolute',
    top: -12,
    right: '15%',
    width: '35%',
    height: 12,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.border,
    transform: [{ rotate: '15deg' }],
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: colors.warning,
    borderRadius: 4,
  },
  sparkleSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sparkleGroup: {
    ...StyleSheet.absoluteFillObject,
  },

  // Wallet styles
  wallet: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    position: 'absolute',
    left: '15%',
  },
  walletClasp: {
    position: 'absolute',
    top: '30%',
    right: -8,
    width: 16,
    height: 24,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
  },
  receipt: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    position: 'absolute',
    right: '15%',
    top: '25%',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptLine: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    marginBottom: 4,
    width: '100%',
  },
  receiptLineShort: {
    width: '60%',
  },
  receiptTotal: {
    height: 4,
    backgroundColor: colors.success,
    borderRadius: 2,
    marginTop: 4,
    width: '80%',
  },

  // Celebration styles
  celebrationCircle: {
    backgroundColor: colors.success,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  celebrationCheck: {
    fontSize: 48,
    color: colors.white,
    fontWeight: '700',
  },

  // Warning styles
  warningTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.warning,
    position: 'absolute',
  },
  warningInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.background,
    position: 'absolute',
    top: '18%',
  },
  warningMark: {
    color: colors.warning,
    fontWeight: '700',
    position: 'absolute',
    top: '45%',
  },

  // Offline styles
  offlineCloud: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    position: 'relative',
  },
  cloudBubble: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 15,
    top: -15,
  },
  cloudBubbleLeft: {
    left: '20%',
  },
  cloudBubbleRight: {
    right: '20%',
  },
  offlineSlash: {
    backgroundColor: colors.error,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 2,
  },

  // Search styles
  searchCircle: {
    borderWidth: 4,
    borderColor: colors.textSecondary,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchQuestion: {
    fontSize: 32,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  searchHandle: {
    backgroundColor: colors.textSecondary,
    borderRadius: 4,
    position: 'absolute',
    bottom: '22%',
    right: '22%',
    transform: [{ rotate: '45deg' }],
  },
});

export default EmptyState;

/**
 * Premium UI Components
 *
 * A collection of $1B app-quality components with animations and haptics.
 *
 * Usage:
 * import { PremiumButton, PremiumCard, useToast } from '@/components/ui';
 */

// Core Components
export { PremiumButton } from './PremiumButton';
export type { ButtonVariant, ButtonSize } from './PremiumButton';

export { PremiumCard } from './PremiumCard';
export type { CardVariant } from './PremiumCard';

export { PremiumInput } from './PremiumInput';

export { PremiumBadge, LiveBadge, NewBadge } from './PremiumBadge';
export type { BadgeVariant, BadgeSize } from './PremiumBadge';

export { BottomSheet } from './BottomSheet';
export type { BottomSheetRef } from './BottomSheet';

export { ToastProvider, useToast } from './Toast';
export type { ToastVariant } from './Toast';

// Icon System
export {
  Icon,
  IconWithBackground,
  StatusIcon,
  ActionIcon,
  emojiToIcon,
} from './Icon';
export type { IconName, IconSize, IconProps, StatusType as IconStatusType } from './Icon';

// Animation Components
export { AnimatedListItem, AnimatedItem, useAnimatedListItem } from './AnimatedListItem';
export {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonStats,
  SkeletonButton,
  TripCardSkeleton,
  LoadCardSkeleton,
  LoadDetailSkeleton,
  PaymentCardSkeleton,
  NextActionSkeleton,
  HomeScreenSkeleton,
  DocumentListSkeleton,
  ExpenseListSkeleton,
  ProfileSkeleton,
  TripDetailSkeleton,
} from './Skeleton';
export { StatusGlow, useStatusGlow, SuccessGlow } from './StatusGlow';
export type { StatusType } from './StatusGlow';

// Action Components
export { SwipeableActionCard } from './SwipeableActionCard';
export { NextActionCard } from './NextActionCard';
export { QuickStats } from './QuickStats';
export { ErrorState } from './ErrorState';
export { LoadingState } from './LoadingState';

// Full-screen Experiences
export { SuccessCelebration } from './SuccessCelebration';
export { TripStartScreen } from './TripStartScreen';
export { DeliveryCompleteScreen } from './DeliveryCompleteScreen';

// Empty States
export { EmptyState } from '../EmptyState';
export type { IllustrationType } from '../EmptyState';

// Screen Utilities
export { ScreenContainer } from './ScreenContainer';
export { ErrorBoundary } from './ErrorBoundary';

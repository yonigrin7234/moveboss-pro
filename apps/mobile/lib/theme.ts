/**
 * MoveBoss Premium Design System
 *
 * A $1B app-quality design system inspired by Uber, Cash App, and Linear.
 * Dark mode first, premium feel, accessible contrasts.
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Backgrounds with depth (darkest to lightest)
  background: '#0A0A0F',           // Near black - main app background
  surface: '#12121A',              // Cards, modals
  surfaceElevated: '#1A1A24',      // Elevated cards, popovers
  surfacePressed: '#22222E',       // Pressed/active state

  // Premium accent - Teal Blue (signature color, matches web app)
  primary: '#4F9CF9',              // Main accent
  primaryHover: '#6FB2FA',         // Lighter for hover/focus
  primaryMuted: '#3D8CE8',         // Darker variant
  primaryGlow: 'rgba(79, 156, 249, 0.15)',  // Glow/highlight effect
  primarySoft: 'rgba(79, 156, 249, 0.1)',   // Subtle backgrounds

  // Text hierarchy (all pass WCAG AA on background)
  textPrimary: '#FFFFFF',          // 21:1 contrast
  textSecondary: '#A1A1AA',        // 7.5:1 contrast - zinc-400
  textMuted: '#71717A',            // 4.6:1 contrast - zinc-500
  textInverse: '#0A0A0F',          // For light backgrounds

  // Status colors (muted versions for backgrounds)
  success: '#22C55E',              // Green-500
  successMuted: 'rgba(34, 197, 94, 0.15)',
  successSoft: 'rgba(34, 197, 94, 0.1)',

  warning: '#F59E0B',              // Amber-500
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  warningSoft: 'rgba(245, 158, 11, 0.1)',

  error: '#EF4444',                // Red-500
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  errorSoft: 'rgba(239, 68, 68, 0.1)',

  info: '#3B82F6',                 // Blue-500
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  infoSoft: 'rgba(59, 130, 246, 0.1)',

  // Borders (subtle, sophisticated)
  border: '#27272A',               // Default border - zinc-800
  borderLight: '#3F3F46',          // Slightly visible - zinc-700
  borderFocused: '#4F9CF9',        // Focus ring

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',

  // Semantic aliases
  cardBackground: '#12121A',
  inputBackground: '#1A1A24',
  buttonBackground: '#4F9CF9',

  // Legacy compatibility (for gradual migration)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  // Display - for hero sections, large numbers
  hero: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },

  // Title - screen titles, section headers
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },

  // Headline - card titles, important text
  headline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },

  // Subheadline - secondary titles
  subheadline: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
    color: colors.textPrimary,
  },

  // Body - main content text
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: colors.textPrimary,
  },

  // Body Small - dense content
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: colors.textPrimary,
  },

  // Caption - supporting text, timestamps
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
    color: colors.textSecondary,
  },

  // Label - form labels, tags, badges
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: colors.textSecondary,
  },

  // Button text
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.white,
  },

  // Button small
  buttonSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.white,
  },

  // Tab bar labels
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },

  // Large numbers (earnings, stats)
  numeric: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },

  // Extra large numbers
  numericLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
} as const;

// =============================================================================
// SPACING (8pt grid system)
// =============================================================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  // Semantic spacing
  screenPadding: 20,
  cardPadding: 16,
  cardPaddingLarge: 20,
  sectionGap: 24,
  itemGap: 12,
  inputPadding: 16,
} as const;

// =============================================================================
// SHADOWS (subtle depth for dark mode)
// =============================================================================

export const shadows = {
  // Small - for buttons, small cards
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // Medium - for cards, modals
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // Large - for elevated modals, dropdowns
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  // Glow effect - for primary buttons, active states
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },

  // Success glow
  glowSuccess: {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // Error glow
  glowError: {
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // None
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,   // Pill/circle

  // Semantic radius
  button: 12,
  buttonSmall: 8,
  card: 16,
  input: 12,
  badge: 8,
  avatar: 9999,
  modal: 24,
} as const;

// =============================================================================
// ANIMATION (for consistency)
// =============================================================================

export const animation = {
  // Durations (ms)
  fast: 150,
  normal: 250,
  slow: 400,

  // Easing curves (for react-native-reanimated)
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
  easeInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
  spring: { damping: 15, stiffness: 150 },
} as const;

// =============================================================================
// COMPONENT PRESETS (common patterns)
// =============================================================================

export const presets = {
  // Card styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardElevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    ...shadows.md,
  },

  cardPressed: {
    backgroundColor: colors.surfacePressed,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
  },

  // Input styles
  input: {
    ...typography.body,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    padding: spacing.inputPadding,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },

  inputFocused: {
    ...typography.body,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    padding: spacing.inputPadding,
    borderWidth: 2,
    borderColor: colors.borderFocused,
    color: colors.textPrimary,
  },

  // Button styles
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.glow,
  },

  buttonSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },

  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },

  // Screen container
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Scroll content
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxxl,
  },

  // Status badge base
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.badge,
  },
} as const;

// =============================================================================
// STATUS COLORS (for badges, indicators)
// =============================================================================

export const statusColors = {
  // Trip statuses
  planned: { bg: colors.infoSoft, text: colors.info, border: colors.info },
  active: { bg: colors.primarySoft, text: colors.primary, border: colors.primary },
  en_route: { bg: colors.primarySoft, text: colors.primary, border: colors.primary },
  completed: { bg: colors.successSoft, text: colors.success, border: colors.success },
  settled: { bg: colors.successSoft, text: colors.success, border: colors.success },
  cancelled: { bg: colors.errorSoft, text: colors.error, border: colors.error },

  // Load statuses
  pending: { bg: colors.warningSoft, text: colors.warning, border: colors.warning },
  accepted: { bg: colors.infoSoft, text: colors.info, border: colors.info },
  loading: { bg: colors.primarySoft, text: colors.primary, border: colors.primary },
  loaded: { bg: colors.primarySoft, text: colors.primaryHover, border: colors.primaryHover },
  in_transit: { bg: colors.primarySoft, text: colors.primary, border: colors.primary },
  delivered: { bg: colors.successSoft, text: colors.success, border: colors.success },

  // Document statuses
  valid: { bg: colors.successSoft, text: colors.success, border: colors.success },
  expiring: { bg: colors.warningSoft, text: colors.warning, border: colors.warning },
  expired: { bg: colors.errorSoft, text: colors.error, border: colors.error },
  missing: { bg: colors.errorSoft, text: colors.textMuted, border: colors.border },
} as const;

// =============================================================================
// THEME OBJECT (combined export)
// =============================================================================

export const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  shadows,
  radius,
  animation,
  presets,
  statusColors,
} as const;

// Type exports for TypeScript
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Shadows = typeof shadows;
export type Radius = typeof radius;
export type Theme = typeof theme;

export default theme;

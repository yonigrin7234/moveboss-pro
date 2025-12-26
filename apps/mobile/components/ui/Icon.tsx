/**
 * Premium Icon System
 *
 * Consistent, accessible icons using lucide-react-native.
 * Replaces emoji icons with a professional icon set.
 *
 * Usage:
 * import { Icon, StatusIcon, IconName } from '@/components/ui/Icon';
 *
 * <Icon name="truck" size="lg" />
 * <StatusIcon status="success" />
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Truck,
  Package,
  DollarSign,
  Banknote,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Camera,
  Home,
  BarChart3,
  Clock,
  Phone,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Plus,
  PlusCircle,
  Minus,
  X,
  Check,
  Search,
  Settings,
  User,
  Users,
  UserX,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  Upload,
  Download,
  Image,
  Trash2,
  Edit3,
  Copy,
  Share2,
  ExternalLink,
  Link,
  RefreshCw,
  RotateCcw,
  LogOut,
  LogIn,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Star,
  Heart,
  Flag,
  Bookmark,
  Tag,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  MoreVertical,
  Menu,
  Grid,
  List,
  Map,
  Navigation,
  Compass,
  Target,
  Crosshair,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  PieChart,
  CreditCard,
  Wallet,
  Receipt,
  ShoppingCart,
  Gift,
  Award,
  Trophy,
  Medal,
  Sparkles,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wifi,
  WifiOff,
  Bluetooth,
  Battery,
  BatteryCharging,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Box,
  Layers,
  Layout,
  Folder,
  FolderOpen,
  File,
  FileCheck,
  FilePlus,
  FileX,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  Archive,
  Inbox,
  AlertCircle,
  Info,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Key,
  Fingerprint,
  QrCode,
  Scan,
  Rocket,
  Route,
  Building2,
  Fuel,
  Wrench,
  Briefcase,
  Globe,
  Headphones,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../lib/theme';

// =============================================================================
// ICON NAME MAPPING
// =============================================================================

const iconMap = {
  // Transportation & Logistics
  truck: Truck,
  package: Package,
  box: Box,
  layers: Layers,
  rocket: Rocket,
  route: Route,

  // Money & Payments
  dollar: DollarSign,
  banknote: Banknote,
  'credit-card': CreditCard,
  wallet: Wallet,
  receipt: Receipt,
  fuel: Fuel,
  briefcase: Briefcase,

  // Documents
  'file-text': FileText,
  file: File,
  'file-check': FileCheck,
  'file-plus': FilePlus,
  'file-x': FileX,
  folder: Folder,
  'folder-open': FolderOpen,
  clipboard: Clipboard,
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  archive: Archive,
  inbox: Inbox,

  // Status & Alerts
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  info: Info,
  'help-circle': HelpCircle,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,

  // Location & Navigation
  'map-pin': MapPin,
  map: Map,
  navigation: Navigation,
  compass: Compass,
  target: Target,
  crosshair: Crosshair,

  // Media & Actions
  camera: Camera,
  image: Image,
  scan: Scan,
  'qr-code': QrCode,

  // UI Elements
  home: Home,
  'bar-chart': BarChart3,
  'pie-chart': PieChart,
  activity: Activity,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  zap: Zap,

  // Time & Calendar
  clock: Clock,
  calendar: Calendar,

  // Communication
  phone: Phone,
  mail: Mail,
  'message-square': MessageSquare,
  'message-circle': MessageCircle,
  send: Send,
  bell: Bell,
  'bell-off': BellOff,

  // Navigation Arrows
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,

  // Actions
  plus: Plus,
  'plus-circle': PlusCircle,
  minus: Minus,
  x: X,
  check: Check,
  search: Search,
  settings: Settings,
  edit: Edit3,
  trash: Trash2,
  copy: Copy,
  share: Share2,
  'external-link': ExternalLink,
  link: Link,
  refresh: RefreshCw,
  undo: RotateCcw,
  upload: Upload,
  download: Download,
  filter: Filter,
  sliders: SlidersHorizontal,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  menu: Menu,
  grid: Grid,
  list: List,
  layout: Layout,

  // User & Auth
  user: User,
  users: Users,
  'user-x': UserX,
  'log-out': LogOut,
  'log-in': LogIn,
  eye: Eye,
  'eye-off': EyeOff,
  lock: Lock,
  unlock: Unlock,
  key: Key,
  fingerprint: Fingerprint,

  // Favorites & Ratings
  star: Star,
  heart: Heart,
  flag: Flag,
  bookmark: Bookmark,
  tag: Tag,
  award: Award,
  trophy: Trophy,
  medal: Medal,
  sparkles: Sparkles,
  gift: Gift,

  // Shopping
  cart: ShoppingCart,

  // Environment
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  'cloud-rain': CloudRain,

  // Connectivity
  wifi: Wifi,
  'wifi-off': WifiOff,
  bluetooth: Bluetooth,
  battery: Battery,
  'battery-charging': BatteryCharging,

  // Media Controls
  volume: Volume2,
  'volume-off': VolumeX,
  play: Play,
  pause: Pause,

  // Shapes
  square: Square,
  circle: Circle,
  triangle: Triangle,
  hexagon: Hexagon,

  // Buildings
  building: Building2,

  // Tools & Maintenance
  tool: Wrench,
  wrench: Wrench,

  // Communication & Support
  globe: Globe,
  headphones: Headphones,
} as const;

export type IconName = keyof typeof iconMap;

// =============================================================================
// SIZE PRESETS
// =============================================================================

const sizePresets = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export type IconSize = keyof typeof sizePresets | number;

// =============================================================================
// ICON COMPONENT
// =============================================================================

export interface IconProps {
  /** Icon name from the icon map */
  name: IconName;
  /** Size preset or custom number */
  size?: IconSize;
  /** Icon color - defaults to textSecondary */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Additional styles for the icon */
  style?: ViewStyle;
}

export function Icon({
  name,
  size = 'md',
  color = colors.textSecondary,
  strokeWidth = 2,
  accessibilityLabel,
  style,
}: IconProps) {
  const IconComponent = iconMap[name];
  const iconSize = typeof size === 'number' ? size : sizePresets[size];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return (
    <View
      style={style}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || name}
    >
      <IconComponent
        size={iconSize}
        color={color}
        strokeWidth={strokeWidth}
      />
    </View>
  );
}

// =============================================================================
// ICON WITH BACKGROUND
// =============================================================================

export interface IconWithBackgroundProps extends IconProps {
  /** Background color */
  backgroundColor?: string;
  /** Background size multiplier (default 1.8) */
  backgroundSizeMultiplier?: number;
  /** Border radius - 'full' for circle, number for custom */
  borderRadius?: 'full' | number;
}

export function IconWithBackground({
  name,
  size = 'md',
  color = colors.textPrimary,
  strokeWidth = 2,
  backgroundColor = colors.surfaceElevated,
  backgroundSizeMultiplier = 1.8,
  borderRadius = 'full',
  accessibilityLabel,
  style,
}: IconWithBackgroundProps) {
  const iconSize = typeof size === 'number' ? size : sizePresets[size];
  const bgSize = iconSize * backgroundSizeMultiplier;
  const radius = borderRadius === 'full' ? bgSize / 2 : borderRadius;

  return (
    <View
      style={[
        styles.iconBackground,
        {
          width: bgSize,
          height: bgSize,
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || name}
    >
      <Icon
        name={name}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
      />
    </View>
  );
}

// =============================================================================
// STATUS ICON COMPONENT
// =============================================================================

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const statusConfig: Record<StatusType, { icon: IconName; color: string; bgColor: string }> = {
  success: {
    icon: 'check-circle',
    color: colors.success,
    bgColor: colors.successSoft,
  },
  warning: {
    icon: 'alert-triangle',
    color: colors.warning,
    bgColor: colors.warningSoft,
  },
  error: {
    icon: 'x-circle',
    color: colors.error,
    bgColor: colors.errorSoft,
  },
  info: {
    icon: 'info',
    color: colors.primary,
    bgColor: colors.primarySoft,
  },
  neutral: {
    icon: 'circle',
    color: colors.textMuted,
    bgColor: colors.surfaceElevated,
  },
};

export interface StatusIconProps {
  /** Status type determines icon and colors */
  status: StatusType;
  /** Size preset or custom number */
  size?: IconSize;
  /** Show background circle */
  showBackground?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

export function StatusIcon({
  status,
  size = 'md',
  showBackground = true,
  style,
}: StatusIconProps) {
  const config = statusConfig[status];
  const iconSize = typeof size === 'number' ? size : sizePresets[size];

  if (showBackground) {
    return (
      <IconWithBackground
        name={config.icon}
        size={size}
        color={config.color}
        backgroundColor={config.bgColor}
        style={style}
        accessibilityLabel={`${status} status`}
      />
    );
  }

  return (
    <Icon
      name={config.icon}
      size={size}
      color={config.color}
      style={style}
      accessibilityLabel={`${status} status`}
    />
  );
}

// =============================================================================
// ACTION ICON BUTTON
// =============================================================================

export interface ActionIconProps {
  /** Icon name */
  name: IconName;
  /** Size preset */
  size?: IconSize;
  /** Icon color */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

export function ActionIcon({
  name,
  size = 'md',
  color = colors.textSecondary,
  disabled = false,
  style,
}: ActionIconProps) {
  const iconSize = typeof size === 'number' ? size : sizePresets[size];
  const touchableSize = iconSize * 1.8;

  return (
    <View
      style={[
        styles.actionIcon,
        {
          width: touchableSize,
          height: touchableSize,
          borderRadius: touchableSize / 2,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

// =============================================================================
// EMOJI TO ICON MAPPING (for gradual migration)
// =============================================================================

export const emojiToIcon: Record<string, IconName> = {
  '🚚': 'truck',
  '🚀': 'rocket',
  '📦': 'package',
  '💰': 'dollar',
  '💵': 'banknote',
  '📄': 'file-text',
  '⚠️': 'alert-triangle',
  '✅': 'check-circle',
  '❌': 'x-circle',
  '📍': 'map-pin',
  '📸': 'camera',
  '🏠': 'home',
  '📊': 'bar-chart',
  '⏰': 'clock',
  '📞': 'phone',
  '🗓️': 'calendar',
  '📋': 'clipboard-list',
  '🔔': 'bell',
  '⚙️': 'settings',
  '👤': 'user',
  '🔒': 'lock',
  '🔑': 'key',
  '➡️': 'arrow-right',
  '⬅️': 'arrow-left',
  '✏️': 'edit',
  '🗑️': 'trash',
  '🔍': 'search',
  '📱': 'phone',
  '📧': 'mail',
  '⭐': 'star',
  '❤️': 'heart',
  '🎉': 'sparkles',
  '🏆': 'trophy',
  '🎁': 'gift',
  '💳': 'credit-card',
  '🧾': 'receipt',
  '📤': 'upload',
  '📥': 'download',
  '🔄': 'refresh',
  '➕': 'plus',
  '➖': 'minus',
  '✖️': 'x',
  '✔️': 'check',
  '🏦': 'banknote',
  '✍️': 'edit',
  '🔗': 'link',
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  iconBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;

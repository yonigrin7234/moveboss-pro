/**
 * RFD (Ready For Delivery) Urgency Calculation Utilities
 *
 * Provides functions for calculating urgency levels based on RFD dates
 * and delivery deadlines. Used for dashboard displays and load tracking.
 */

import { getDaysUntil, getBusinessDaysUntil } from './business-days';

/**
 * Urgency levels for RFD tracking
 */
export type RFDUrgencyLevel = 'critical' | 'urgent' | 'approaching' | 'normal' | 'tbd';

/**
 * Complete urgency information for a load
 */
export interface RFDUrgencyInfo {
  /** Urgency level classification */
  level: RFDUrgencyLevel;
  /** Human-readable label for the urgency level */
  label: string;
  /** Calendar days until RFD date (negative if overdue) */
  daysUntilRfd: number | null;
  /** Business days until RFD date */
  businessDaysUntilRfd: number | null;
  /** Calendar days until delivery deadline */
  daysUntilDeadline: number | null;
  /** Whether the RFD date has passed */
  isOverdue: boolean;
  /** Whether the delivery deadline has passed */
  isDeadlineOverdue: boolean;
  /** CSS class for styling */
  colorClass: string;
  /** Badge variant for UI components */
  badgeVariant: 'destructive' | 'warning' | 'secondary' | 'outline' | 'default';
}

/**
 * Urgency level configuration
 */
const URGENCY_CONFIG = {
  critical: {
    label: 'Critical',
    colorClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    badgeVariant: 'destructive' as const,
  },
  urgent: {
    label: 'Urgent',
    colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    badgeVariant: 'warning' as const,
  },
  approaching: {
    label: 'Approaching',
    colorClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    badgeVariant: 'secondary' as const,
  },
  normal: {
    label: 'On Track',
    colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    badgeVariant: 'outline' as const,
  },
  tbd: {
    label: 'TBD',
    colorClass: 'bg-muted text-muted-foreground',
    badgeVariant: 'default' as const,
  },
};

/**
 * Thresholds for urgency levels (in calendar days)
 */
const URGENCY_THRESHOLDS = {
  critical: 1, // Same day or overdue
  urgent: 2, // Within 48 hours (2 days)
  approaching: 7, // Within 7 days
};

/**
 * Calculate urgency level based on days until RFD
 */
function getUrgencyLevel(
  daysUntil: number | null,
  isTbd: boolean,
  isAssignedToTrip: boolean
): RFDUrgencyLevel {
  // TBD loads have special handling
  if (isTbd) {
    return 'tbd';
  }

  // If no RFD date, treat as TBD
  if (daysUntil === null) {
    return 'tbd';
  }

  // If assigned to a trip, show as normal (less urgent since it's being handled)
  if (isAssignedToTrip && daysUntil > URGENCY_THRESHOLDS.critical) {
    return 'normal';
  }

  // Overdue or same day
  if (daysUntil <= URGENCY_THRESHOLDS.critical) {
    return 'critical';
  }

  // Within 48 hours
  if (daysUntil <= URGENCY_THRESHOLDS.urgent) {
    return 'urgent';
  }

  // Within 7 days
  if (daysUntil <= URGENCY_THRESHOLDS.approaching) {
    return 'approaching';
  }

  return 'normal';
}

/**
 * Calculate complete RFD urgency information for a load
 *
 * @param load - Load object with RFD fields
 * @returns Complete urgency information
 */
export function calculateRFDUrgency(load: {
  rfd_date: string | null;
  rfd_date_tbd?: boolean | null;
  rfd_delivery_deadline?: string | null;
  trip_id?: string | null;
}): RFDUrgencyInfo {
  const isTbd = load.rfd_date_tbd ?? false;
  const isAssignedToTrip = !!load.trip_id;

  // Calculate days until RFD
  let daysUntilRfd: number | null = null;
  let businessDaysUntilRfd: number | null = null;
  let isOverdue = false;

  if (load.rfd_date && !isTbd) {
    daysUntilRfd = getDaysUntil(load.rfd_date);
    businessDaysUntilRfd = getBusinessDaysUntil(load.rfd_date);
    isOverdue = daysUntilRfd < 0;
  }

  // Calculate days until delivery deadline
  let daysUntilDeadline: number | null = null;
  let isDeadlineOverdue = false;

  if (load.rfd_delivery_deadline) {
    daysUntilDeadline = getDaysUntil(load.rfd_delivery_deadline);
    isDeadlineOverdue = daysUntilDeadline < 0;
  }

  // Determine urgency level
  const level = getUrgencyLevel(daysUntilRfd, isTbd, isAssignedToTrip);
  const config = URGENCY_CONFIG[level];

  return {
    level,
    label: config.label,
    daysUntilRfd,
    businessDaysUntilRfd,
    daysUntilDeadline,
    isOverdue,
    isDeadlineOverdue,
    colorClass: config.colorClass,
    badgeVariant: config.badgeVariant,
  };
}

/**
 * Get a human-readable description of the urgency
 */
export function getUrgencyDescription(urgency: RFDUrgencyInfo): string {
  if (urgency.level === 'tbd') {
    return 'RFD date not set';
  }

  if (urgency.isOverdue) {
    const daysOverdue = Math.abs(urgency.daysUntilRfd!);
    return daysOverdue === 1 ? 'RFD was yesterday' : `RFD was ${daysOverdue} days ago`;
  }

  if (urgency.daysUntilRfd === 0) {
    return 'RFD is today';
  }

  if (urgency.daysUntilRfd === 1) {
    return 'RFD is tomorrow';
  }

  return `RFD in ${urgency.daysUntilRfd} days`;
}

/**
 * Get a short label for the urgency (for badges)
 */
export function getUrgencyBadgeLabel(urgency: RFDUrgencyInfo): string {
  if (urgency.level === 'tbd') {
    return 'TBD';
  }

  if (urgency.isOverdue) {
    const daysOverdue = Math.abs(urgency.daysUntilRfd!);
    return `${daysOverdue}d overdue`;
  }

  if (urgency.daysUntilRfd === 0) {
    return 'Today';
  }

  if (urgency.daysUntilRfd === 1) {
    return 'Tomorrow';
  }

  return `${urgency.daysUntilRfd}d`;
}

/**
 * Sort function for loads by RFD urgency (most urgent first)
 */
export function sortByRFDUrgency<T extends { rfd_date: string | null; rfd_date_tbd?: boolean | null }>(
  loads: T[]
): T[] {
  return [...loads].sort((a, b) => {
    const urgencyA = calculateRFDUrgency(a);
    const urgencyB = calculateRFDUrgency(b);

    // TBD loads go to the end
    if (urgencyA.level === 'tbd' && urgencyB.level !== 'tbd') return 1;
    if (urgencyB.level === 'tbd' && urgencyA.level !== 'tbd') return -1;
    if (urgencyA.level === 'tbd' && urgencyB.level === 'tbd') return 0;

    // Sort by days until RFD (overdue first, then soonest)
    const daysA = urgencyA.daysUntilRfd ?? Infinity;
    const daysB = urgencyB.daysUntilRfd ?? Infinity;

    return daysA - daysB;
  });
}

/**
 * Filter loads by urgency level
 */
export function filterByUrgencyLevel<T extends { rfd_date: string | null; rfd_date_tbd?: boolean | null }>(
  loads: T[],
  levels: RFDUrgencyLevel[]
): T[] {
  return loads.filter((load) => {
    const urgency = calculateRFDUrgency(load);
    return levels.includes(urgency.level);
  });
}

/**
 * Count loads by urgency level
 */
export function countByUrgencyLevel(
  loads: Array<{ rfd_date: string | null; rfd_date_tbd?: boolean | null }>
): Record<RFDUrgencyLevel, number> {
  const counts: Record<RFDUrgencyLevel, number> = {
    critical: 0,
    urgent: 0,
    approaching: 0,
    normal: 0,
    tbd: 0,
  };

  for (const load of loads) {
    const urgency = calculateRFDUrgency(load);
    counts[urgency.level]++;
  }

  return counts;
}

/**
 * Get loads that need attention (critical, urgent, or approaching)
 */
export function getLoadsNeedingAttention<T extends { rfd_date: string | null; rfd_date_tbd?: boolean | null; trip_id?: string | null }>(
  loads: T[]
): T[] {
  return loads.filter((load) => {
    // Skip loads already assigned to a trip
    if (load.trip_id) return false;

    const urgency = calculateRFDUrgency(load);
    return ['critical', 'urgent', 'approaching'].includes(urgency.level);
  });
}

/**
 * Pickup Window Formatter
 *
 * Formats pickup dates and windows consistently across all sharing.
 */

export interface PickupDateFields {
  pickup_date?: string | null;
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
  pickup_date_start?: string | null;
  pickup_date_end?: string | null;
  first_available_date?: string | null;
  rfd_date?: string | null;
}

/**
 * Formats a single date
 */
function formatSingleDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  // Include year only if different from current year
  if (dateYear !== currentYear) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Checks if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formats a date range
 * Returns: "Dec 5" (single) | "Dec 5–7" (same month) | "Dec 5 – Jan 2" (different months)
 */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isSameDay(startDate, endDate)) {
    return formatSingleDate(start);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // If same month, use compact format: "Dec 5–7"
  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    const month = startDate.toLocaleDateString('en-US', { month: 'short' });
    const yearPart = startYear !== currentYear ? ` ${startYear}` : '';
    return `${month} ${startDate.getDate()}–${endDate.getDate()}${yearPart}`;
  }

  // Different months
  const startStr = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const endStr = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(endYear !== currentYear ? { year: 'numeric' } : {}),
  });

  return `${startStr} – ${endStr}`;
}

/**
 * Formats the pickup window/date for sharing messages
 * Returns empty string if no date info available
 */
export function formatPickupWindow(load: PickupDateFields): string {
  // Priority order for date sources
  const start =
    load.pickup_window_start ||
    load.pickup_date_start ||
    load.pickup_date ||
    load.first_available_date ||
    load.rfd_date;

  const end = load.pickup_window_end || load.pickup_date_end;

  if (!start) {
    return '';
  }

  if (end && start !== end) {
    return formatDateRange(start, end);
  }

  return formatSingleDate(start);
}

/**
 * Formats pickup window with a label prefix
 * Returns: "Pickup: Dec 5–7" or empty string
 */
export function formatPickupLine(load: PickupDateFields): string {
  const window = formatPickupWindow(load);
  if (!window) return '';
  return `📅 Pickup: ${window}`;
}

/**
 * Generic date formatter for display purposes
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'TBD';
  return formatSingleDate(dateString);
}

/**
 * Generic date range formatter for display purposes
 */
export function formatDateRangeDisplay(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start && !end) return 'TBD';

  if (start && end && start !== end) {
    return formatDateRange(start, end);
  }

  return formatDate(start || end);
}

/**
 * Business Day Calculation Utilities
 *
 * Provides functions for calculating business days, excluding weekends
 * and US federal holidays. Used for RFD delivery deadline calculations.
 *
 * Ported from web: apps/web/src/lib/business-days.ts
 */

/**
 * Get the Nth weekday of a month (e.g., 3rd Monday of January)
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  // Calculate how many days until the first occurrence of the target weekday
  let daysUntilFirst = weekday - firstWeekday;
  if (daysUntilFirst < 0) daysUntilFirst += 7;

  // Add (n-1) weeks to get to the Nth occurrence
  const day = 1 + daysUntilFirst + (n - 1) * 7;

  return new Date(year, month, day);
}

/**
 * Get the last weekday of a month (e.g., last Monday of May)
 */
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  // Start from the last day of the month
  const lastDay = new Date(year, month + 1, 0);
  const lastWeekday = lastDay.getDay();

  // Calculate how many days to go back to reach the target weekday
  let daysBack = lastWeekday - weekday;
  if (daysBack < 0) daysBack += 7;

  return new Date(year, month + 1, -daysBack);
}

/**
 * Get the 4th Thursday of November (Thanksgiving)
 */
function getThanksgiving(year: number): Date {
  return getNthWeekdayOfMonth(year, 10, 4, 4); // November (10), Thursday (4), 4th occurrence
}

/**
 * Get observed date for a holiday (Sat→Fri, Sun→Mon)
 */
function getObservedDate(date: Date): Date {
  const day = date.getDay();
  if (day === 6) {
    // Saturday - observe on Friday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  } else if (day === 0) {
    // Sunday - observe on Monday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  return date;
}

/**
 * Get all US federal holidays for a given year
 * Returns observed dates (adjusted for weekends)
 */
export function getUSFederalHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // New Year's Day - January 1
  holidays.push(getObservedDate(new Date(year, 0, 1)));

  // Martin Luther King Jr. Day - 3rd Monday in January
  holidays.push(getNthWeekdayOfMonth(year, 0, 1, 3));

  // Presidents' Day - 3rd Monday in February
  holidays.push(getNthWeekdayOfMonth(year, 1, 1, 3));

  // Memorial Day - Last Monday in May
  holidays.push(getLastWeekdayOfMonth(year, 4, 1));

  // Juneteenth - June 19
  holidays.push(getObservedDate(new Date(year, 5, 19)));

  // Independence Day - July 4
  holidays.push(getObservedDate(new Date(year, 6, 4)));

  // Labor Day - 1st Monday in September
  holidays.push(getNthWeekdayOfMonth(year, 8, 1, 1));

  // Columbus Day - 2nd Monday in October
  holidays.push(getNthWeekdayOfMonth(year, 9, 1, 2));

  // Veterans Day - November 11
  holidays.push(getObservedDate(new Date(year, 10, 11)));

  // Thanksgiving Day - 4th Thursday in November
  holidays.push(getThanksgiving(year));

  // Christmas Day - December 25
  holidays.push(getObservedDate(new Date(year, 11, 25)));

  return holidays;
}

/**
 * Normalize a date to midnight for comparison
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is a US federal holiday
 */
export function isUSFederalHoliday(date: Date): boolean {
  const normalizedDate = normalizeDate(date);
  const year = normalizedDate.getFullYear();

  // Check current year and adjacent years (for edge cases near year boundaries)
  const yearsToCheck = [year - 1, year, year + 1];

  for (const checkYear of yearsToCheck) {
    const holidays = getUSFederalHolidays(checkYear);
    for (const holiday of holidays) {
      if (isSameDay(normalizedDate, holiday)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a business day (not weekend, not federal holiday)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isUSFederalHoliday(date);
}

/**
 * Add N business days to a date (skipping weekends and US federal holidays)
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  if (days === 0) return normalizeDate(startDate);

  const result = normalizeDate(startDate);
  let daysAdded = 0;
  const direction = days > 0 ? 1 : -1;
  const targetDays = Math.abs(days);

  while (daysAdded < targetDays) {
    result.setDate(result.getDate() + direction);

    if (isBusinessDay(result)) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Add N calendar days to a date
 */
export function addCalendarDays(startDate: Date, days: number): Date {
  const result = normalizeDate(startDate);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate delivery deadline from RFD date
 *
 * @param rfdDate - Ready for delivery date
 * @param daysToDeliver - Number of days to deliver
 * @param useBusinessDays - If true, skip weekends and US federal holidays
 * @returns Calculated delivery deadline date
 */
export function calculateDeliveryDeadline(
  rfdDate: Date,
  daysToDeliver: number,
  useBusinessDays: boolean
): Date {
  if (useBusinessDays) {
    return addBusinessDays(rfdDate, daysToDeliver);
  } else {
    return addCalendarDays(rfdDate, daysToDeliver);
  }
}

/**
 * Format a date as YYYY-MM-DD string (for database storage)
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

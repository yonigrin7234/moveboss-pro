/**
 * Shared formatting utilities
 * These can be used in both client and server components
 */

/**
 * Format the oldest request age for display
 */
export function formatRequestAge(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

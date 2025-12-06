/**
 * Trip Utility Functions
 *
 * Shared helpers for trip-related screens and components.
 */

import { LoadStatus, TripLoad } from '../types';

export interface LoadAction {
  action: string;
  color: string;
}

/**
 * Get the next action for a load based on its status
 */
export const getLoadAction = (status: LoadStatus): LoadAction | null => {
  switch (status) {
    case 'pending':
      return { action: 'Accept', color: '#FF9500' }; // colors.warning
    case 'accepted':
      return { action: 'Start Loading', color: '#FF9500' };
    case 'loading':
      return { action: 'Finish Loading', color: '#FF9500' };
    case 'loaded':
      return { action: 'Collect Payment', color: '#5856D6' }; // colors.info
    case 'in_transit':
      return { action: 'Complete Delivery', color: '#34C759' }; // colors.success
    case 'delivered':
    case 'storage_completed':
      return null;
    default:
      return null;
  }
};

/**
 * Find the next load that needs action in a trip
 */
export const findNextActionableLoad = (
  loads: TripLoad[]
): { load: TripLoad; action: string } | null => {
  const sorted = [...loads].sort((a, b) => a.sequence_index - b.sequence_index);

  for (const tripLoad of sorted) {
    const action = getLoadAction(tripLoad.loads.load_status);
    if (action) {
      return { load: tripLoad, action: action.action };
    }
  }
  return null;
};

/**
 * Format a date string for display
 */
export const formatTripDate = (dateString: string | null): string => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${amount.toFixed(2)}`;
};

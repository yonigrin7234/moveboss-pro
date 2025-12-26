/**
 * Trip Utility Functions
 *
 * Shared helpers for trip-related screens and components.
 */

import { LoadStatus, TripLoad, Load } from '../types';

export interface LoadAction {
  action: string;
  color: string;
}

/**
 * Get the next action for a load based on its status.
 *
 * Updated to reflect proper workflow:
 * - loaded → Start Delivery (not Collect Payment)
 * - in_transit (not arrived) → I've Arrived
 * - in_transit (arrived) → Collect Payment
 */
export const getLoadAction = (status: LoadStatus, arrivedAtDelivery?: string | null): LoadAction | null => {
  switch (status) {
    case 'pending':
      return { action: 'Accept', color: '#FF9500' }; // colors.warning
    case 'accepted':
      return { action: 'Start Loading', color: '#FF9500' };
    case 'loading':
      return { action: 'Finish Loading', color: '#FF9500' };
    case 'loaded':
      return { action: 'Start Delivery', color: '#5856D6' }; // colors.info
    case 'in_transit':
      // Two-state: arrived or not
      if (arrivedAtDelivery) {
        return { action: 'Collect Payment', color: '#34C759' }; // colors.success
      }
      return { action: "I've Arrived", color: '#5856D6' }; // colors.info
    case 'delivered':
    case 'storage_completed':
      return null;
    default:
      return null;
  }
};

/**
 * Sort loads by delivery order, respecting the trip's delivery sequence.
 * Loads with delivery_order are sorted by that value first.
 * Loads without delivery_order fall back to sequence_index.
 */
export const sortLoadsByDeliveryOrder = (loads: TripLoad[]): TripLoad[] => {
  return [...loads].sort((a, b) => {
    // Both have delivery_order - sort by that
    if (a.loads.delivery_order !== null && b.loads.delivery_order !== null) {
      return a.loads.delivery_order - b.loads.delivery_order;
    }
    // Only 'a' has delivery_order - it comes first
    if (a.loads.delivery_order !== null) return -1;
    // Only 'b' has delivery_order - it comes first
    if (b.loads.delivery_order !== null) return 1;
    // Neither has delivery_order - fall back to sequence_index
    return a.sequence_index - b.sequence_index;
  });
};

export interface NextLoadInfo {
  load: TripLoad;
  action: string;
  /** Pickup location string */
  pickupLocation: string;
  /** Delivery location string */
  deliveryLocation: string;
  /** Whether this load should be prioritized based on delivery order */
  isDeliveryOrderEnforced: boolean;
}

/**
 * Get location string from load
 */
export const getLoadLocation = (load: Load, type: 'pickup' | 'delivery'): string => {
  if (type === 'pickup') {
    return [load.pickup_city, load.pickup_state].filter(Boolean).join(', ') || 'Not set';
  }
  const city = load.dropoff_city || load.delivery_city;
  const state = load.dropoff_state || load.delivery_state;
  return [city, state].filter(Boolean).join(', ') || 'Not set';
};

/**
 * Find the next load that needs action in a trip.
 *
 * Enhanced to:
 * 1. Respect delivery order (loads must be delivered in sequence)
 * 2. Provide location context for the action
 * 3. Consider the arrived_at_delivery status for in_transit loads
 *
 * @param loads - All trip loads
 * @param currentDeliveryIndex - Current delivery index from the trip (for order enforcement)
 */
export const findNextActionableLoad = (
  loads: TripLoad[],
  currentDeliveryIndex?: number | null
): NextLoadInfo | null => {
  // Sort by delivery order
  const sorted = sortLoadsByDeliveryOrder(loads);

  // Group loads by phase:
  // 1. Pickup phase: pending, accepted, loading, loaded
  // 2. Delivery phase: in_transit
  // 3. Completed: delivered, storage_completed

  // First, find any load in the pickup phase that needs action
  // (these can be done in any order before delivery starts)
  const pickupPhaseStatuses: LoadStatus[] = ['pending', 'accepted', 'loading', 'loaded'];

  for (const tripLoad of sorted) {
    // Default to 'pending' if load_status is null/undefined (handles legacy data)
    const status = tripLoad.loads.load_status || 'pending';
    if (pickupPhaseStatuses.includes(status)) {
      const action = getLoadAction(status, tripLoad.loads.arrived_at_delivery);
      if (action) {
        return {
          load: tripLoad,
          action: action.action,
          pickupLocation: getLoadLocation(tripLoad.loads, 'pickup'),
          deliveryLocation: getLoadLocation(tripLoad.loads, 'delivery'),
          isDeliveryOrderEnforced: false,
        };
      }
    }
  }

  // Next, find in_transit loads - these must respect delivery order
  const inTransitLoads = sorted.filter(l => (l.loads.load_status || 'pending') === 'in_transit');

  if (inTransitLoads.length > 0) {
    // If we have a current delivery index, find the load with matching delivery_order
    if (currentDeliveryIndex !== null && currentDeliveryIndex !== undefined) {
      const currentDeliveryLoad = inTransitLoads.find(
        l => l.loads.delivery_order === currentDeliveryIndex
      );
      if (currentDeliveryLoad) {
        const action = getLoadAction('in_transit', currentDeliveryLoad.loads.arrived_at_delivery);
        if (action) {
          return {
            load: currentDeliveryLoad,
            action: action.action,
            pickupLocation: getLoadLocation(currentDeliveryLoad.loads, 'pickup'),
            deliveryLocation: getLoadLocation(currentDeliveryLoad.loads, 'delivery'),
            isDeliveryOrderEnforced: true,
          };
        }
      }
    }

    // Fall back to first in_transit load
    const firstInTransit = inTransitLoads[0];
    const action = getLoadAction('in_transit', firstInTransit.loads.arrived_at_delivery);
    if (action) {
      return {
        load: firstInTransit,
        action: action.action,
        pickupLocation: getLoadLocation(firstInTransit.loads, 'pickup'),
        deliveryLocation: getLoadLocation(firstInTransit.loads, 'delivery'),
        isDeliveryOrderEnforced: inTransitLoads.length > 1,
      };
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

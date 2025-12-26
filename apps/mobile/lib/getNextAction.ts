/**
 * Smart Action Engine
 *
 * Analyzes all trips and loads to determine THE single most important
 * action the driver needs to take right now.
 *
 * Priority order:
 * 1. Payment collection (money waiting)
 * 2. Active delivery in progress
 * 3. Load ready for delivery
 * 4. Active loading in progress
 * 5. Load ready to start loading
 * 6. Pending load to accept
 * 7. Trip to start
 * 8. No action needed
 */

import { Trip, Load, TripWithLoads, TripLoad, LoadStatus } from '../types';
import type { IconName } from '../components/ui/Icon';

export type ActionType =
  | 'collect_payment'
  | 'complete_delivery'
  | 'start_delivery'
  | 'finish_loading'
  | 'start_loading'
  | 'accept_load'
  | 'start_trip'
  | 'complete_trip'
  | 'no_action';

export interface NextAction {
  type: ActionType;
  priority: number;
  title: string;
  subtitle: string;
  description: string;
  // Context
  trip?: TripWithLoads;
  load?: Load;
  tripLoad?: TripLoad;
  // Quick data
  amount?: number;
  address?: string;
  customerName?: string;
  companyName?: string;
  // Navigation
  route: string;
  params?: Record<string, string>;
  // Action metadata
  canSwipeToComplete?: boolean;
  requiresInput?: boolean;
  estimatedTime?: string;
}

// Priority constants (lower = higher priority)
const PRIORITY = {
  COLLECT_PAYMENT: 1,
  COMPLETE_DELIVERY: 2,
  START_DELIVERY: 3,
  FINISH_LOADING: 4,
  START_LOADING: 5,
  ACCEPT_LOAD: 6,
  START_TRIP: 7,
  COMPLETE_TRIP: 8,
  NO_ACTION: 99,
} as const;

/**
 * Get the single most important action for the driver
 */
export function getNextAction(trips: TripWithLoads[]): NextAction {
  const actions: NextAction[] = [];

  for (const trip of trips) {
    // Skip non-active trips
    if (trip.status === 'completed' || trip.status === 'settled' || trip.status === 'cancelled') {
      continue;
    }

    // Trip needs to be started
    if (trip.status === 'planned') {
      actions.push(createStartTripAction(trip));
      continue;
    }

    // Active trip - analyze loads
    if (trip.status === 'active' || trip.status === 'en_route') {
      const loadActions = analyzeLoadsForActions(trip);
      actions.push(...loadActions);

      // Check if all loads are delivered - trip can be completed
      const allDelivered = trip.trip_loads.every(
        (tl) => tl.loads.load_status === 'delivered' || tl.loads.load_status === 'storage_completed'
      );
      if (allDelivered && trip.trip_loads.length > 0) {
        actions.push(createCompleteTripAction(trip));
      }
    }
  }

  // Sort by priority and return highest
  actions.sort((a, b) => a.priority - b.priority);

  return actions[0] || createNoAction();
}

/**
 * Get all pending actions (for a list view)
 */
export function getAllPendingActions(trips: TripWithLoads[]): NextAction[] {
  const actions: NextAction[] = [];

  for (const trip of trips) {
    if (trip.status === 'completed' || trip.status === 'settled' || trip.status === 'cancelled') {
      continue;
    }

    if (trip.status === 'planned') {
      actions.push(createStartTripAction(trip));
      continue;
    }

    if (trip.status === 'active' || trip.status === 'en_route') {
      const loadActions = analyzeLoadsForActions(trip);
      actions.push(...loadActions);
    }
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Analyze all loads in a trip and return their actions
 */
function analyzeLoadsForActions(trip: TripWithLoads): NextAction[] {
  const actions: NextAction[] = [];

  // Sort loads by delivery order
  const sortedLoads = [...trip.trip_loads].sort(
    (a, b) => (a.loads.delivery_order || 0) - (b.loads.delivery_order || 0)
  );

  for (const tripLoad of sortedLoads) {
    const load = tripLoad.loads;
    const action = getLoadAction(trip, tripLoad, load);
    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Determine the action for a specific load
 */
function getLoadAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction | null {
  // Default to 'pending' if load_status is null/undefined (handles legacy data)
  const status = load.load_status || 'pending';

  switch (status) {
    case 'pending':
      return createAcceptLoadAction(trip, tripLoad, load);

    case 'accepted':
      return createStartLoadingAction(trip, tripLoad, load);

    case 'loading':
      return createFinishLoadingAction(trip, tripLoad, load);

    case 'loaded': {
      // Check if payment is due
      const balanceDue = load.balance_due_on_delivery || 0;
      const amountCollected = load.amount_collected_on_delivery || 0;

      if (balanceDue > amountCollected) {
        return createCollectPaymentAction(trip, tripLoad, load);
      }

      // Check delivery order
      const canDeliver = canStartDelivery(trip, load);
      if (canDeliver) {
        return createStartDeliveryAction(trip, tripLoad, load);
      }

      // Waiting for earlier loads
      return createWaitingAction(trip, tripLoad, load);
    }

    case 'in_transit':
      return createCompleteDeliveryAction(trip, tripLoad, load);

    case 'delivered':
    case 'storage_completed':
      return null; // No action needed

    default:
      return null;
  }
}

/**
 * Check if a load can start delivery based on:
 * 1. ALL loads in trip must be loaded first (loaded, in_transit, delivered, storage_completed)
 * 2. Delivery order must be respected
 */
function canStartDelivery(trip: TripWithLoads, load: Load): boolean {
  // CRITICAL: First check that ALL loads are loaded before ANY delivery can start
  const deliveryPhaseStatuses: LoadStatus[] = ['loaded', 'in_transit', 'delivered', 'storage_completed'];

  for (const tl of trip.trip_loads) {
    const otherLoad = tl.loads;
    const status = (otherLoad.load_status || 'pending') as LoadStatus;

    // If any load is still in pickup phase (pending, accepted, loading), no delivery can start
    if (!deliveryPhaseStatuses.includes(status)) {
      return false;
    }
  }

  // All loads are loaded - now check delivery order
  const deliveryOrder = load.delivery_order;
  if (!deliveryOrder) return true; // No delivery order, allow

  // Check that all loads with lower delivery_order are delivered
  for (const tl of trip.trip_loads) {
    const otherLoad = tl.loads;
    const otherOrder = otherLoad.delivery_order || 0;

    if (otherOrder < deliveryOrder &&
        otherLoad.load_status !== 'delivered' &&
        otherLoad.load_status !== 'storage_completed') {
      return false;
    }
  }

  return true;
}

// === Action Creators ===

function createCollectPaymentAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  const amount = (load.balance_due_on_delivery || 0) - (load.amount_collected_on_delivery || 0);
  const customerName = load.customer_name || load.companies?.name || 'Customer';

  return {
    type: 'collect_payment',
    priority: PRIORITY.COLLECT_PAYMENT,
    title: `Collect $${amount.toLocaleString()}`,
    subtitle: `from ${customerName}`,
    description: `Payment due before delivery can start`,
    trip,
    load,
    tripLoad,
    amount,
    customerName,
    companyName: load.companies?.name || undefined,
    address: formatAddress(load, 'delivery'),
    route: `/(app)/trips/${trip.id}/loads/${load.id}/collect-payment`,
    canSwipeToComplete: false,
    requiresInput: true,
    estimatedTime: '2-5 min',
  };
}

function createCompleteDeliveryAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  const address = formatAddress(load, 'delivery');

  return {
    type: 'complete_delivery',
    priority: PRIORITY.COMPLETE_DELIVERY,
    title: 'Complete Delivery',
    subtitle: address,
    description: `Finish delivery to ${load.customer_name || 'customer'}`,
    trip,
    load,
    tripLoad,
    address,
    customerName: load.customer_name || undefined,
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: true,
    requiresInput: false,
    estimatedTime: '1 min',
  };
}

function createStartDeliveryAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  const address = formatAddress(load, 'delivery');

  return {
    type: 'start_delivery',
    priority: PRIORITY.START_DELIVERY,
    title: 'Start Delivery',
    subtitle: address,
    description: `Navigate to ${load.customer_name || 'delivery location'}`,
    trip,
    load,
    tripLoad,
    address,
    customerName: load.customer_name || undefined,
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: true,
    requiresInput: false,
    estimatedTime: '1 tap',
  };
}

function createFinishLoadingAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  const address = formatAddress(load, 'pickup');

  return {
    type: 'finish_loading',
    priority: PRIORITY.FINISH_LOADING,
    title: 'Finish Loading',
    subtitle: `${load.cubic_feet || '?'} cuft at ${address}`,
    description: 'Complete the loading process',
    trip,
    load,
    tripLoad,
    address,
    companyName: load.companies?.name || undefined,
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: true,
    requiresInput: true,
    estimatedTime: '2 min',
  };
}

function createStartLoadingAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  const address = formatAddress(load, 'pickup');

  return {
    type: 'start_loading',
    priority: PRIORITY.START_LOADING,
    title: 'Start Loading',
    subtitle: address,
    description: `Begin loading at ${load.companies?.name || 'pickup location'}`,
    trip,
    load,
    tripLoad,
    address,
    companyName: load.companies?.name || undefined,
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: true,
    requiresInput: false,
    estimatedTime: '1 tap',
  };
}

function createAcceptLoadAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  return {
    type: 'accept_load',
    priority: PRIORITY.ACCEPT_LOAD,
    title: 'Accept Load',
    subtitle: `${load.load_number || 'New Load'}`,
    description: `Review and accept ${load.companies?.name || 'load'} assignment`,
    trip,
    load,
    tripLoad,
    companyName: load.companies?.name || undefined,
    address: formatAddress(load, 'pickup'),
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: true,
    requiresInput: false,
    estimatedTime: '1 tap',
  };
}

function createStartTripAction(trip: TripWithLoads): NextAction {
  const route = `${trip.origin_city || '?'}, ${trip.origin_state || '?'} → ${trip.destination_city || '?'}, ${trip.destination_state || '?'}`;

  return {
    type: 'start_trip',
    priority: PRIORITY.START_TRIP,
    title: 'Start Trip',
    subtitle: `Trip #${trip.trip_number}`,
    description: route,
    trip,
    route: `/(app)/trips/${trip.id}/start`,
    canSwipeToComplete: false,
    requiresInput: true, // Needs odometer reading
    estimatedTime: '2 min',
  };
}

function createCompleteTripAction(trip: TripWithLoads): NextAction {
  return {
    type: 'complete_trip',
    priority: PRIORITY.COMPLETE_TRIP,
    title: 'Complete Trip',
    subtitle: `Trip #${trip.trip_number}`,
    description: 'All loads delivered - finish trip',
    trip,
    route: `/(app)/trips/${trip.id}`,
    canSwipeToComplete: false,
    requiresInput: true, // Needs odometer reading
    estimatedTime: '2 min',
  };
}

function createWaitingAction(
  trip: TripWithLoads,
  tripLoad: TripLoad,
  load: Load
): NextAction {
  return {
    type: 'start_delivery',
    priority: PRIORITY.START_DELIVERY + 0.5, // Slightly lower priority
    title: 'Waiting',
    subtitle: `Deliver load ${load.delivery_order} first`,
    description: 'This load must wait for earlier deliveries',
    trip,
    load,
    tripLoad,
    route: `/(app)/trips/${trip.id}/loads/${load.id}`,
    canSwipeToComplete: false,
    requiresInput: false,
  };
}

function createNoAction(): NextAction {
  return {
    type: 'no_action',
    priority: PRIORITY.NO_ACTION,
    title: 'All Caught Up',
    subtitle: 'No pending tasks',
    description: 'Pull down to refresh for new assignments',
    route: '/(app)',
    canSwipeToComplete: false,
    requiresInput: false,
  };
}

// === Helpers ===

function formatAddress(load: Load, type: 'pickup' | 'delivery'): string {
  if (type === 'pickup') {
    const city = load.pickup_city;
    const state = load.pickup_state;
    if (city && state) return `${city}, ${state}`;
    return load.pickup_address_line1 || 'Pickup location';
  } else {
    const city = load.delivery_city || load.dropoff_city;
    const state = load.delivery_state || load.dropoff_state;
    if (city && state) return `${city}, ${state}`;
    return load.delivery_address_line1 || load.dropoff_address_line1 || 'Delivery location';
  }
}

/**
 * Get action color based on type
 */
export function getActionColor(type: ActionType): string {
  switch (type) {
    case 'collect_payment':
      return '#22C55E'; // Green - money
    case 'complete_delivery':
      return '#6366F1'; // Primary
    case 'start_delivery':
      return '#6366F1'; // Primary
    case 'finish_loading':
      return '#F59E0B'; // Warning/active
    case 'start_loading':
      return '#3B82F6'; // Info
    case 'accept_load':
      return '#8B5CF6'; // Purple
    case 'start_trip':
      return '#6366F1'; // Primary
    case 'complete_trip':
      return '#22C55E'; // Success
    case 'no_action':
    default:
      return '#71717A'; // Muted
  }
}

/**
 * Get action icon based on type
 */
export function getActionIcon(type: ActionType): IconName {
  switch (type) {
    case 'collect_payment':
      return 'banknote';
    case 'complete_delivery':
      return 'check-circle';
    case 'start_delivery':
      return 'truck';
    case 'finish_loading':
      return 'package';
    case 'start_loading':
      return 'package';
    case 'accept_load':
      return 'check';
    case 'start_trip':
      return 'navigation';
    case 'complete_trip':
      return 'flag';
    case 'no_action':
    default:
      return 'check-circle';
  }
}

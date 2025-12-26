/**
 * Static attributes for a Trip Live Activity
 * These cannot change after the activity starts
 */
export interface TripActivityAttributes {
  tripId: string;
  tripName: string;
  loadNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  totalLoads: number;
  currentLoadIndex: number;
}

/**
 * Dynamic content state for a Trip Live Activity
 * These can be updated while the activity is running
 */
export interface TripActivityContentState {
  /** Current status - matches LoadStatus from the app types */
  currentStatus: string;
  /** Human-readable status label */
  statusLabel: string;
  /** Progress percentage (0.0 - 1.0) */
  progress: number;
  /** Estimated time remaining (e.g., "45 min") */
  eta?: string;
  /** Distance remaining (e.g., "32 mi") */
  distance?: string;
}

/**
 * Parameters for starting a Live Activity
 */
export interface StartLiveActivityParams {
  attributes: TripActivityAttributes;
  contentState: TripActivityContentState;
}

/**
 * Parameters for updating a Live Activity
 */
export interface UpdateLiveActivityParams {
  contentState: TripActivityContentState;
}

/**
 * Return type for startLiveActivity
 */
export interface StartLiveActivityResult {
  activityId: string;
}

/**
 * Start a new Trip Live Activity
 */
export type StartLiveActivityFn = (
  params: StartLiveActivityParams
) => Promise<StartLiveActivityResult>;

/**
 * Update the current Live Activity
 */
export type UpdateLiveActivityFn = (
  params: UpdateLiveActivityParams
) => Promise<void>;

/**
 * Stop the current Live Activity
 */
export type StopLiveActivityFn = () => Promise<void>;

/**
 * Check if a Live Activity is currently running
 */
export type IsLiveActivityRunningFn = () => boolean;

/**
 * Notify Owner API Client
 *
 * Sends notifications to the trip/load owner when drivers perform actions.
 * Uses the web dashboard API which handles looking up owners and sending push notifications.
 */

import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || '';

type DriverActionPayload =
  | {
      action: 'trip_started';
      tripId: string;
      odometerStart: number;
    }
  | {
      action: 'trip_completed';
      tripId: string;
      odometerEnd?: number;
    }
  | {
      action: 'odometer_photo';
      tripId: string;
      type: 'start' | 'end';
      odometerValue: number;
    }
  | {
      action: 'load_accepted';
      loadId: string;
    }
  | {
      action: 'loading_started';
      loadId: string;
    }
  | {
      action: 'loading_finished';
      loadId: string;
    }
  | {
      action: 'delivery_started';
      loadId: string;
    }
  | {
      action: 'delivery_completed';
      loadId: string;
    }
  | {
      action: 'load_photo';
      loadId: string;
      photoType: 'loading-start' | 'loading-end' | 'delivery' | 'document';
    }
  | {
      action: 'expense_added';
      tripId: string;
      expenseType: string;
      amount: number;
    };

/**
 * Send a driver action notification to the owner
 * This is fire-and-forget - errors are logged but don't affect the calling code
 */
async function sendDriverAction(payload: DriverActionPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.log('No session, skipping owner notification');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/notifications/driver-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send owner notification:', error);
    }
  } catch (error) {
    // Log but don't throw - notifications shouldn't block driver actions
    console.error('Error sending owner notification:', error);
  }
}

// ============================================
// TRIP NOTIFICATIONS
// ============================================

export async function notifyOwnerTripStarted(tripId: string, odometerStart: number): Promise<void> {
  await sendDriverAction({
    action: 'trip_started',
    tripId,
    odometerStart,
  });
}

export async function notifyOwnerTripCompleted(tripId: string, odometerEnd?: number): Promise<void> {
  await sendDriverAction({
    action: 'trip_completed',
    tripId,
    odometerEnd,
  });
}

export async function notifyOwnerOdometerPhoto(
  tripId: string,
  type: 'start' | 'end',
  odometerValue: number
): Promise<void> {
  await sendDriverAction({
    action: 'odometer_photo',
    tripId,
    type,
    odometerValue,
  });
}

// ============================================
// LOAD NOTIFICATIONS
// ============================================

export async function notifyOwnerLoadAccepted(loadId: string): Promise<void> {
  await sendDriverAction({
    action: 'load_accepted',
    loadId,
  });
}

export async function notifyOwnerLoadingStarted(loadId: string): Promise<void> {
  await sendDriverAction({
    action: 'loading_started',
    loadId,
  });
}

export async function notifyOwnerLoadingFinished(loadId: string): Promise<void> {
  await sendDriverAction({
    action: 'loading_finished',
    loadId,
  });
}

export async function notifyOwnerDeliveryStarted(loadId: string): Promise<void> {
  await sendDriverAction({
    action: 'delivery_started',
    loadId,
  });
}

export async function notifyOwnerDeliveryCompleted(loadId: string): Promise<void> {
  await sendDriverAction({
    action: 'delivery_completed',
    loadId,
  });
}

export async function notifyOwnerLoadPhoto(
  loadId: string,
  photoType: 'loading-start' | 'loading-end' | 'delivery' | 'document'
): Promise<void> {
  await sendDriverAction({
    action: 'load_photo',
    loadId,
    photoType,
  });
}

// ============================================
// EXPENSE NOTIFICATIONS
// ============================================

export async function notifyOwnerExpenseAdded(
  tripId: string,
  expenseType: string,
  amount: number
): Promise<void> {
  await sendDriverAction({
    action: 'expense_added',
    tripId,
    expenseType,
    amount,
  });
}

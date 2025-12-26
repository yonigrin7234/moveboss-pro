import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  notifyOwnerTripStarted,
  notifyOwnerTripCompleted,
  notifyOwnerOdometerPhoto,
  notifyOwnerLoadAccepted,
  notifyOwnerLoadingStarted,
  notifyOwnerLoadingFinished,
  notifyOwnerDeliveryStarted,
  notifyOwnerDriverArrived,
  notifyOwnerDeliveryCompleted,
  notifyOwnerLoadPhoto,
  notifyOwnerExpenseAdded,
} from '@/lib/push-notifications';

type DriverActionRequest =
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
      action: 'driver_arrived';
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

export async function POST(request: Request) {
  // Get token from Authorization header (mobile app sends Bearer token)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create Supabase client with the user's token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is a driver
  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!driver) {
    return NextResponse.json(
      { error: 'Only drivers can use this endpoint' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as DriverActionRequest;

    switch (body.action) {
      case 'trip_started': {
        await notifyOwnerTripStarted(body.tripId, body.odometerStart);
        return NextResponse.json({ success: true });
      }

      case 'trip_completed': {
        await notifyOwnerTripCompleted(body.tripId, body.odometerEnd);
        return NextResponse.json({ success: true });
      }

      case 'odometer_photo': {
        await notifyOwnerOdometerPhoto(body.tripId, body.type, body.odometerValue);
        return NextResponse.json({ success: true });
      }

      case 'load_accepted': {
        await notifyOwnerLoadAccepted(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'loading_started': {
        await notifyOwnerLoadingStarted(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'loading_finished': {
        await notifyOwnerLoadingFinished(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'delivery_started': {
        await notifyOwnerDeliveryStarted(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'driver_arrived': {
        await notifyOwnerDriverArrived(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'delivery_completed': {
        await notifyOwnerDeliveryCompleted(body.loadId);
        return NextResponse.json({ success: true });
      }

      case 'load_photo': {
        await notifyOwnerLoadPhoto(body.loadId, body.photoType);
        return NextResponse.json({ success: true });
      }

      case 'expense_added': {
        await notifyOwnerExpenseAdded(body.tripId, body.expenseType, body.amount);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Driver action notification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}

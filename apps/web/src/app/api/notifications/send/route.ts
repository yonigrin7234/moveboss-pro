import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  sendPushToDriver,
  sendPushToDrivers,
  sendPushToUser,
  notifyDriverTripAssigned,
  notifyDriverLoadAssigned,
  notifyDriverPayment,
  notifyDriverMessage,
  PushNotificationData,
} from '@/lib/push-notifications';

type NotificationRequest =
  | {
      action: 'send_to_driver';
      driverId: string;
      title: string;
      body: string;
      data?: PushNotificationData;
      channelId?: string;
    }
  | {
      action: 'send_to_drivers';
      driverIds: string[];
      title: string;
      body: string;
      data?: PushNotificationData;
      channelId?: string;
    }
  | {
      action: 'send_to_user';
      userId: string;
      title: string;
      body: string;
      data?: PushNotificationData;
    }
  | {
      action: 'trip_assigned';
      driverId: string;
      tripId: string;
      tripNumber: number;
      route: string;
      startDate: string;
    }
  | {
      action: 'load_assigned';
      driverId: string;
      loadId: string;
      loadNumber: string;
      tripId: string;
      pickupLocation: string;
    }
  | {
      action: 'payment';
      driverId: string;
      tripNumber: number;
      amount: number;
      status: 'approved' | 'paid';
    }
  | {
      action: 'message';
      driverId: string;
      title: string;
      message: string;
      data?: Record<string, string>;
    }
  | {
      action: 'test_push';
      driverId: string;
    };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to send notifications (dispatcher/admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedRoles = ['admin', 'dispatcher', 'company', 'owner_operator', 'carrier'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: 'Permission denied. Only dispatchers and admins can send notifications.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as NotificationRequest;

    switch (body.action) {
      case 'send_to_driver': {
        const result = await sendPushToDriver(
          body.driverId,
          body.title,
          body.body,
          body.data,
          { channelId: body.channelId }
        );
        return NextResponse.json(result);
      }

      case 'send_to_drivers': {
        const result = await sendPushToDrivers(
          body.driverIds,
          body.title,
          body.body,
          body.data,
          { channelId: body.channelId }
        );
        return NextResponse.json(result);
      }

      case 'send_to_user': {
        const result = await sendPushToUser(body.userId, body.title, body.body, body.data);
        return NextResponse.json(result);
      }

      case 'trip_assigned': {
        await notifyDriverTripAssigned(
          body.driverId,
          body.tripNumber,
          body.tripId,
          body.route,
          body.startDate
        );
        return NextResponse.json({ success: true });
      }

      case 'load_assigned': {
        await notifyDriverLoadAssigned(
          body.driverId,
          body.loadNumber,
          body.loadId,
          body.tripId,
          body.pickupLocation
        );
        return NextResponse.json({ success: true });
      }

      case 'payment': {
        await notifyDriverPayment(body.driverId, body.tripNumber, body.amount, body.status);
        return NextResponse.json({ success: true });
      }

      case 'message': {
        const result = await notifyDriverMessage(body.driverId, body.title, body.message, body.data);
        return NextResponse.json({ success: true, result });
      }
      
      case 'test_push': {
        // Diagnostic endpoint to test push notifications
        const { driverId } = body as { driverId: string };
        if (!driverId) {
          return NextResponse.json({ error: 'driverId required' }, { status: 400 });
        }
        const result = await sendPushToDriver(
          driverId,
          '🧪 Test Notification',
          'This is a test push notification. If you receive this, push notifications are working!',
          { type: 'general' },
          { channelId: 'default', sound: 'default' }
        );
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notification' },
      { status: 500 }
    );
  }
}

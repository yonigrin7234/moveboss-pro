import { useCallback } from 'react';
import { useToast } from './use-toast';

interface SendNotificationOptions {
  showToast?: boolean;
}

export function useNotifications() {
  const { toast } = useToast();

  const sendToDriver = useCallback(
    async (
      driverId: string,
      title: string,
      body: string,
      data?: Record<string, string>,
      options?: SendNotificationOptions
    ) => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_to_driver',
            driverId,
            title,
            body,
            data,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send notification');
        }

        if (options?.showToast !== false) {
          toast({
            title: 'Notification sent',
            description: `Sent to ${result.ticketCount || 0} device(s)`,
          });
        }

        return result;
      } catch (error) {
        if (options?.showToast !== false) {
          toast({
            title: 'Failed to send notification',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
        throw error;
      }
    },
    [toast]
  );

  const notifyTripAssigned = useCallback(
    async (
      driverId: string,
      tripId: string,
      tripNumber: number,
      route: string,
      startDate: string,
      options?: SendNotificationOptions
    ) => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'trip_assigned',
            driverId,
            tripId,
            tripNumber,
            route,
            startDate,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send notification');
        }

        if (options?.showToast !== false) {
          toast({
            title: 'Driver notified',
            description: `Trip #${tripNumber} assignment sent`,
          });
        }

        return result;
      } catch (error) {
        console.error('Failed to notify driver of trip assignment:', error);
        // Don't throw - notification failure shouldn't block trip assignment
      }
    },
    [toast]
  );

  const notifyLoadAssigned = useCallback(
    async (
      driverId: string,
      loadId: string,
      loadNumber: string,
      tripId: string,
      pickupLocation: string,
      options?: SendNotificationOptions
    ) => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load_assigned',
            driverId,
            loadId,
            loadNumber,
            tripId,
            pickupLocation,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send notification');
        }

        if (options?.showToast !== false) {
          toast({
            title: 'Driver notified',
            description: `Load ${loadNumber} assignment sent`,
          });
        }

        return result;
      } catch (error) {
        console.error('Failed to notify driver of load assignment:', error);
      }
    },
    [toast]
  );

  const notifyPayment = useCallback(
    async (
      driverId: string,
      tripNumber: number,
      amount: number,
      status: 'approved' | 'paid',
      options?: SendNotificationOptions
    ) => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment',
            driverId,
            tripNumber,
            amount,
            status,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send notification');
        }

        if (options?.showToast !== false) {
          toast({
            title: 'Driver notified',
            description: `${status === 'approved' ? 'Settlement approval' : 'Payment'} notification sent`,
          });
        }

        return result;
      } catch (error) {
        console.error('Failed to notify driver of payment:', error);
      }
    },
    [toast]
  );

  const sendMessage = useCallback(
    async (
      driverId: string,
      title: string,
      message: string,
      data?: Record<string, string>,
      options?: SendNotificationOptions
    ) => {
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'message',
            driverId,
            title,
            message,
            data,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send notification');
        }

        if (options?.showToast !== false) {
          toast({
            title: 'Message sent',
            description: `Notification sent to driver`,
          });
        }

        return result;
      } catch (error) {
        if (options?.showToast !== false) {
          toast({
            title: 'Failed to send message',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        }
        throw error;
      }
    },
    [toast]
  );

  return {
    sendToDriver,
    notifyTripAssigned,
    notifyLoadAssigned,
    notifyPayment,
    sendMessage,
  };
}

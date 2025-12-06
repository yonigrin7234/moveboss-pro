'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Calendar, MapPin, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Trip {
  id: string;
  trip_number: string | null;
  status: string;
  start_date: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  driver?: { id: string; first_name: string; last_name: string } | null;
  truck?: { id: string; unit_number: string } | null;
  trailer?: { id: string; unit_number: string } | null;
}

interface AssignToTripModalProps {
  loadIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (tripId: string, loadIds: string[]) => Promise<{ success: boolean; error?: string }>;
  trips: Trip[];
  isLoading?: boolean;
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function AssignToTripModal({
  loadIds,
  isOpen,
  onClose,
  onAssign,
  trips,
  isLoading = false,
}: AssignToTripModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTripId('');
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedTripId) {
      toast({
        title: 'No trip selected',
        description: 'Please select a trip to assign the loads to.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAssign(selectedTripId, loadIds);
      if (result.success) {
        toast({
          title: 'Loads assigned',
          description: `${loadIds.length} load${loadIds.length > 1 ? 's' : ''} assigned to trip successfully.`,
        });
        onClose();
        router.refresh();
      } else {
        toast({
          title: 'Assignment failed',
          description: result.error || 'Failed to assign loads to trip.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign to Trip</DialogTitle>
          <DialogDescription>
            Select a trip to assign {loadIds.length} load{loadIds.length > 1 ? 's' : ''} to.
            The loads will inherit the trip&apos;s driver and equipment.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : trips.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>No available trips found.</p>
            <p className="mt-1">Create a new trip first, then assign loads to it.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto py-2">
            <RadioGroup value={selectedTripId} onValueChange={setSelectedTripId}>
              <div className="space-y-2">
                {trips.map((trip) => {
                  const driverName = trip.driver
                    ? `${trip.driver.first_name} ${trip.driver.last_name}`
                    : null;
                  const route =
                    trip.origin_city && trip.destination_city
                      ? `${trip.origin_city}, ${trip.origin_state} → ${trip.destination_city}, ${trip.destination_state}`
                      : null;

                  return (
                    <div key={trip.id}>
                      <Label
                        htmlFor={trip.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                      >
                        <RadioGroupItem value={trip.id} id={trip.id} className="mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {trip.trip_number || 'Unnamed Trip'}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {trip.status.replace('_', ' ')}
                            </span>
                          </div>
                          {route && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {route}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {trip.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(trip.start_date)}
                              </span>
                            )}
                            {driverName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {driverName}
                              </span>
                            )}
                            {trip.truck && (
                              <span className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {trip.truck.unit_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedTripId || isSubmitting || trips.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign ${loadIds.length} Load${loadIds.length > 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

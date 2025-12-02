'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck } from 'lucide-react';

interface Trip {
  id: string;
  trip_number: string;
  driver: { first_name: string; last_name: string } | null;
}

interface TripAssignmentFormProps {
  loadId: string;
  availableTrips: Trip[];
  assignToTrip: (loadId: string, tripId: string) => Promise<{ success: boolean; error?: string }>;
}

export function TripAssignmentForm({ loadId, availableTrips, assignToTrip }: TripAssignmentFormProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTripId) {
      setError('Please select a trip');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await assignToTrip(loadId, selectedTripId);
      if (!result.success) {
        setError(result.error || 'Failed to assign load to trip');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (availableTrips.length === 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          No active trips available. Create a trip first to assign this load.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard/trips/new">
            Create New Trip
          </Link>
        </Button>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Select Trip</Label>
        <Select value={selectedTripId} onValueChange={setSelectedTripId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a trip..." />
          </SelectTrigger>
          <SelectContent>
            {availableTrips.map((trip) => {
              const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
              return (
                <SelectItem key={trip.id} value={trip.id}>
                  #{trip.trip_number}
                  {driver && ` - ${driver.first_name} ${driver.last_name}`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || !selectedTripId}>
        <Truck className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Assigning...' : 'Assign to Trip'}
      </Button>
    </form>
  );
}

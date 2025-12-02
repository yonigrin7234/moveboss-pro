'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Truck, CheckCircle, AlertCircle } from 'lucide-react';

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
  const router = useRouter();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTripId) {
      setError('Please select a trip');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('TripAssignmentForm: Submitting', { loadId, tripId: selectedTripId });
      const result = await assignToTrip(loadId, selectedTripId);
      console.log('TripAssignmentForm: Result', result);

      if (result.success) {
        setSuccess(true);
        // Refresh the page to show updated state
        router.refresh();
      } else {
        setError(result.error || 'Failed to assign load to trip');
      }
    } catch (err: any) {
      console.error('TripAssignmentForm: Error', err);
      setError(err?.message || 'An error occurred');
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
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-sm text-green-500">Load assigned to trip successfully!</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || !selectedTripId || success}>
        <Truck className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Assigning...' : 'Assign to Trip'}
      </Button>
    </form>
  );
}

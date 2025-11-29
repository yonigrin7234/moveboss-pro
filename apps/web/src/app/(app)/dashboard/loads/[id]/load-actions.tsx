'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Trip {
  id: string;
  trip_number: string;
  origin_city?: string | null;
  destination_city?: string | null;
  driver?: { first_name?: string; last_name?: string } | null;
}

interface LoadActionsProps {
  loadId: string;
  postingStatus: string | null;
  trips: Trip[];
  onPostToMarketplace: () => Promise<{ success: boolean; error?: string }>;
  onAssignToTrip: (tripId: string) => Promise<{ success: boolean; error?: string }>;
}

function formatTripLabel(trip: Trip): string {
  const parts = [`Trip ${trip.trip_number}`];
  if (trip.origin_city && trip.destination_city) {
    parts.push(`${trip.origin_city} → ${trip.destination_city}`);
  }
  if (trip.driver?.first_name) {
    parts.push(`(${trip.driver.first_name} ${trip.driver.last_name || ''})`.trim());
  }
  return parts.join(' - ');
}

export function LoadActions({
  loadId,
  postingStatus,
  trips,
  onPostToMarketplace,
  onAssignToTrip,
}: LoadActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const isDraft = !postingStatus || postingStatus === 'draft';
  const isPosted = postingStatus === 'posted';

  const handlePostToMarketplace = () => {
    startTransition(async () => {
      const result = await onPostToMarketplace();
      if (result.success) {
        toast({
          title: 'Posted to Marketplace',
          description: 'This load is now visible on the marketplace.',
        });
        setShowPostModal(false);
        router.refresh();
      } else {
        toast({
          title: 'Failed to post',
          description: result.error || 'An error occurred.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleAssignToTrip = async () => {
    if (!selectedTripId) return;

    setIsAssigning(true);
    try {
      const result = await onAssignToTrip(selectedTripId);
      if (result.success) {
        toast({
          title: 'Assigned to Trip',
          description: 'This load has been added to the trip.',
        });
        setSelectedTripId('');
        router.refresh();
      } else {
        toast({
          title: 'Failed to assign',
          description: result.error || 'An error occurred.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Post to Marketplace - only show for draft loads */}
      {isDraft && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowPostModal(true)}
          className="gap-2"
        >
          <Store className="h-4 w-4" />
          Post to Marketplace
        </Button>
      )}

      {/* Already posted indicator */}
      {isPosted && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
          <Store className="h-3.5 w-3.5" />
          On Marketplace
        </span>
      )}

      {/* Assign to Trip */}
      {trips.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedTripId} onValueChange={setSelectedTripId}>
            <SelectTrigger className="w-[240px] h-9">
              <SelectValue placeholder="Assign to trip..." />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {formatTripLabel(trip)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAssignToTrip}
            disabled={!selectedTripId || isAssigning}
            className="gap-2"
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Route className="h-4 w-4" />
            )}
            Assign
          </Button>
        </div>
      )}

      {/* Post to Marketplace Confirmation Dialog */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Post to Marketplace
            </DialogTitle>
            <DialogDescription>
              This will make the load visible to carriers on the marketplace. They can request to haul it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Once posted, you&apos;ll receive requests from interested carriers that you can review and accept.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handlePostToMarketplace} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post to Marketplace'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

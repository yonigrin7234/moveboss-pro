'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface RequestActionsProps {
  requestId: string;
  loadId: string;
  carrierId: string;
}

export function RequestActions({ requestId, loadId, carrierId }: RequestActionsProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const supabase = createClient();

      // 1. Update the request status to accepted
      const { error: requestError } = await supabase
        .from('load_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // 2. Update the load with assigned carrier
      const { error: loadError } = await supabase
        .from('loads')
        .update({
          assigned_carrier_id: carrierId,
          assigned_at: new Date().toISOString(),
          posting_status: 'assigned',
        })
        .eq('id', loadId);

      if (loadError) throw loadError;

      // 3. Decline all other pending requests for this load
      const { error: declineError } = await supabase
        .from('load_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
          response_message: 'Another carrier was selected',
        })
        .eq('load_id', loadId)
        .eq('status', 'pending')
        .neq('id', requestId);

      if (declineError) {
        console.error('Error declining other requests:', declineError);
        // Don't throw - the main accept was successful
      }

      setAcceptDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('load_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      setDeclineDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline request. Please try again.');
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={isAccepting || isDeclining}>
            {isAccepting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Accept
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this carrier?</DialogTitle>
            <DialogDescription>
              This will assign the load to this carrier. All other pending requests for this load
              will be automatically declined.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Carrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isAccepting || isDeclining}>
            {isDeclining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Decline
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this request?</DialogTitle>
            <DialogDescription>
              The carrier will be notified that their request was not accepted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isDeclining}
            >
              {isDeclining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

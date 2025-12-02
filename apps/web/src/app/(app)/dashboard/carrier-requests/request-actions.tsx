'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface BalanceInfo {
  totalOwed: number;  // They owe us
  totalOwing: number; // We owe them
  netBalance: number; // Positive = they owe us
}

interface RequestActionsProps {
  requestId: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  balance?: BalanceInfo;
  // Rate info for updating the load when accepting
  carrierRate: number | null;
  carrierRateType?: string;
  cubicFeetEstimate?: number | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RequestActions({ requestId, loadId, carrierId, carrierName, balance, carrierRate, carrierRateType, cubicFeetEstimate }: RequestActionsProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [acknowledgedBalance, setAcknowledgedBalance] = useState(false);

  // Check if there's an open balance
  const hasOpenBalance = balance && (balance.totalOwed > 0 || balance.totalOwing > 0);

  // Reset acknowledgment when dialog closes
  const handleAcceptDialogChange = (open: boolean) => {
    setAcceptDialogOpen(open);
    if (!open) {
      setAcknowledgedBalance(false);
    }
  };

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

      // 2. Update the load with assigned carrier and rate
      const loadUpdate: Record<string, unknown> = {
        assigned_carrier_id: carrierId,
        carrier_assigned_at: new Date().toISOString(),
        posting_status: 'assigned',
        load_status: 'pending', // Carrier needs to confirm
        is_marketplace_visible: false,
      };

      // Set the carrier rate from the request
      if (carrierRate !== null) {
        loadUpdate.carrier_rate = carrierRate;
        loadUpdate.carrier_rate_type = carrierRateType || 'per_cuft';
      }

      // Copy cubic_feet_estimate to cubic_feet if not already set
      if (cubicFeetEstimate) {
        loadUpdate.cubic_feet = cubicFeetEstimate;
      }

      const { error: loadError } = await supabase
        .from('loads')
        .update(loadUpdate)
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

  // Determine if accept button should be disabled
  const acceptDisabled = isAccepting || (hasOpenBalance && !acknowledgedBalance);

  return (
    <div className="flex items-center gap-2">
      <Dialog open={acceptDialogOpen} onOpenChange={handleAcceptDialogChange}>
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

          {/* Balance Warning */}
          {hasOpenBalance && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Open balance with {carrierName}
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {balance!.netBalance > 0 ? (
                      <>They owe you <span className="font-semibold">{formatCurrency(balance!.totalOwed)}</span></>
                    ) : balance!.netBalance < 0 ? (
                      <>You owe them <span className="font-semibold">{formatCurrency(balance!.totalOwing)}</span></>
                    ) : (
                      <>
                        {formatCurrency(balance!.totalOwed)} owed to you / {formatCurrency(balance!.totalOwing)} you owe
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="acknowledge-balance"
                  checked={acknowledgedBalance}
                  onCheckedChange={(checked) => setAcknowledgedBalance(checked === true)}
                />
                <Label
                  htmlFor="acknowledge-balance"
                  className="text-sm text-amber-700 dark:text-amber-300 cursor-pointer"
                >
                  I acknowledge this balance and want to continue
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAccept} disabled={acceptDisabled}>
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

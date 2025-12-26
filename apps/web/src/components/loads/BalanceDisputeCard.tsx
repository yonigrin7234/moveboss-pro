'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, X, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface BalanceDispute {
  id: string;
  load_id: string;
  driver_id: string;
  original_balance: number;
  driver_note: string | null;
  created_at: string;
  drivers?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface BalanceDisputeCardProps {
  dispute: BalanceDispute;
  loadNumber: string;
  onResolved?: () => void;
}

type ResolutionType = 'confirmed_zero' | 'balance_updated' | 'cancelled';

export function BalanceDisputeCard({
  dispute,
  loadNumber,
  onResolved,
}: BalanceDisputeCardProps) {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const driverName = dispute.drivers
    ? `${dispute.drivers.first_name} ${dispute.drivers.last_name}`
    : 'Driver';

  const handleResolve = async (resolutionType: ResolutionType) => {
    setIsResolving(true);
    setError(null);

    try {
      const body: {
        disputeId: string;
        resolutionType: ResolutionType;
        newBalance?: number;
        resolutionNote?: string;
      } = {
        disputeId: dispute.id,
        resolutionType,
        resolutionNote: resolutionNote.trim() || undefined,
      };

      if (resolutionType === 'balance_updated') {
        const balanceValue = parseFloat(newBalance);
        if (isNaN(balanceValue) || balanceValue < 0) {
          setError('Please enter a valid balance amount');
          setIsResolving(false);
          return;
        }
        body.newBalance = balanceValue;
      }

      const response = await fetch('/api/balance-disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resolve dispute');
        setIsResolving(false);
        return;
      }

      // Success - show toast, close dialog, refresh
      setShowUpdateDialog(false);
      setIsResolving(false);

      const successMessage = resolutionType === 'balance_updated'
        ? `Balance updated to $${parseFloat(newBalance).toFixed(2)}. Driver notified.`
        : resolutionType === 'confirmed_zero'
        ? 'Balance confirmed as $0. Driver notified.'
        : 'Dispute dismissed. Driver notified.';

      toast({
        title: 'Dispute Resolved',
        description: successMessage,
      });

      router.refresh();
      onResolved?.();
    } catch (err) {
      setError('Failed to resolve dispute. Please try again.');
      setIsResolving(false);
    }
  };

  const createdAt = new Date(dispute.created_at);
  const timeAgo = getTimeAgo(createdAt);

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                  Balance Dispute
                </CardTitle>
                <CardDescription className="text-amber-600/80 dark:text-amber-500/80">
                  {driverName} reported incorrect balance {timeAgo}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-background/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reported Balance:</span>
              <span className="font-medium">
                ${dispute.original_balance.toFixed(2)}
              </span>
            </div>
            {dispute.driver_note && (
              <div className="text-sm">
                <span className="text-muted-foreground">Driver Note:</span>
                <p className="mt-1 text-foreground italic">
                  "{dispute.driver_note}"
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve('confirmed_zero')}
              disabled={isResolving}
              className="flex-1 min-w-[120px]"
            >
              {isResolving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm $0
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUpdateDialog(true)}
              disabled={isResolving}
              className="flex-1 min-w-[120px]"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Update Balance
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResolve('cancelled')}
              disabled={isResolving}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Update Balance Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Balance for {loadNumber}</DialogTitle>
            <DialogDescription>
              Enter the correct balance amount. {driverName} will be notified of
              the update.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newBalance">Correct Balance Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="newBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolutionNote">Note (optional)</Label>
              <Textarea
                id="resolutionNote"
                placeholder="e.g., Balance adjusted per customer contract"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleResolve('balance_updated')}
              disabled={isResolving || !newBalance}
            >
              {isResolving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update & Notify Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Undo2, XCircle, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceActionsProps {
  loadId: string;
  postingStatus: string | null;
  carrierId?: string; // Only for carriers releasing loads
  isOwner?: boolean;
  onSuccess?: () => void;
}

export function MarketplaceActions({
  loadId,
  postingStatus,
  carrierId,
  isOwner = false,
  onSuccess,
}: MarketplaceActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleAction = async (action: 'release' | 'unpublish' | 'cancel' | 'repost') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/marketplace/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          loadId,
          carrierId: action === 'release' ? carrierId : undefined,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      const messages: Record<string, string> = {
        release: 'Load released back to marketplace',
        unpublish: 'Load removed from marketplace',
        cancel: 'Load cancelled',
        repost: 'Load reposted to marketplace',
      };

      toast({ description: messages[action] });
      setReason('');
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carrier can release if they're assigned
  if (carrierId && postingStatus === 'assigned') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-600 hover:bg-yellow-50">
            <Undo2 className="h-4 w-4 mr-2" />
            Release Load
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Load?</AlertDialogTitle>
            <AlertDialogDescription>
              This will return the load to the marketplace where other carriers can claim it.
              Your loads given back count will increase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="release-reason">Reason (optional)</Label>
            <Textarea
              id="release-reason"
              placeholder="Why are you releasing this load?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Load</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction('release')}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Release Load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Owner actions
  if (!isOwner) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Unpublish - only for posted loads */}
      {postingStatus === 'posted' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <EyeOff className="h-4 w-4 mr-2" />
              Unpublish
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from Marketplace?</AlertDialogTitle>
              <AlertDialogDescription>
                This will take the load off the marketplace. You can repost it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Posted</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction('unpublish')}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Unpublish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cancel - for posted or assigned loads */}
      {['posted', 'assigned', 'draft'].includes(postingStatus || '') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Load
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Load?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the load and remove it from the marketplace.
                {postingStatus === 'assigned' && ' The assigned carrier will be notified.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Why are you cancelling this load?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Load</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction('cancel')}
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Load
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Repost - for draft or cancelled loads */}
      {['draft', 'cancelled'].includes(postingStatus || '') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Repost
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Repost to Marketplace?</AlertDialogTitle>
              <AlertDialogDescription>
                This will post the load back to the marketplace where carriers can request it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction('repost')}
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Repost Load
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, LogOut } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface PaymentActionsProps {
  locationId: string;
  locationName: string;
  nextPaymentDue: string | null;
  markPaidAction: () => Promise<{ success: boolean; newDueDate?: string; error?: string }>;
  vacateAction: () => Promise<{ success: boolean; error?: string }>;
}

export function PaymentActions({
  locationId,
  locationName,
  nextPaymentDue,
  markPaidAction,
  vacateAction,
}: PaymentActionsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [vacateOpen, setVacateOpen] = useState(false);

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markPaidAction();
      setMarkPaidOpen(false);

      if (result.success) {
        const description = result.newDueDate
          ? 'Next payment due: ' + new Date(result.newDueDate).toLocaleDateString()
          : 'Payment tracking updated.';
        toast({
          title: 'Payment Marked as Paid',
          description,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to mark payment as paid.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleVacate = () => {
    startTransition(async () => {
      const result = await vacateAction();
      setVacateOpen(false);

      if (result.success) {
        toast({
          title: 'Location Vacated',
          description: locationName + ' has been marked as vacated. Payment tracking has been stopped.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to vacate location.',
          variant: 'destructive',
        });
      }
    });
  };

  const currentDueDate = nextPaymentDue ? new Date(nextPaymentDue).toLocaleDateString() : null;

  return (
    <div className="flex gap-2">
      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex-1" disabled={isPending}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Paid
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Payment as Paid?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>This will advance the next payment due date by one month.</p>
                {currentDueDate && (
                  <p className="mt-2">
                    Current due date: <strong>{currentDueDate}</strong>
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid} disabled={isPending}>
              {isPending ? 'Processing...' : 'Confirm Payment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={vacateOpen} onOpenChange={setVacateOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending}>
            <LogOut className="h-4 w-4 mr-2" />
            Vacate
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vacate This Location?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  This will mark <strong>{locationName}</strong> as vacated and stop payment tracking.
                </p>
                <p className="mt-2">
                  You can still view the location but it will no longer appear in payment due alerts.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVacate}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Processing...' : 'Vacate Location'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

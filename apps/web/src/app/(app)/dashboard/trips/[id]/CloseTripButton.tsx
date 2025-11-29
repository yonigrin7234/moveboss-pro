'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CloseTripButtonProps {
  tripId: string;
  action: (
    prevState: { errors?: Record<string, string>; success?: boolean; settlementId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; settlementId?: string } | null>;
}

export function CloseTripButton({ tripId, action }: CloseTripButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Trip settled',
        description: 'Settlement, receivable, and payable were created.',
      });
      router.refresh();
    }
  }, [state?.success, router, toast]);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="trip_id" value={tripId} />
      <Button type="submit" disabled={pending} variant="default">
        {pending ? 'Closing…' : 'Close & Settle Trip'}
      </Button>
      {state?.errors?._form && (
        <span className="text-sm text-destructive">{state.errors._form}</span>
      )}
    </form>
  );
}

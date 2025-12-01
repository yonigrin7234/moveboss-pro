'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSetupProgress } from '@/hooks/use-setup-progress';

interface LoadRequestFormProps {
  loadId: string;
  companyRate: number | null;
  companyRateType: string;
  isOpenToCounter: boolean;
  ratePerCuft: number | null;
  onSubmit: (
    prevState: { error?: string; success?: boolean } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean } | null>;
}

function formatRatePerCuft(rate: number | null): string {
  if (!rate) return 'Make an offer';
  return `$${rate.toFixed(2)}/CF`;
}

export function LoadRequestForm({
  loadId,
  companyRate,
  companyRateType,
  isOpenToCounter,
  ratePerCuft,
  onSubmit,
}: LoadRequestFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { markComplete } = useSetupProgress();
  const [state, formAction, pending] = useActionState(onSubmit, null);

  useEffect(() => {
    if (state?.success) {
      // Mark setup progress for first load (requesting a load counts as accepting one)
      markComplete('first_load_created');
      toast({
        title: 'Request submitted',
        description: 'Your request has been sent to the company.',
      });
      router.push('/dashboard/my-requests');
      router.refresh();
    }
  }, [state?.success, router, toast, markComplete]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="load_id" value={loadId} />

      {state?.error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {state.error}
        </div>
      )}

      {/* Rate Section */}
      {!isOpenToCounter ? (
        <div className="p-4 rounded-lg bg-muted">
          <p className="text-sm font-medium mb-1">Rate per CF</p>
          <p className="text-2xl font-bold">
            {formatRatePerCuft(ratePerCuft)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This is a fixed rate - no counter offers
          </p>
          <input type="hidden" name="request_type" value="accept_listed" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="request_type"
                value="accept_listed"
                className="h-4 w-4"
                defaultChecked
              />
              <div>
                <p className="font-medium">
                  Accept {formatRatePerCuft(ratePerCuft)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Accept the company&apos;s posted rate per cubic foot
                </p>
              </div>
            </label>
          </div>

          <div className="p-3 rounded-lg border">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="request_type"
                value="counter_offer"
                className="h-4 w-4 mt-1"
              />
              <div className="flex-1">
                <p className="font-medium">Make a counter-offer</p>
                <div className="mt-2">
                  <Label htmlFor="counter_offer_rate" className="text-xs">
                    Your Rate per CF ($)
                  </Label>
                  <Input
                    id="counter_offer_rate"
                    name="counter_offer_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={ratePerCuft ? `e.g. ${(ratePerCuft * 0.9).toFixed(2)}` : 'e.g. 2.50'}
                    className="mt-1"
                  />
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Proposed Dates Section */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label className="text-sm font-medium">When can you load?</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor="proposed_load_date_start" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="proposed_load_date_start"
                name="proposed_load_date_start"
                type="date"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="proposed_load_date_end" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="proposed_load_date_end"
                name="proposed_load_date_end"
                type="date"
                className="mt-1"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">When can you deliver?</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor="proposed_delivery_date_start" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="proposed_delivery_date_start"
                name="proposed_delivery_date_start"
                type="date"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="proposed_delivery_date_end" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="proposed_delivery_date_end"
                name="proposed_delivery_date_end"
                type="date"
                className="mt-1"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="message">Message (Optional)</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Add a message to the company..."
          className="mt-1"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Submitting...' : 'Submit Request'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        The company will review your request and respond
      </p>
    </form>
  );
}

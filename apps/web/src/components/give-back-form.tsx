'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Undo2, Loader2 } from 'lucide-react';

interface GiveBackFormProps {
  loadId: string;
  carrierId: string;
  reasonOptions: { value: string; label: string }[];
  onGiveBack: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function GiveBackForm({ loadId, carrierId, reasonOptions, onGiveBack }: GiveBackFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const reasonCode = formData.get('reason_code') as string;

    if (!reasonCode) {
      alert('Please select a reason');
      return;
    }

    startTransition(async () => {
      try {
        const result = await onGiveBack(formData);

        if (result.success) {
          router.refresh();
        } else {
          alert(result.error || 'Failed to give back load');
        }
      } catch (error) {
        console.error('Give back error:', error);
        alert('An error occurred. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input type="hidden" name="load_id" value={loadId} />
      <input type="hidden" name="carrier_id" value={carrierId} />
      <select
        name="reason_code"
        className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
        required
        disabled={isPending}
      >
        <option value="">Select reason...</option>
        {reasonOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-orange-600 hover:text-orange-600 hover:bg-orange-500/10"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Giving Back...
          </>
        ) : (
          <>
            <Undo2 className="h-4 w-4 mr-1" />
            Give Back
          </>
        )}
      </Button>
    </form>
  );
}

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface CancelTripButtonProps {
  cancelAction: () => Promise<void>;
}

export function CancelTripButton({ cancelAction }: CancelTripButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    if (!confirm('Cancel this trip? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      try {
        await cancelAction();
        router.push('/dashboard/trips');
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to cancel trip');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isPending}
      className="px-4 py-2 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Cancelling...' : 'Cancel Trip'}
    </button>
  );
}

// Keep backwards compatibility
export { CancelTripButton as DeleteTripButton };



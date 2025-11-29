'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteTripButtonProps {
  deleteAction: () => Promise<void>;
}

export function DeleteTripButton({ deleteAction }: DeleteTripButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Delete this trip? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAction();
        router.push('/dashboard/trips');
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete trip');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Deleting...' : 'Delete Trip'}
    </button>
  );
}



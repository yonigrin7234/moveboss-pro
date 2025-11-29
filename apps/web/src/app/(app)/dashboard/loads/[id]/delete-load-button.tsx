'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteLoadButtonProps {
  deleteAction: () => Promise<void>;
}

export function DeleteLoadButton({ deleteAction }: DeleteLoadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this load? This action cannot be undone.')) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteAction();
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete load');
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
    >
      {isPending ? 'Deleting...' : 'Delete Load'}
    </button>
  );
}


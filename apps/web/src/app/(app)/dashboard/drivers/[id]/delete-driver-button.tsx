'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DeleteDriverButtonProps {
  deleteAction: () => Promise<void>;
}

export function DeleteDriverButton({ deleteAction }: DeleteDriverButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAction();
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete driver');
      }
    });
  };

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? 'Deleting...' : 'Delete Driver'}
    </Button>
  );
}


'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DeleteCompanyButtonProps {
  deleteAction: () => Promise<void>;
}

export function DeleteCompanyButton({ deleteAction }: DeleteCompanyButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAction();
        router.push('/dashboard/companies');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete company');
      }
    });
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={isPending}
      variant="destructive"
    >
      {isPending ? 'Deleting...' : 'Delete Company'}
    </Button>
  );
}


'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RequestDocumentsButtonProps {
  partnershipId: string;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function RequestDocumentsButton({ partnershipId, action }: RequestDocumentsButtonProps) {
  const [state, formAction, pending] = useActionState(
    async (prevState: { success?: boolean; error?: string } | null, formData: FormData) => {
      try {
        const result = await action(formData);
        return result;
      } catch (error) {
        console.error('Error in requestDocumentsAction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An error occurred' };
      }
    },
    null
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="partnership_id" value={partnershipId} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Requesting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Request Documents
            </>
          )}
        </Button>
      </form>
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert>
          <AlertDescription>Compliance documents requested successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  );
}


'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';

interface UploadFormProps {
  requestId: string;
  carrierId: string;
  status: string;
  rejectionReason?: string | null;
  dueDate?: string | null;
  uploadAction: (formData: FormData) => Promise<{ error?: string } | void>;
}

export function UploadForm({
  requestId,
  carrierId,
  status,
  rejectionReason,
  dueDate,
  uploadAction,
}: UploadFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await uploadAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // Redirect handled by server action, but refresh just in case
        router.refresh();
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">Select File *</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          required
          className="mt-1"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Accepted formats: PDF, DOC, DOCX, JPG, PNG. Max 10MB.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">Upload failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {status === 'rejected' && rejectionReason && (
        <div className="p-3 bg-red-500/10 rounded-lg flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">Previous upload rejected</p>
            <p className="text-sm text-red-600">{rejectionReason}</p>
          </div>
        </div>
      )}

      {dueDate && (
        <p className="text-sm text-muted-foreground">
          Due by: {new Date(dueDate).toLocaleDateString()}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </>
        )}
      </Button>
    </form>
  );
}

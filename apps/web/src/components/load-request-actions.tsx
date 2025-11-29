'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ComplianceWarning } from '@/components/compliance-warning';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ComplianceIssue {
  type: string;
  item: string;
  message: string;
  severity: 'warning' | 'urgent' | 'critical' | 'expired';
}

interface LoadRequestActionsProps {
  requestId: string;
  acceptedCompanyRate: boolean;
  offeredRate: number | null;
  complianceIssues: ComplianceIssue[];
  blockOnExpired?: boolean;
  acceptAction: (formData: FormData) => Promise<void>;
  declineAction: (formData: FormData) => Promise<void>;
}

export function LoadRequestActions({
  requestId,
  acceptedCompanyRate,
  offeredRate,
  complianceIssues,
  blockOnExpired = false,
  acceptAction,
  declineAction,
}: LoadRequestActionsProps) {
  const [showWarning, setShowWarning] = useState(complianceIssues.length > 0);
  const [isPending, startTransition] = useTransition();

  const hasExpired = complianceIssues.some((i) => i.severity === 'expired');
  const canProceed = blockOnExpired ? !hasExpired : true;

  function handleAccept() {
    const formData = new FormData();
    formData.append('request_id', requestId);
    startTransition(() => {
      acceptAction(formData);
    });
  }

  function handleDecline() {
    const formData = new FormData();
    formData.append('request_id', requestId);
    formData.append('reason', '');
    startTransition(() => {
      declineAction(formData);
    });
  }

  function handleProceed() {
    setShowWarning(false);
    handleAccept();
  }

  return (
    <>
      {showWarning && complianceIssues.length > 0 && (
        <ComplianceWarning
          issues={complianceIssues}
          onProceed={canProceed ? handleProceed : undefined}
          onCancel={() => setShowWarning(false)}
          proceedLabel={`Accept Anyway${!acceptedCompanyRate && offeredRate ? ` at $${offeredRate}/cf` : ''}`}
          cancelLabel="Review Later"
          blockOnExpired={blockOnExpired}
        />
      )}

      {!showWarning && (
        <>
          <Separator />
          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accept
              {!acceptedCompanyRate && offeredRate && ` at $${offeredRate}/cf`}
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              disabled={isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </>
      )}
    </>
  );
}

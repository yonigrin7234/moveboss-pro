'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Check, Loader2, AlertCircle, Handshake } from 'lucide-react';
import { acceptPartnershipAction, declinePartnershipAction } from './actions';

interface Company {
  id: string;
  name: string;
  is_carrier: boolean;
  is_broker: boolean;
  is_agent: boolean;
}

interface AcceptPartnershipClientProps {
  invitation: {
    id: string;
    from_company_name: string;
    from_company_id: string;
    relationship_type: string;
    message: string | null;
    expires_at: string;
  };
  token: string;
  userCompanies: Company[];
  hasCompanies: boolean;
}

const relationshipLabels: Record<string, string> = {
  gives_loads: 'They will give you loads',
  takes_loads: 'They are looking for loads',
  mutual: 'Mutual partnership',
};

export function AcceptPartnershipClient({
  invitation,
  token,
  userCompanies,
  hasCompanies,
}: AcceptPartnershipClientProps) {
  const router = useRouter();
  // Filter out the sending company from selection options
  const eligibleCompaniesForSelection = userCompanies.filter(c => c.id !== invitation.from_company_id);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    eligibleCompaniesForSelection.length === 1 ? eligibleCompaniesForSelection[0].id : ''
  );
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!selectedCompanyId) {
      setError('Please select a company');
      return;
    }

    setIsAccepting(true);
    setError(null);

    const result = await acceptPartnershipAction(token, selectedCompanyId);

    if (!result.success) {
      setError(result.error || 'Failed to accept invitation');
      setIsAccepting(false);
      return;
    }

    setAccepted(true);
    setTimeout(() => {
      router.push('/dashboard/partnerships');
    }, 2000);
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError(null);

    const result = await declinePartnershipAction(token);

    if (!result.success) {
      setError(result.error || 'Failed to decline invitation');
      setIsDeclining(false);
      return;
    }

    router.push('/dashboard');
  };

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Partnership Established!</h2>
            <p className="text-muted-foreground">
              You are now partners with {invitation.from_company_name}. Redirecting to partnerships...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle>No Company Found</CardTitle>
            <CardDescription>
              You need to complete onboarding and set up your company before accepting partnership invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/onboarding')}>
              Complete Onboarding
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if all user companies are the same as the sender (can't accept own invitation)
  const eligibleCompanies = userCompanies.filter(c => c.id !== invitation.from_company_id);
  const canAccept = eligibleCompanies.length > 0;

  if (!canAccept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle>Cannot Accept This Invitation</CardTitle>
            <CardDescription>
              This invitation was sent from {invitation.from_company_name}, which is the same company on your account.
              You cannot create a partnership between a company and itself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2"><strong>Why am I seeing this?</strong></p>
              <p>This invitation link was meant for someone else (the email recipient). If you received this email, you may need to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Log out and create a new account for the receiving company</li>
                <li>Or forward this invitation to the correct person</li>
              </ul>
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/partnerships')}>
              Back to Partnerships
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Partnership Invitation</CardTitle>
          <CardDescription>
            {invitation.from_company_name} wants to partner with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="font-medium">{invitation.from_company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="secondary">
                {relationshipLabels[invitation.relationship_type] || invitation.relationship_type}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires</span>
              <span className="text-sm">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {invitation.message && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                &ldquo;{invitation.message}&rdquo;
              </p>
            </div>
          )}

          {eligibleCompaniesForSelection.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select your company</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a company" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCompaniesForSelection.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {eligibleCompaniesForSelection.length === 1 && (
            <div className="text-sm text-muted-foreground">
              Accepting as: <strong>{eligibleCompaniesForSelection[0].name}</strong>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining || !selectedCompanyId}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Partnership'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                'Decline'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

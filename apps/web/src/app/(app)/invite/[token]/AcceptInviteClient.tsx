'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, Loader2, AlertCircle } from 'lucide-react';
import { getPresetLabel } from '@/lib/permissions';
import { acceptInvitation } from '@/app/(app)/dashboard/settings/team/actions';
import type { PermissionPreset } from '@/lib/permissions';

interface AcceptInviteClientProps {
  invitation: {
    id: string;
    email: string;
    company_name: string;
    permission_preset: PermissionPreset | null;
    expires_at: string;
  };
  token: string;
  isSignedIn: boolean;
  emailMatches: boolean;
  userEmail: string;
}

export function AcceptInviteClient({
  invitation,
  token,
  isSignedIn,
  emailMatches,
  userEmail,
}: AcceptInviteClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    const result = await acceptInvitation(token);

    if (!result.success) {
      setError(result.error || 'Failed to accept invitation');
      setIsAccepting(false);
      return;
    }

    setAccepted(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Welcome to the team!</h2>
            <p className="text-muted-foreground">
              You&apos;ve successfully joined {invitation.company_name}. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!emailMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to a different email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Invitation for:</span>{' '}
                <strong>{invitation.email}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Signed in as:</span>{' '}
                <strong>{userEmail}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Please sign in with the correct email address or ask your admin to send a new invitation.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login?signout=true')}
            >
              Sign in with different account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invitation.company_name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a team member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="font-medium">{invitation.company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary">
                {getPresetLabel(invitation.permission_preset)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm">{invitation.email}</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/')}
              disabled={isAccepting}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

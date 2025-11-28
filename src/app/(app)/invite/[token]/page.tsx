import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getInvitationByToken } from '@/app/(app)/dashboard/settings/team/actions';
import { AcceptInviteClient } from './AcceptInviteClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  // Get invitation details
  const { invitation, error } = await getInvitationByToken(token);

  if (!invitation || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Invalid Invitation</h1>
          <p className="text-muted-foreground">
            This invitation link is invalid or has expired. Please ask your team admin for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // If not signed in, redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent(`/invite/${token}`);
    redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Check if user's email matches
  const emailMatches = user.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <AcceptInviteClient
      invitation={invitation}
      token={token}
      isSignedIn={!!user}
      emailMatches={emailMatches}
      userEmail={user.email || ''}
    />
  );
}

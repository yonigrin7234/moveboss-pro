import { redirect } from 'next/navigation';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getInvitationByToken } from '@/data/partnerships';
import { AcceptPartnershipClient } from './AcceptPartnershipClient';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptPartnershipInvitePage({ params }: PageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  // Get invitation details
  const { invitation, error } = await getInvitationByToken(token);

  if (!invitation || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Invalid Invitation</h1>
            <p className="text-muted-foreground">
              {error || 'This invitation link is invalid or has expired. Please contact the company that sent it for a new invitation.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not signed in, redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent(`/invitation/${token}`);
    redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Get user's companies
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, is_carrier, is_broker, is_agent')
    .eq('owner_id', user.id);

  const userCompanies = companies || [];

  // Handle from_company array case
  const fromCompany = Array.isArray(invitation.from_company)
    ? invitation.from_company[0]
    : invitation.from_company;

  return (
    <AcceptPartnershipClient
      invitation={{
        id: invitation.id,
        from_company_name: fromCompany?.name || 'Unknown Company',
        from_company_id: invitation.from_company_id,
        relationship_type: invitation.relationship_type,
        message: invitation.message,
        expires_at: invitation.expires_at,
      }}
      token={token}
      userCompanies={userCompanies}
      hasCompanies={userCompanies.length > 0}
    />
  );
}

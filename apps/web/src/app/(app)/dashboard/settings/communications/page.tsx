import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { getPartnershipsByStatus, type Partnership } from '@/data/partnerships';
import { CommunicationSettingsClient } from './client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Building2 } from 'lucide-react';

interface PartnerInfo {
  id: string;
  name: string;
  type: string;
}

export default async function CommunicationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const workspaceCompany = await getWorkspaceCompanyForUser(user.id);
  if (!workspaceCompany) {
    return (
      <div className="container py-6 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              No company found. Please set up your company profile first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get active partnerships
  const partnerships = await getPartnershipsByStatus(user.id, 'active');

  // Extract partner info from partnerships
  const partners: PartnerInfo[] = partnerships.map((p: Partnership) => {
    // Determine which company is the partner (not the user's workspace company)
    const isCompanyA = p.company_a_id === workspaceCompany.id;
    const partnerCompany = isCompanyA ? p.company_b : p.company_a;

    let type = 'Partner';
    if (partnerCompany?.is_broker) type = 'Broker';
    else if (partnerCompany?.is_agent) type = 'Agent';
    else if (partnerCompany?.is_carrier) type = 'Carrier';

    return {
      id: partnerCompany?.id || '',
      name: partnerCompany?.name || 'Unknown Partner',
      type,
    };
  }).filter((p): p is PartnerInfo => Boolean(p.id));

  return (
    <div className="container py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Communication Settings
        </h1>
        <p className="text-muted-foreground">
          Configure default messaging settings for your partner companies
        </p>
      </div>

      {partners.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Active Partners</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any active partnerships yet. Add partners to configure their communication settings.
              </p>
              <Button asChild>
                <Link href="/dashboard/partnerships">Manage Partnerships</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Partner Communication Settings</CardTitle>
            <CardDescription>
              Select a partner to configure their default driver visibility and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommunicationSettingsClient
              carrierCompanyId={workspaceCompany.id}
              partners={partners}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

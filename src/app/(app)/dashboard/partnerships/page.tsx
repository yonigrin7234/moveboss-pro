import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getPartnerships, getInvitations, type Partnership } from '@/data/partnerships';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Building2,
  Truck,
  Handshake,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  Mail,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-600 dark:text-green-400', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', icon: Clock },
  paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400', icon: PauseCircle },
  terminated: { label: 'Terminated', color: 'bg-red-500/20 text-red-600 dark:text-red-400', icon: XCircle },
};

function PartnershipCard({ partnership }: { partnership: Partnership }) {
  const partner = partnership.company_b;
  const status = statusConfig[partnership.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const partnerType = partner?.is_carrier
    ? 'Carrier'
    : partner?.is_agent
      ? 'Agent'
      : partner?.is_broker
        ? 'Broker'
        : 'Company';

  return (
    <Link href={`/dashboard/partnerships/${partnership.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {partner?.is_carrier ? (
                  <Truck className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{partner?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{partnerType}</p>
              </div>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            {partner?.city && partner?.state && (
              <p className="text-muted-foreground">
                {partner.city}, {partner.state}
              </p>
            )}
            {partner?.mc_number && <p className="text-muted-foreground">MC# {partner.mc_number}</p>}
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <span className="text-muted-foreground">{partnership.total_loads} loads</span>
              <span className="font-medium">${(partnership.total_revenue || 0).toLocaleString()}</span>
            </div>
          </div>

          {partner?.compliance_status !== 'complete' && partnership.status === 'active' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
              <AlertCircle className="h-3 w-3" />
              Compliance issues
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function PartnershipsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const partnerships = await getPartnerships(user.id);
  const invitations = await getInvitations(user.id);

  const activePartnerships = partnerships.filter((p) => p.status === 'active');
  const pendingPartnerships = partnerships.filter((p) => p.status === 'pending');
  const pausedPartnerships = partnerships.filter((p) => p.status === 'paused');
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  // Check for compliance issues
  const complianceIssues = partnerships.filter(
    (p) =>
      p.status === 'active' &&
      (p.company_a?.compliance_status !== 'complete' || p.company_b?.compliance_status !== 'complete')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partnerships</h1>
          <p className="text-muted-foreground">Manage relationships with carriers and companies</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/partnerships/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Handshake className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePartnerships.length}</p>
                <p className="text-sm text-muted-foreground">Active Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activePartnerships.filter((p) => p.company_b?.is_carrier).length}
                </p>
                <p className="text-sm text-muted-foreground">Carriers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activePartnerships.filter((p) => p.company_b?.is_agent || p.company_b?.is_broker).length}
                </p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alert */}
      {complianceIssues.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-600 dark:text-yellow-400">
                  {complianceIssues.length} partner{complianceIssues.length !== 1 ? 's' : ''} with compliance
                  issues
                </p>
                <p className="text-sm text-muted-foreground">
                  Missing or expired documents. Review and request updated documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activePartnerships.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingPartnerships.length + pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="paused">Paused ({pausedPartnerships.length})</TabsTrigger>
          <TabsTrigger value="all">All ({partnerships.length})</TabsTrigger>
        </TabsList>

        {/* Active Tab */}
        <TabsContent value="active" className="space-y-4 mt-4">
          {activePartnerships.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active partnerships</h3>
                <p className="text-muted-foreground mb-4">Add carriers and companies you work with</p>
                <Button asChild>
                  <Link href="/dashboard/partnerships/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Partner
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePartnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Sent Invitations</h3>
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {invitation.to_company?.name || invitation.to_company_name || invitation.to_email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Sent {new Date(invitation.sent_at).toLocaleDateString()}
                          {' • '}Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Pending</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pendingPartnerships.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Pending Approval</h3>
              {pendingPartnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          )}

          {pendingInvitations.length === 0 && pendingPartnerships.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending partnerships or invitations
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Paused Tab */}
        <TabsContent value="paused" className="space-y-4 mt-4">
          {pausedPartnerships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No paused partnerships
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pausedPartnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {partnerships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">No partnerships yet</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

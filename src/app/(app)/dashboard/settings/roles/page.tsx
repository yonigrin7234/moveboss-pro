import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getMembershipsForUser,
  getPrimaryMembershipForUser,
  getWorkspaceCompanyForUser,
  userCanManageDrivers,
  userCanManageCompanies,
  userCanViewFinance,
} from '@/data/companies';

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [primaryMembership, memberships, workspace] = await Promise.all([
    getPrimaryMembershipForUser(user.id),
    getMembershipsForUser(user.id),
    getWorkspaceCompanyForUser(user.id),
  ]);

  const primaryCompany = primaryMembership?.company ?? workspace;
  const primaryRole = primaryMembership?.role ?? 'owner';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Your workspace role determines what you can access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Primary company</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your main workspace company and role.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {primaryCompany ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{primaryCompany.name}</span>
                <Badge variant="outline">{primaryRole}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">
                  Manage drivers: {primaryMembership ? userCanManageDrivers(primaryMembership) ? 'Yes' : 'No' : 'Yes'}
                </Badge>
                <Badge variant="secondary">
                  Manage companies: {primaryMembership ? userCanManageCompanies(primaryMembership) ? 'Yes' : 'No' : 'Yes'}
                </Badge>
                <Badge variant="secondary">
                  View finance: {primaryMembership ? userCanViewFinance(primaryMembership) ? 'Yes' : 'No' : 'Yes'}
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No primary company is linked. Set one in Settings → Company Profile.
            </p>
          )}
        </CardContent>
      </Card>

      {memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All memberships</CardTitle>
            <p className="text-sm text-muted-foreground">
              Additional companies you belong to.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{m.company?.name ?? m.company_id}</span>
                  <span className="text-xs text-muted-foreground">
                    Role: {m.role} {m.is_primary ? '(Primary)' : ''}
                  </span>
                </div>
                <Badge variant={m.is_primary ? 'default' : 'outline'}>
                  {m.is_primary ? 'Primary' : 'Secondary'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

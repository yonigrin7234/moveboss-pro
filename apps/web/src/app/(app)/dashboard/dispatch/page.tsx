import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentUserPermissions } from '@/lib/supabase-server';
import { AccessDenied } from '@/components/access-denied';
import { getPrimaryCompanyForUser } from '@/data/companies';
import { getCompanyDriverDispatchConversations } from '@/data/conversations';
import { getDriversForUser, type Driver } from '@/data/drivers';
import { DispatchPageClient } from './dispatch-page-client';

export default async function DispatchPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions?.can_manage_drivers) {
    return <AccessDenied message="You don't have permission to access the dispatch console." />;
  }

  const primaryCompany = await getPrimaryCompanyForUser(user.id);

  if (!primaryCompany) {
    return <AccessDenied message="No company membership found." />;
  }

  // Fetch drivers and conversations in parallel
  const [drivers, conversations] = await Promise.all([
    getDriversForUser(user.id, { companyId: primaryCompany.id }),
    getCompanyDriverDispatchConversations(primaryCompany.id, user.id),
  ]);

  // Filter to only active drivers with login enabled
  const messageableDrivers = drivers.filter(
    (d) => d.status === 'active' && d.has_login
  );

  return (
    <DispatchPageClient
      drivers={messageableDrivers}
      conversations={conversations}
      companyId={primaryCompany.id}
      userId={user.id}
    />
  );
}

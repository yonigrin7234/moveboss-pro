import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/supabase-server';
import { getRecentAuditLogs } from '@/lib/audit';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { ActivityPageClient } from './ActivityPageClient';

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Get user's company for filtering
  const company = await getWorkspaceCompanyForUser(user.id);

  // Fetch recent audit logs for this user's company
  const logs = await getRecentAuditLogs(user.id, {
    limit: 50,
    companyId: company?.id,
  });

  return <ActivityPageClient logs={logs} />;
}

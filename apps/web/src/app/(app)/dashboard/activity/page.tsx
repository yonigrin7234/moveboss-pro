import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/supabase-server';
import { getRecentAuditLogs } from '@/lib/audit';
import { ActivityPageClient } from './ActivityPageClient';

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch recent audit logs for this user (RLS handles access control)
  const logs = await getRecentAuditLogs(user.id, { limit: 50 });

  return <ActivityPageClient logs={logs} />;
}

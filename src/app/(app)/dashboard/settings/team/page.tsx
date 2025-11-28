import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getTeamMembers, getPendingInvitations, checkIsAdmin } from './actions';
import { TeamPageClient } from './TeamPageClient';

export default async function TeamPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [{ members }, { invitations }, isAdmin] = await Promise.all([
    getTeamMembers(),
    getPendingInvitations(),
    checkIsAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Team Members</h1>
        <p className="text-sm text-muted-foreground">
          Manage your team members and their permissions.
        </p>
      </div>

      <TeamPageClient
        members={members}
        invitations={invitations}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}

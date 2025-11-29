'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, MoreHorizontal, Mail, Trash2, RefreshCw, Shield, Clock, Users } from 'lucide-react';
import { getPermissionsSummary, getPresetLabel } from '@/lib/permissions';
import type { TeamMember, PendingInvitation } from './actions';
import { removeTeamMember, cancelInvitation, resendInvitation } from './actions';
import { InviteMemberModal } from './InviteMemberModal';
import { EditPermissionsModal } from './EditPermissionsModal';

interface TeamPageClientProps {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  isAdmin: boolean;
}

export function TeamPageClient({ members, invitations, currentUserId, isAdmin }: TeamPageClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<PendingInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    setIsLoading(true);
    const result = await removeTeamMember(removingMember.id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
    setRemovingMember(null);
  };

  const handleCancelInvite = async () => {
    if (!cancelingInvite) return;
    setIsLoading(true);
    const result = await cancelInvitation(cancelingInvite.id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
    setCancelingInvite(null);
  };

  const handleResendInvite = async (invitationId: string) => {
    setIsLoading(true);
    const result = await resendInvitation(invitationId);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
  };

  const getMemberName = (member: TeamMember) => {
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim();
    }
    return member.email.split('@')[0];
  };

  const getInitials = (member: TeamMember) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
    }
    return member.email.slice(0, 2).toUpperCase();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Actions */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Invite someone to get started.
            </div>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={getMemberName(member)}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(member)
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{getMemberName(member)}</p>
                      {member.id === currentUserId && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>

                  {/* Role Badge */}
                  <div className="hidden sm:block">
                    <Badge variant={member.is_admin ? 'default' : 'secondary'}>
                      {member.is_admin ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        getPresetLabel(member.permission_preset)
                      )}
                    </Badge>
                  </div>

                  {/* Permissions Summary */}
                  <div className="hidden md:block text-sm text-muted-foreground max-w-[200px] truncate">
                    {getPermissionsSummary(member).join(', ')}
                  </div>

                  {/* Actions */}
                  {isAdmin && member.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingMember(member)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Edit Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setRemovingMember(member)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{invitation.email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Expires {formatDate(invitation.expires_at)}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <Badge variant="secondary">
                    {getPresetLabel(invitation.permission_preset)}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleResendInvite(invitation.id)}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setCancelingInvite(invitation)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <InviteMemberModal open={isInviteOpen} onOpenChange={setIsInviteOpen} />

      {/* Edit Permissions Modal */}
      <EditPermissionsModal
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember && (
                <>
                  Are you sure you want to remove <strong>{getMemberName(removingMember)}</strong> from your team?
                  They will lose access to your company&apos;s data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!cancelingInvite} onOpenChange={(open) => !open && setCancelingInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelingInvite && (
                <>
                  Are you sure you want to cancel the invitation to <strong>{cancelingInvite.email}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Canceling...' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

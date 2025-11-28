'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  PERMISSION_PRESETS,
  PERMISSION_GROUPS,
  detectPreset,
  type PermissionKey,
  type PermissionPreset,
} from '@/lib/permissions';
import { inviteTeamMember } from './actions';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberModal({ open, onOpenChange }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [preset, setPreset] = useState<PermissionPreset>('dispatcher');
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(
    PERMISSION_PRESETS.dispatcher.permissions
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (newPreset: PermissionPreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      setPermissions({ ...PERMISSION_PRESETS[newPreset].permissions });
    }
  };

  const handlePermissionChange = (key: PermissionKey, checked: boolean) => {
    const newPermissions = { ...permissions, [key]: checked };
    setPermissions(newPermissions);
    setPreset(detectPreset(newPermissions));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    const result = await inviteTeamMember(email, preset, permissions);

    if (!result.success) {
      setError(result.error || 'Failed to send invitation');
      setIsSubmitting(false);
      return;
    }

    // Reset form and close
    setEmail('');
    setPreset('dispatcher');
    setPermissions(PERMISSION_PRESETS.dispatcher.permissions);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They&apos;ll receive an email with a link to accept.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Role Preset */}
          <div className="space-y-2">
            <Label htmlFor="preset">Role</Label>
            <Select
              value={preset}
              onValueChange={(value) => handlePresetChange(value as PermissionPreset)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERMISSION_PRESETS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{config.label}</span>
                      <span className="text-xs text-muted-foreground">{config.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label>Permissions</Label>
            <div className="space-y-4 rounded-lg border p-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.name} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{group.name}</h4>
                  <div className="grid gap-2">
                    {group.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-start gap-3">
                        <Checkbox
                          id={perm.key}
                          checked={permissions[perm.key]}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.key, checked === true)
                          }
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor={perm.key}
                          className="flex-1 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          <span className="font-medium">{perm.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

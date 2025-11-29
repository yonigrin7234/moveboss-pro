'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { updateMemberPermissions } from './actions';
import type { TeamMember } from './actions';

interface EditPermissionsModalProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPermissionsModal({ member, open, onOpenChange }: EditPermissionsModalProps) {
  const [preset, setPreset] = useState<PermissionPreset>('custom');
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(
    PERMISSION_PRESETS.custom.permissions
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      const currentPermissions: Record<PermissionKey, boolean> = {
        can_post_pickups: member.can_post_pickups,
        can_post_loads: member.can_post_loads,
        can_manage_carrier_requests: member.can_manage_carrier_requests,
        can_manage_drivers: member.can_manage_drivers,
        can_manage_vehicles: member.can_manage_vehicles,
        can_manage_trips: member.can_manage_trips,
        can_manage_loads: member.can_manage_loads,
        can_view_financials: member.can_view_financials,
        can_manage_settlements: member.can_manage_settlements,
      };
      setPermissions(currentPermissions);
      setPreset(member.permission_preset || detectPreset(currentPermissions));
    }
  }, [member]);

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
    if (!member) return;

    setError(null);
    setIsSubmitting(true);

    const result = await updateMemberPermissions(member.id, preset, permissions);

    if (!result.success) {
      setError(result.error || 'Failed to update permissions');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
    }
    onOpenChange(open);
  };

  const getMemberName = () => {
    if (!member) return '';
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim();
    }
    return member.email.split('@')[0];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Update permissions for {getMemberName()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                          id={`edit-${perm.key}`}
                          checked={permissions[perm.key]}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.key, checked === true)
                          }
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor={`edit-${perm.key}`}
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

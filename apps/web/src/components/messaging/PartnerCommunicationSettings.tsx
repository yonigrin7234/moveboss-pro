'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Lock,
  Eye,
  MessageSquare,
  AlertCircle,
  Loader2,
  Save,
  Building2,
} from 'lucide-react';
import type { DriverVisibilityLevel, PartnerCommunicationSettings as PartnerCommSettings } from '@/lib/communication-types';

interface PartnerCommunicationSettingsProps {
  carrierCompanyId: string;
  partnerCompanyId: string;
  partnerCompanyName: string;
  onSettingsUpdated?: () => void;
}

export function PartnerCommunicationSettings({
  carrierCompanyId,
  partnerCompanyId,
  partnerCompanyName,
  onSettingsUpdated,
}: PartnerCommunicationSettingsProps) {
  const [settings, setSettings] = useState<Partial<PartnerCommSettings>>({
    default_driver_visibility: 'none',
    lock_driver_visibility: false,
    allow_driver_partner_direct_messages: false,
    auto_create_shared_conversation: true,
    notify_on_load_status_change: true,
    notify_on_driver_location_update: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/messaging/settings?carrier_company_id=${carrierCompanyId}&partner_company_id=${partnerCompanyId}`
      );

      if (res.ok) {
        const { settings: currentSettings } = await res.json();
        if (currentSettings) {
          setSettings(currentSettings);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [carrierCompanyId, partnerCompanyId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single setting
  const updateSetting = <K extends keyof PartnerCommSettings>(
    key: K,
    value: PartnerCommSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch('/api/messaging/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_type: 'partner_settings',
          carrier_company_id: carrierCompanyId,
          partner_company_id: partnerCompanyId,
          ...settings,
        }),
      });

      if (res.ok) {
        setHasChanges(false);
        onSettingsUpdated?.();
      } else {
        const { error } = await res.json();
        throw new Error(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-500" />
          <div>
            <CardTitle>Communication Settings</CardTitle>
            <CardDescription>
              Configure default messaging settings for {partnerCompanyName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Driver Visibility */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Driver Visibility</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Default visibility for new loads</Label>
                <p className="text-xs text-gray-500">
                  How drivers see shared conversations with this partner
                </p>
              </div>
              <Select
                value={settings.default_driver_visibility}
                onValueChange={(value) =>
                  updateSetting('default_driver_visibility', value as DriverVisibilityLevel)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Hidden
                    </span>
                  </SelectItem>
                  <SelectItem value="read_only">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Read-only
                    </span>
                  </SelectItem>
                  <SelectItem value="full">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Full access
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Lock driver visibility</Label>
                <p className="text-xs text-gray-500">
                  Prevent per-load overrides of the default setting
                </p>
              </div>
              <Switch
                checked={settings.lock_driver_visibility}
                onCheckedChange={(checked) => updateSetting('lock_driver_visibility', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow direct driver-partner messages</Label>
                <p className="text-xs text-gray-500">
                  Let drivers message partner directly (bypassing dispatch)
                </p>
              </div>
              <Switch
                checked={settings.allow_driver_partner_direct_messages}
                onCheckedChange={(checked) =>
                  updateSetting('allow_driver_partner_direct_messages', checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Conversation Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Conversation Settings</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-create shared conversation</Label>
              <p className="text-xs text-gray-500">
                Automatically create shared chat when load is assigned to this partner
              </p>
            </div>
            <Switch
              checked={settings.auto_create_shared_conversation}
              onCheckedChange={(checked) =>
                updateSetting('auto_create_shared_conversation', checked)
              }
            />
          </div>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Notifications</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label>Load status changes</Label>
              <p className="text-xs text-gray-500">
                Notify partner when load status changes
              </p>
            </div>
            <Switch
              checked={settings.notify_on_load_status_change}
              onCheckedChange={(checked) =>
                updateSetting('notify_on_load_status_change', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Driver location updates</Label>
              <p className="text-xs text-gray-500">
                Share driver location with this partner
              </p>
            </div>
            <Switch
              checked={settings.notify_on_driver_location_update}
              onCheckedChange={(checked) =>
                updateSetting('notify_on_driver_location_update', checked)
              }
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

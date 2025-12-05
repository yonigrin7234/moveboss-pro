'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MapPin, DollarSign, Bell, Truck } from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface MatchingSettings {
  min_profit_per_mile: number;
  max_deadhead_miles: number;
  min_match_score: number;
  preferred_return_states: string[];
  excluded_states: string[];
  min_capacity_utilization_percent: number;
  max_capacity_utilization_percent: number;
  notification_preference: string;
  auto_post_capacity_enabled: boolean;
  auto_post_min_capacity_cuft: number;
  default_location_sharing: boolean;
  default_capacity_visibility: string;
}

export default function LoadMatchingSettingsPage() {
  const [settings, setSettings] = useState<MatchingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/matching/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/matching/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      toast({
        title: 'Settings saved',
        description: 'Your load matching preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleState = (state: string, field: 'preferred_return_states' | 'excluded_states') => {
    if (!settings) return;
    const current = settings[field];
    const updated = current.includes(state)
      ? current.filter((s) => s !== state)
      : [...current, state];
    setSettings({ ...settings, [field]: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load settings</p>
        <Button onClick={fetchSettings} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Load Matching Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure how the smart load matching engine finds opportunities for your drivers.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Profitability Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Profitability Criteria
          </CardTitle>
          <CardDescription>
            Set minimum profit requirements for suggested loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minProfitPerMile">Minimum Profit per Mile ($)</Label>
              <Input
                id="minProfitPerMile"
                type="number"
                step="0.25"
                min="0"
                value={settings.min_profit_per_mile}
                onChange={(e) =>
                  setSettings({ ...settings, min_profit_per_mile: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Only suggest loads that meet this profit threshold
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minMatchScore">Minimum Match Score (0-100)</Label>
              <Input
                id="minMatchScore"
                type="number"
                min="0"
                max="100"
                value={settings.min_match_score}
                onChange={(e) =>
                  setSettings({ ...settings, min_match_score: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher scores indicate better matches
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance & Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Distance & Capacity
          </CardTitle>
          <CardDescription>
            Control deadhead distance and capacity utilization requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxDeadhead">Max Deadhead Miles</Label>
              <Input
                id="maxDeadhead"
                type="number"
                min="0"
                value={settings.max_deadhead_miles}
                onChange={(e) =>
                  setSettings({ ...settings, max_deadhead_miles: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum empty miles to pickup
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minCapacity">Min Capacity Utilization (%)</Label>
              <Input
                id="minCapacity"
                type="number"
                min="0"
                max="100"
                value={settings.min_capacity_utilization_percent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_capacity_utilization_percent: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCapacity">Max Capacity Utilization (%)</Label>
              <Input
                id="maxCapacity"
                type="number"
                min="0"
                max="100"
                value={settings.max_capacity_utilization_percent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_capacity_utilization_percent: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Preferences
          </CardTitle>
          <CardDescription>
            Select preferred states for backhaul loads and states to exclude.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Preferred Return States</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Loads heading to these states will score higher
            </p>
            <div className="flex flex-wrap gap-2">
              {US_STATES.map((state) => (
                <Button
                  key={`pref-${state}`}
                  variant={settings.preferred_return_states.includes(state) ? 'default' : 'outline'}
                  size="sm"
                  className="w-12"
                  onClick={() => toggleState(state, 'preferred_return_states')}
                >
                  {state}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Excluded States</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Never suggest loads from or to these states
            </p>
            <div className="flex flex-wrap gap-2">
              {US_STATES.map((state) => (
                <Button
                  key={`excl-${state}`}
                  variant={settings.excluded_states.includes(state) ? 'destructive' : 'outline'}
                  size="sm"
                  className="w-12"
                  onClick={() => toggleState(state, 'excluded_states')}
                >
                  {state}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            How would you like to be notified about new load suggestions?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificationPref">Notification Preference</Label>
            <Select
              value={settings.notification_preference}
              onValueChange={(value) =>
                setSettings({ ...settings, notification_preference: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard_only">Dashboard Only</SelectItem>
                <SelectItem value="push_and_dashboard">Push + Dashboard</SelectItem>
                <SelectItem value="email_digest">Email Digest</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Default Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Driver Settings</CardTitle>
          <CardDescription>
            Default visibility settings for new drivers and trips.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default Location Sharing</Label>
              <p className="text-xs text-muted-foreground">
                Enable GPS tracking by default for new drivers
              </p>
            </div>
            <Switch
              checked={settings.default_location_sharing}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, default_location_sharing: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacityVisibility">Default Capacity Visibility</Label>
            <Select
              value={settings.default_capacity_visibility}
              onValueChange={(value) =>
                setSettings({ ...settings, default_capacity_visibility: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Only You)</SelectItem>
                <SelectItem value="partners_only">Partners Only</SelectItem>
                <SelectItem value="public">Public (Marketplace)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Who can see your driver's available capacity
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Post Available Capacity</Label>
              <p className="text-xs text-muted-foreground">
                Automatically advertise available capacity to the marketplace
              </p>
            </div>
            <Switch
              checked={settings.auto_post_capacity_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_post_capacity_enabled: checked })
              }
            />
          </div>

          {settings.auto_post_capacity_enabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="autoPostMinCapacity">Minimum Capacity to Post (CUFT)</Label>
              <Input
                id="autoPostMinCapacity"
                type="number"
                min="0"
                value={settings.auto_post_min_capacity_cuft}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_post_min_capacity_cuft: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

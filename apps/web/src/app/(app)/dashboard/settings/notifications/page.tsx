import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { ArrowLeft, Mail, Bell, Calendar } from 'lucide-react';

interface EmailPreferences {
  load_status_updates: boolean;
  compliance_alerts: boolean;
  marketplace_activity: boolean;
  driver_assignments: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
}

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Get or create preferences
  let { data: prefs } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!prefs) {
    const { data: newPrefs } = await supabase
      .from('email_preferences')
      .insert({ user_id: user.id })
      .select()
      .single();
    prefs = newPrefs;
  }

  async function updatePreferences(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    const supabaseClient = await createClient();

    await supabaseClient.from('email_preferences').upsert({
      user_id: currentUser.id,
      load_status_updates: formData.get('load_status_updates') === 'on',
      compliance_alerts: formData.get('compliance_alerts') === 'on',
      marketplace_activity: formData.get('marketplace_activity') === 'on',
      driver_assignments: formData.get('driver_assignments') === 'on',
      daily_digest: formData.get('daily_digest') === 'on',
      weekly_digest: formData.get('weekly_digest') === 'on',
      updated_at: new Date().toISOString(),
    });

    revalidatePath('/dashboard/settings/notifications');
  }

  const preferences = [
    {
      id: 'load_status_updates',
      label: 'Load Status Updates',
      description: 'Get notified when loads are accepted, in transit, or delivered',
      icon: Bell,
      enabled: prefs?.load_status_updates ?? true,
    },
    {
      id: 'compliance_alerts',
      label: 'Compliance Alerts',
      description: 'Get notified about expiring documents and compliance requests',
      icon: Bell,
      enabled: prefs?.compliance_alerts ?? true,
    },
    {
      id: 'marketplace_activity',
      label: 'Marketplace Activity',
      description: 'Get notified about new requests, acceptances, and declines',
      icon: Bell,
      enabled: prefs?.marketplace_activity ?? true,
    },
    {
      id: 'driver_assignments',
      label: 'Driver Assignments',
      description: 'Get notified when a driver is assigned to your load',
      icon: Bell,
      enabled: prefs?.driver_assignments ?? true,
    },
    {
      id: 'daily_digest',
      label: 'Daily Digest',
      description: 'Receive a daily summary of your activity',
      icon: Calendar,
      enabled: prefs?.daily_digest ?? false,
    },
    {
      id: 'weekly_digest',
      label: 'Weekly Digest',
      description: 'Receive a weekly summary with insights',
      icon: Calendar,
      enabled: prefs?.weekly_digest ?? false,
    },
  ];

  return (
    <div className="container py-6 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/dashboard/settings/account">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email Notifications
        </h1>
        <p className="text-muted-foreground">Choose which emails you would like to receive</p>
      </div>

      <form action={updatePreferences}>
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Toggle email notifications on or off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {preferences.map((pref) => {
              const Icon = pref.icon;

              return (
                <div key={pref.id} className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <Label htmlFor={pref.id} className="font-medium">
                        {pref.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{pref.description}</p>
                    </div>
                  </div>
                  <Switch id={pref.id} name={pref.id} defaultChecked={pref.enabled} />
                </div>
              );
            })}

            <div className="pt-4 border-t">
              <Button type="submit" className="w-full">
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

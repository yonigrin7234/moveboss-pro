import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import {
  getWorkspacePolicies,
  upsertWorkspacePolicy,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_CATEGORIES,
  type NotificationType,
  type WorkspaceNotificationPolicy,
} from '@/data/notification-policies';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Shield, Mail, Smartphone, MessageSquare, Lock } from 'lucide-react';

export default async function NotificationPoliciesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const company = await getWorkspaceCompanyForUser(user.id);
  if (!company) {
    redirect('/dashboard/settings');
  }

  // Check if user is owner
  const isOwner = company.owner_id === user.id;
  if (!isOwner) {
    redirect('/dashboard/settings');
  }

  const policies = await getWorkspacePolicies(company.id);
  const policyMap = new Map(policies.map((p) => [p.notification_type, p]));

  async function updatePolicy(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    const currentCompany = await getWorkspaceCompanyForUser(currentUser.id);
    if (!currentCompany || currentCompany.owner_id !== currentUser.id) return;

    const notificationType = formData.get('notification_type') as NotificationType;
    if (!notificationType) return;

    await upsertWorkspacePolicy(currentCompany.id, notificationType, {
      in_app_enabled: formData.get('in_app') === 'on',
      push_enabled: formData.get('push') === 'on',
      email_enabled: formData.get('email') === 'on',
      is_mandatory: formData.get('mandatory') === 'on',
    });

    revalidatePath('/dashboard/settings/notification-policies');
  }

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    marketplace: { label: 'Marketplace', icon: <MessageSquare className="h-4 w-4" /> },
    rfd: { label: 'RFD Tracking', icon: <Bell className="h-4 w-4" /> },
    compliance: { label: 'Compliance', icon: <Shield className="h-4 w-4" /> },
    operations: { label: 'Operations', icon: <Bell className="h-4 w-4" /> },
    communication: { label: 'Communication', icon: <Mail className="h-4 w-4" /> },
  };

  return (
    <div className="container py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Workspace Notification Policies
        </h1>
        <p className="text-muted-foreground">
          Configure notification settings for your entire workspace. These settings apply to all team members.
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Mandatory Notifications</p>
              <p className="text-blue-700 dark:text-blue-300">
                When a notification is marked as mandatory, team members cannot disable it. Use this for critical alerts
                like load requests or compliance issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {Object.entries(NOTIFICATION_CATEGORIES).map(([category, types]) => {
        const categoryInfo = categoryLabels[category];

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {categoryInfo.icon}
                {categoryInfo.label}
              </CardTitle>
              <CardDescription>Configure how {categoryInfo.label.toLowerCase()} notifications are sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {types.map((notificationType) => {
                  const policy = policyMap.get(notificationType);
                  const label = NOTIFICATION_TYPE_LABELS[notificationType];

                  return (
                    <form key={notificationType} action={updatePolicy} className="border-b pb-6 last:border-0 last:pb-0">
                      <input type="hidden" name="notification_type" value={notificationType} />

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{label}</Label>
                            {policy?.is_mandatory && (
                              <Badge variant="secondary" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Mandatory
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          {/* In-App */}
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${notificationType}-in_app`} className="text-sm">
                              In-App
                            </Label>
                            <Switch
                              id={`${notificationType}-in_app`}
                              name="in_app"
                              defaultChecked={policy?.in_app_enabled ?? true}
                            />
                          </div>

                          {/* Push */}
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${notificationType}-push`} className="text-sm">
                              Push
                            </Label>
                            <Switch
                              id={`${notificationType}-push`}
                              name="push"
                              defaultChecked={policy?.push_enabled ?? true}
                            />
                          </div>

                          {/* Email */}
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${notificationType}-email`} className="text-sm">
                              Email
                            </Label>
                            <Switch
                              id={`${notificationType}-email`}
                              name="email"
                              defaultChecked={policy?.email_enabled ?? true}
                            />
                          </div>

                          {/* Mandatory */}
                          <div className="flex items-center gap-2 pl-2 border-l">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${notificationType}-mandatory`} className="text-sm">
                              Mandatory
                            </Label>
                            <Switch
                              id={`${notificationType}-mandatory`}
                              name="mandatory"
                              defaultChecked={policy?.is_mandatory ?? false}
                            />
                          </div>

                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </div>
                      </div>
                    </form>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

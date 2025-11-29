import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser } from '@/lib/supabase-server';
import { ensureProfile, upsertProfile } from '@/data/profiles';
import { accountSchema, type AccountFormValues } from '@/lib/validators/account';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AccountFormClient, type AccountFormActionState } from './AccountFormClient';
import { Mail, ChevronRight } from 'lucide-react';

async function updateAccountAction(
  prevState: AccountFormActionState,
  formData: FormData
): Promise<AccountFormActionState> {
  'use server';

  const user = await getCurrentUser();
  if (!user) {
    return { errors: { _form: 'Not authenticated' } };
  }

  const raw: AccountFormValues = {
    full_name: (formData.get('full_name') as string) || '',
    email: (formData.get('email') as string) || '',
    phone: (formData.get('phone') as string) || '',
    timezone: (formData.get('timezone') as string) || 'UTC',
    email_notifications: formData.get('email_notifications') === 'on',
    sms_notifications: formData.get('sms_notifications') === 'on',
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0]?.toString() || '_form';
      errors[key] = issue.message;
    });
    return { errors };
  }

  try {
    await upsertProfile(user.id, {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
      timezone: parsed.data.timezone,
      email_notifications: parsed.data.email_notifications,
      sms_notifications: parsed.data.sms_notifications,
    });
    return { message: 'Account updated.' };
  } catch (error) {
    return {
      errors: {
        _form: error instanceof Error ? error.message : 'Failed to update account',
      },
    };
  }
}

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await ensureProfile(user.id);

  const defaults: AccountFormValues = {
    full_name: profile.full_name || '',
    email: user.email || '',
    phone: profile.phone || '',
    timezone: profile.timezone || 'UTC',
    email_notifications: profile.email_notifications ?? true,
    sms_notifications: profile.sms_notifications ?? false,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account details and notification preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your name, contact info, timezone, and notification preferences.
          </p>
        </CardHeader>
        <CardContent>
          <AccountFormClient defaults={defaults} action={updateAccountAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure which email notifications you receive.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full justify-between">
            <Link href="/dashboard/settings/notifications">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Manage Email Preferences
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

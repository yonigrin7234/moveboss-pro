"use client";

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { type AccountFormValues } from '@/lib/validators/account';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type AccountFormActionState = {
  errors?: Record<string, string>;
  message?: string;
};

type Props = {
  defaults: AccountFormValues;
  action: (prevState: AccountFormActionState, formData: FormData) => Promise<AccountFormActionState>;
};

export function AccountFormClient({ defaults, action }: Props) {
  const [state, formAction, pending] = useActionState<AccountFormActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {state?.errors?._form && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{state.errors._form}</AlertDescription>
        </Alert>
      )}
      {state?.message && (
        <Alert className="py-2">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-sm">{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={defaults.full_name}
            required
          />
          {state?.errors?.full_name && (
            <p className="text-xs text-destructive">{state.errors.full_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            required
            readOnly
          />
          {state?.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email}</p>
          )}
          <p className="text-xs text-muted-foreground">Email updates coming soon.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaults.phone ?? ''}
            placeholder="+1 (555) 123-4567"
          />
          {state?.errors?.phone && (
            <p className="text-xs text-destructive">{state.errors.phone}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={defaults.timezone}
            required
          />
          {state?.errors?.timezone && (
            <p className="text-xs text-destructive">{state.errors.timezone}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Notifications</p>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="email_notifications"
            name="email_notifications"
            defaultChecked={defaults.email_notifications}
          />
          <Label htmlFor="email_notifications">Email notifications</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sms_notifications"
            name="sms_notifications"
            defaultChecked={defaults.sms_notifications}
          />
          <Label htmlFor="sms_notifications">SMS notifications</Label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2, BadgeCheck } from 'lucide-react';

import { type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormAddressFields } from '@/components/ui/address-fields';

export type CompanyProfileActionState = {
  errors?: Record<string, string>;
  message?: string;
};

type Props = {
  defaults: CompanyProfileFormValues;
  action: (prev: CompanyProfileActionState, formData: FormData) => Promise<CompanyProfileActionState>;
  readOnly?: boolean;
  submitLabel?: string;
  redirectTo?: string;
  /** FMCSA verified legal name - if set, shows disclosure about verified identity */
  verifiedLegalName?: string | null;
  /** FMCSA DBA name */
  verifiedDbaName?: string | null;
};

export function CompanyProfileFormClient({
  defaults,
  action,
  readOnly,
  submitLabel,
  redirectTo,
  verifiedLegalName,
  verifiedDbaName,
}: Props) {
  const [state, formAction, pending] = useActionState<CompanyProfileActionState, FormData>(action, {});

  const isVerified = !!verifiedLegalName;

  return (
    <form action={formAction} className="space-y-6">
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
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

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              {isVerified ? 'Display Name' : 'Company Name'}
            </Label>
            <Input id="name" name="name" defaultValue={defaults.name} required disabled={readOnly} readOnly={readOnly} />
            {state?.errors?.name && <p className="text-xs text-destructive">{state.errors.name}</p>}
            {isVerified && (
              <p className="text-xs text-muted-foreground">
                This is how your company appears on MoveBoss. Your verified legal identity will be disclosed to partners.
              </p>
            )}
          </div>
        </div>

        {isVerified && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <BadgeCheck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Verified Legal Identity</p>
              <p className="text-sm text-muted-foreground">
                {verifiedLegalName}
                {verifiedDbaName && verifiedDbaName !== verifiedLegalName && (
                  <span className="block text-xs">DBA: {verifiedDbaName}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                This name from FMCSA records will be shown to carriers and partners when they view your verified status.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dot_number">DOT Number</Label>
          <Input
            id="dot_number"
            name="dot_number"
            defaultValue={defaults.dot_number}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.dot_number && (
            <p className="text-xs text-destructive">{state.errors.dot_number}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mc_number">MC Number</Label>
          <Input
            id="mc_number"
            name="mc_number"
            defaultValue={defaults.mc_number}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.mc_number && (
            <p className="text-xs text-destructive">{state.errors.mc_number}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaults.phone || ''}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.phone && <p className="text-xs text-destructive">{state.errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            defaultValue={defaults.email || ''}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.email && <p className="text-xs text-destructive">{state.errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={defaults.website || ''}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.website && (
            <p className="text-xs text-destructive">{state.errors.website}</p>
          )}
        </div>
      </div>

      <FormAddressFields
        defaultZip={defaults.zip || ''}
        defaultCity={defaults.city}
        defaultState={defaults.state}
        defaultAddress={defaults.address_line1}
        defaultAddress2={defaults.address_line2 || ''}
        showAddress={true}
        showAddress2={true}
        zipRequired={false}
        cityRequired={true}
        stateRequired={true}
        addressRequired={true}
        disabled={readOnly}
        readOnly={readOnly}
        errors={state?.errors || {}}
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          name="notes"
          defaultValue={defaults.notes || ''}
          disabled={readOnly}
          readOnly={readOnly}
        />
        {state?.errors?.notes && <p className="text-xs text-destructive">{state.errors.notes}</p>}
      </div>

      <div className="space-y-3 rounded-lg border border-border/60 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Owner / Primary Contact</p>
          <p className="text-xs text-muted-foreground">Main contact for the workspace company.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner_name">Owner full name</Label>
            <Input
              id="owner_name"
              name="owner_name"
              defaultValue={defaults.owner_name}
              required
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.owner_name && <p className="text-xs text-destructive">{state.errors.owner_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_role">Role / title</Label>
            <Input
              id="owner_role"
              name="owner_role"
              defaultValue={defaults.owner_role || ''}
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.owner_role && <p className="text-xs text-destructive">{state.errors.owner_role}</p>}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="owner_phone">Phone</Label>
            <Input
              id="owner_phone"
              name="owner_phone"
              defaultValue={defaults.owner_phone}
              required
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.owner_phone && <p className="text-xs text-destructive">{state.errors.owner_phone}</p>}
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="owner_email">Email</Label>
            <Input
              id="owner_email"
              name="owner_email"
              type="email"
              defaultValue={defaults.owner_email}
              required
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.owner_email && <p className="text-xs text-destructive">{state.errors.owner_email}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed border-border/60 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Secondary Contact (optional)</p>
          <p className="text-xs text-muted-foreground">Backup contact for the workspace company.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="secondary_contact_name">Name</Label>
            <Input
              id="secondary_contact_name"
              name="secondary_contact_name"
              defaultValue={defaults.secondary_contact_name || ''}
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.secondary_contact_name && (
              <p className="text-xs text-destructive">{state.errors.secondary_contact_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_contact_phone">Phone</Label>
            <Input
              id="secondary_contact_phone"
              name="secondary_contact_phone"
              defaultValue={defaults.secondary_contact_phone || ''}
              disabled={readOnly}
              readOnly={readOnly}
            />
            {state?.errors?.secondary_contact_phone && (
              <p className="text-xs text-destructive">{state.errors.secondary_contact_phone}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary_contact_email">Email</Label>
          <Input
            id="secondary_contact_email"
            name="secondary_contact_email"
            type="email"
            defaultValue={defaults.secondary_contact_email || ''}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {state?.errors?.secondary_contact_email && (
            <p className="text-xs text-destructive">{state.errors.secondary_contact_email}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        {!readOnly && (
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : submitLabel || 'Save changes'}
          </Button>
        )}
      </div>
    </form>
  );
}

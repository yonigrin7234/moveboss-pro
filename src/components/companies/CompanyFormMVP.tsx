'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type NewCompanyInput } from '@/data/companies';

interface CompanyFormMVPProps {
  initialData?: Partial<NewCompanyInput>;
  onSubmit: (
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string> } | null>;
  submitLabel?: string;
}

export function CompanyFormMVP({
  initialData,
  onSubmit,
  submitLabel = 'Create Company',
}: CompanyFormMVPProps) {
  const [state, formAction, pending] = useActionState(onSubmit, null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.errors?._form && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {state.errors._form}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initialData?.name}
            />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal_name" className="text-foreground">
              Legal Name
            </Label>
            <Input
              id="legal_name"
              name="legal_name"
              defaultValue={initialData?.legal_name}
            />
            {state?.errors?.legal_name && (
              <p className="text-sm text-destructive">{state.errors.legal_name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_type" className="text-foreground">
                Company Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="company_type"
                name="company_type"
                required
                defaultValue={initialData?.company_type}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select type</option>
                <option value="carrier">Carrier</option>
                <option value="broker">Broker</option>
                <option value="carrier_broker">Carrier + Broker</option>
                <option value="shipper">Shipper</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="other">Other</option>
              </select>
              {state?.errors?.company_type && (
                <p className="text-sm text-destructive">{state.errors.company_type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship_role" className="text-foreground">
                Relationship Role <span className="text-destructive">*</span>
              </Label>
              <select
                id="relationship_role"
                name="relationship_role"
                required
                defaultValue={initialData?.relationship_role}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select role</option>
                <option value="takes_loads_from">Takes Loads From</option>
                <option value="gives_loads_to">Gives Loads To</option>
                <option value="both">Both</option>
              </select>
              {state?.errors?.relationship_role && (
                <p className="text-sm text-destructive">{state.errors.relationship_role}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-foreground">
              Status
            </Label>
            <select
              id="status"
              name="status"
              defaultValue={initialData?.status || 'active'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
            {state?.errors?.status && (
              <p className="text-sm text-destructive">{state.errors.status}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dot_number" className="text-foreground">
                DOT Number
              </Label>
              <Input
                id="dot_number"
                name="dot_number"
                defaultValue={initialData?.dot_number}
              />
              {state?.errors?.dot_number && (
                <p className="text-sm text-destructive">{state.errors.dot_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mc_number" className="text-foreground">
                MC Number
              </Label>
              <Input
                id="mc_number"
                name="mc_number"
                defaultValue={initialData?.mc_number}
              />
              {state?.errors?.mc_number && (
                <p className="text-sm text-destructive">{state.errors.mc_number}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground">
                City
              </Label>
              <Input
                id="city"
                name="city"
                defaultValue={initialData?.city}
              />
              {state?.errors?.city && (
                <p className="text-sm text-destructive">{state.errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-foreground">
                State
              </Label>
              <Input
                id="state"
                name="state"
                defaultValue={initialData?.state}
              />
              {state?.errors?.state && (
                <p className="text-sm text-destructive">{state.errors.state}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button type="submit" disabled={pending} className="flex-1 md:flex-none">
            {pending ? 'Saving...' : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href="/dashboard/companies">Cancel</Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}


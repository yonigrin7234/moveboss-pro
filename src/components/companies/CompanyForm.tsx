'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import { type NewCompanyInput } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyFormProps {
  initialData?: Partial<NewCompanyInput>;
  onSubmit: (
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string> } | null>;
  submitLabel?: string;
  cancelHref?: string;
}

async function lookupZip(postalCode: string, country: string = 'US'): Promise<{
  city: string | null;
  state: string | null;
}> {
  if (!postalCode) {
    return { city: null, state: null };
  }

  // Normalize country code (USA -> US)
  const normalizedCountry = country === 'USA' ? 'US' : country;
  
  if (normalizedCountry !== 'US') {
    return { city: null, state: null };
  }

  try {
    const response = await fetch(`/api/zip-lookup?postal_code=${encodeURIComponent(postalCode)}&country=${encodeURIComponent(normalizedCountry)}`);
    if (!response.ok) {
      return { city: null, state: null };
    }
    return await response.json();
  } catch {
    return { city: null, state: null };
  }
}

// Helper component for Select with hidden input for form submission
function SelectWithHiddenInput({
  name,
  defaultValue,
  required,
  children,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(defaultValue || '');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = value;
    }
  }, [value]);

  return (
    <>
      <Select value={value || undefined} onValueChange={setValue} required={required}>
        {children}
      </Select>
      <input type="hidden" name={name} ref={hiddenInputRef} value={value} />
    </>
  );
}

const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Company details' },
  { id: 'address', title: 'Company Address', description: 'Main location' },
  { id: 'primary', title: 'Primary Contact', description: 'Owner/Contact' },
  { id: 'dispatch', title: 'Dispatch Contact', description: 'Loading contact' },
  { id: 'billing', title: 'Billing', description: 'Billing address' },
];

export function CompanyForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Company',
  cancelHref = '/dashboard/companies',
}: CompanyFormProps) {
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const [currentStep, setCurrentStep] = useState(0);
  const [zipLookupError, setZipLookupError] = useState<string | null>(null);
  const [dotStatus, setDotStatus] = useState<{ exists: boolean; message: string | null }>({
    exists: false,
    message: null,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [snapshot, setSnapshot] = useState({
    name: initialData?.name || '',
    type: initialData?.company_type || '',
    status: initialData?.status || 'active',
    primaryContact: initialData?.primary_contact_name || '',
    dispatchContact: initialData?.dispatch_contact_name || '',
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
  });
  const sectionIndex: Record<string, number> = {
    basic: 0,
    address: 1,
    primary: 2,
    dispatch: 3,
    billing: 4,
  };

  const handleZipBlur = async (
    zipValue: string,
    country: string,
    cityInputId: string,
    stateInputId: string,
    setError: (val: string | null) => void
  ) => {
    if (!zipValue || zipValue.trim().length < 5) {
      return;
    }

    setError(null);
    const result = await lookupZip(zipValue.trim(), country);
    if (result.city || result.state) {
      const cityInput = document.getElementById(cityInputId) as HTMLInputElement;
      const stateInput = document.getElementById(stateInputId) as HTMLInputElement;
      if (cityInput && result.city) cityInput.value = result.city;
      if (stateInput && result.state) stateInput.value = result.state;
    } else {
      setError('Could not auto-fill city/state from ZIP');
    }
  };

  const handleDotBlur = async (dotValue: string, inputEl?: HTMLInputElement) => {
    if (!dotValue || dotValue.trim().length < 3) {
      setDotStatus({ exists: false, message: null });
      if (inputEl) inputEl.setCustomValidity('');
      return;
    }
    try {
      const res = await fetch(`/api/companies/check-dot?dot=${encodeURIComponent(dotValue.trim())}`);
      const json = await res.json();
      if (json.exists) {
        setDotStatus({ exists: true, message: 'This DOT number already exists in your workspace.' });
        if (inputEl) inputEl.setCustomValidity('DOT already exists');
      } else {
        setDotStatus({ exists: false, message: null });
        if (inputEl) inputEl.setCustomValidity('');
      }
    } catch (error) {
      console.error('DOT check failed', error);
      setDotStatus({ exists: false, message: null });
      if (inputEl) inputEl.setCustomValidity('');
    }
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const syncSnapshot = () => {
      const formData = new FormData(form);
      setSnapshot({
        name: (formData.get('name') as string) || '',
        type: (formData.get('company_type') as string) || '',
        status: (formData.get('status') as string) || 'active',
        primaryContact: (formData.get('primary_contact_name') as string) || '',
        dispatchContact: (formData.get('dispatch_contact_name') as string) || '',
        street: (formData.get('street') as string) || '',
        city: (formData.get('city') as string) || '',
        state: (formData.get('state') as string) || '',
      });
    };

    syncSnapshot();
    form.addEventListener('input', syncSnapshot);
    form.addEventListener('change', syncSnapshot);

    return () => {
      form.removeEventListener('input', syncSnapshot);
      form.removeEventListener('change', syncSnapshot);
    };
  }, []);

  const copyCompanyAddressToDispatch = () => {
    setDispatchSameAsCompany(true);
    const street = (document.getElementById('street') as HTMLInputElement)?.value || '';
    const city = (document.getElementById('city') as HTMLInputElement)?.value || '';
    const state = (document.getElementById('state') as HTMLInputElement)?.value || '';
    const postal = (document.getElementById('postal_code') as HTMLInputElement)?.value || '';
    const country = (document.getElementById('country') as HTMLInputElement)?.value || 'USA';

    const setField = (id: string, value: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = value;
    };

    setField('dispatch_contact_street', street);
    setField('dispatch_contact_city', city);
    setField('dispatch_contact_state', state);
    setField('dispatch_contact_postal_code', postal);
    setField('dispatch_contact_country', country);
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollToTop();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollToTop();
    }
  };

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Basic Information
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter the company's basic details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={initialData?.name}
                  className="h-10"
                />
                {state?.errors?.name && (
                  <p className="text-xs text-destructive">{state.errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dba_name" className="text-sm">DBA Name</Label>
                <Input
                  id="dba_name"
                  name="dba_name"
                  defaultValue={initialData?.dba_name}
                  className="h-10"
                />
                {state?.errors?.dba_name && (
                  <p className="text-xs text-destructive">{state.errors.dba_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_type" className="text-sm">
                    Company Type <span className="text-destructive">*</span>
                  </Label>
                  <SelectWithHiddenInput
                    name="company_type"
                    defaultValue={initialData?.company_type || ''}
                    required
                  >
                    <SelectTrigger id="company_type" className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer (gives us loads)</SelectItem>
                      <SelectItem value="carrier">Carrier (takes loads from us)</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                  {state?.errors?.company_type && (
                    <p className="text-xs text-destructive">{state.errors.company_type}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <SelectWithHiddenInput
                    name="status"
                    defaultValue={initialData?.status || 'active'}
                  >
                    <SelectTrigger id="status" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dot_number" className="text-sm">DOT Number</Label>
                  <Input
                    id="dot_number"
                    name="dot_number"
                    defaultValue={initialData?.dot_number}
                    className="h-10"
                    onBlur={async (e) => {
                      await handleDotBlur(e.target.value, e.target);
                    }}
                  />
                  {dotStatus.exists && dotStatus.message && (
                    <p className="text-xs text-destructive">{dotStatus.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mc_number" className="text-sm">MC Number</Label>
                  <Input
                    id="mc_number"
                    name="mc_number"
                    defaultValue={initialData?.mc_number}
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Company Address
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Main Company Address</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter the company's main business address</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm">Street Address</Label>
                <Input
                  id="street"
                  name="street"
                  defaultValue={initialData?.street}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code" className="text-sm">Postal Code</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    defaultValue={initialData?.postal_code}
                    className="h-10"
                    onBlur={async (e) => {
                      const zipValue = e.target.value;
                      if (zipValue && zipValue.trim().length >= 5) {
                        await handleZipBlur(
                          zipValue,
                          initialData?.country || 'USA',
                          'city',
                          'state',
                          setZipLookupError
                        );
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={initialData?.city}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="CA, NY"
                    defaultValue={initialData?.state}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={initialData?.country || 'USA'}
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Primary Contact
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Primary Contact / Owner</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter the primary contact and owner information</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_contact_name" className="text-sm">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primary_contact_name"
                  name="primary_contact_name"
                  required
                  defaultValue={initialData?.primary_contact_name}
                  className="h-10"
                />
                {state?.errors?.primary_contact_name && (
                  <p className="text-xs text-destructive">{state.errors.primary_contact_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_phone" className="text-sm">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primary_contact_phone"
                    name="primary_contact_phone"
                    type="tel"
                    required
                    defaultValue={initialData?.primary_contact_phone}
                    className="h-10"
                  />
                  {state?.errors?.primary_contact_phone && (
                    <p className="text-xs text-destructive">{state.errors.primary_contact_phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_contact_email" className="text-sm">Email</Label>
                  <Input
                    id="primary_contact_email"
                    name="primary_contact_email"
                    type="email"
                    defaultValue={initialData?.primary_contact_email}
                    className="h-10"
                  />
                  {state?.errors?.primary_contact_email && (
                    <p className="text-xs text-destructive">{state.errors.primary_contact_email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3: // Dispatch Contact
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Dispatch / Loading Contact</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter dispatch and loading contact information</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dispatch_contact_name" className="text-sm">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dispatch_contact_name"
                  name="dispatch_contact_name"
                  required
                  defaultValue={initialData?.dispatch_contact_name}
                  className="h-10"
                />
                {state?.errors?.dispatch_contact_name && (
                  <p className="text-xs text-destructive">{state.errors.dispatch_contact_name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dispatch_contact_phone" className="text-sm">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dispatch_contact_phone"
                    name="dispatch_contact_phone"
                    type="tel"
                    required
                    defaultValue={initialData?.dispatch_contact_phone}
                    className="h-10"
                  />
                  {state?.errors?.dispatch_contact_phone && (
                    <p className="text-xs text-destructive">{state.errors.dispatch_contact_phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatch_contact_email" className="text-sm">Email</Label>
                  <Input
                    id="dispatch_contact_email"
                    name="dispatch_contact_email"
                    type="email"
                    defaultValue={initialData?.dispatch_contact_email}
                    className="h-10"
                  />
                  {state?.errors?.dispatch_contact_email && (
                    <p className="text-xs text-destructive">{state.errors.dispatch_contact_email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loading_location_type" className="text-sm">Loading Location Type</Label>
                <SelectWithHiddenInput
                  name="loading_location_type"
                  defaultValue={initialData?.loading_location_type || ''}
                >
                  <SelectTrigger id="loading_location_type" className="h-10">
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_storage">Public Storage</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </SelectWithHiddenInput>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Dispatch Address</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyCompanyAddressToDispatch}
                  >
                    Copy company address
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatch_contact_street" className="text-sm">Street Address</Label>
                  <Input
                    id="dispatch_contact_street"
                    name="dispatch_contact_street"
                    defaultValue={initialData?.dispatch_contact_street}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dispatch_contact_postal_code" className="text-sm">Postal Code</Label>
                    <Input
                      id="dispatch_contact_postal_code"
                      name="dispatch_contact_postal_code"
                      defaultValue={initialData?.dispatch_contact_postal_code}
                      className="h-10"
                      onBlur={async (e) => {
                        const zipValue = e.target.value;
                        if (zipValue && zipValue.trim().length >= 5) {
                          await handleZipBlur(
                            zipValue,
                            initialData?.dispatch_contact_country || 'USA',
                            'dispatch_contact_city',
                            'dispatch_contact_state',
                            setZipLookupError
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dispatch_contact_city" className="text-sm">City</Label>
                    <Input
                      id="dispatch_contact_city"
                      name="dispatch_contact_city"
                      defaultValue={initialData?.dispatch_contact_city}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dispatch_contact_state" className="text-sm">State</Label>
                    <Input
                      id="dispatch_contact_state"
                      name="dispatch_contact_state"
                      placeholder="CA, NY"
                      defaultValue={initialData?.dispatch_contact_state}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatch_contact_country" className="text-sm">Country</Label>
                  <Input
                    id="dispatch_contact_country"
                    name="dispatch_contact_country"
                    defaultValue={initialData?.dispatch_contact_country || 'USA'}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="dispatch_notes" className="text-sm">Notes</Label>
                <Textarea
                  id="dispatch_notes"
                  name="dispatch_notes"
                  rows={3}
                  placeholder="Call 2 hours before arrival, warehouse closes at 4pm, dock instructions, etc."
                  defaultValue={initialData?.dispatch_notes}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4: // Billing Address
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Billing Address</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter billing address and notes</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing_street" className="text-sm">Street Address</Label>
                <Input
                  id="billing_street"
                  name="billing_street"
                  defaultValue={initialData?.billing_street}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_postal_code" className="text-sm">Postal Code</Label>
                  <Input
                    id="billing_postal_code"
                    name="billing_postal_code"
                    defaultValue={initialData?.billing_postal_code}
                    className="h-10"
                    onBlur={async (e) => {
                      const zipValue = e.target.value;
                      if (zipValue && zipValue.trim().length >= 5) {
                        await handleZipBlur(
                          zipValue,
                          initialData?.billing_country || 'USA',
                          'billing_city',
                          'billing_state',
                          setZipLookupError
                        );
                      }
                    }}
                  />
                  {zipLookupError && (
                    <p className="text-xs text-muted-foreground">{zipLookupError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_city" className="text-sm">City</Label>
                  <Input
                    id="billing_city"
                    name="billing_city"
                    defaultValue={initialData?.billing_city}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_state" className="text-sm">State</Label>
                  <Input
                    id="billing_state"
                    name="billing_state"
                    placeholder="CA, NY"
                    defaultValue={initialData?.billing_state}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_country" className="text-sm">Country</Label>
                <Input
                  id="billing_country"
                  name="billing_country"
                  defaultValue={initialData?.billing_country || 'USA'}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_notes" className="text-sm">Notes</Label>
                <Textarea
                  id="billing_notes"
                  name="billing_notes"
                  rows={3}
                  placeholder="Additional notes..."
                  defaultValue={initialData?.billing_notes}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Company Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quick reference while you move through each step.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium text-right">{snapshot.name || 'Not set'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium text-right capitalize">{snapshot.type || '—'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-right capitalize">{snapshot.status || '—'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Primary contact</span>
              <span className="font-medium text-right">{snapshot.primaryContact || '—'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Dispatch contact</span>
              <span className="font-medium text-right">{snapshot.dispatchContact || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <form ref={formRef} action={formAction} className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: 'basic',
              title: 'Identity ready',
              body: 'Name, type, status, DOT/MC.',
              complete: Boolean(snapshot.name && snapshot.type && snapshot.status),
            },
            {
              id: 'address',
              title: 'Address ready',
              body: 'Main company address captured.',
              complete: Boolean(snapshot.street && snapshot.city && snapshot.state),
            },
            {
              id: 'primary',
              title: 'Contacts ready',
              body: 'Primary and dispatch contacts set.',
              complete: Boolean(snapshot.primaryContact && snapshot.dispatchContact),
            },
          ].map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setCurrentStep(sectionIndex[card.id]);
                scrollToTop();
              }}
              className={cn(
                "group flex h-full flex-col rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                currentStep === sectionIndex[card.id] && "border-primary/40 ring-2 ring-primary/20"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{card.body}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    card.complete ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}
                >
                  {card.complete ? 'Ready' : 'Pending'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {state?.errors?._form && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">
              {state.errors._form}
            </CardContent>
          </Card>
        )}

        {STEPS.map((step, index) => (
          <section
            key={step.id}
            aria-hidden={currentStep !== index}
            className={cn(currentStep !== index && 'hidden')}
          >
            {renderStepContent(index)}
          </section>
        ))}

        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="h-10"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              asChild
              className="h-10"
            >
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>

          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="h-10"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending} className="h-10">
                {pending ? 'Saving...' : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

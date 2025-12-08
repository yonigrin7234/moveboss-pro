'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { type NewLoadInput, type LoadStatus, type ServiceType } from '@/data/loads';
import {
  type LoadFlowType,
  type WizardStepId,
  getVisibleWizardSteps,
} from '@/lib/wizard-steps';
import { type Company } from '@/data/companies';
import { type Driver } from '@/data/drivers';
import { type Truck, type Trailer } from '@/data/fleet';
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
import { DatePicker } from '@/components/ui/date-picker';

// Helper component for Select with hidden input
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

interface LoadFormProps {
  initialData?: Partial<NewLoadInput>;
  companies: Company[];
  drivers: Driver[];
  trucks: Truck[];
  trailers: Trailer[];
  onSubmit: (
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string> } | null>;
  submitLabel?: string;
  cancelHref?: string;
  /** Optional callback for cancel button (used in sheets/modals instead of navigation) */
  onCancel?: () => void;
  /** Controls wizard step visibility based on how the load was created */
  loadFlowType?: LoadFlowType | null;
}

const statusOptions: { value: LoadStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'canceled', label: 'Canceled' },
];

const serviceTypeOptions: { value: ServiceType; label: string }[] = [
  { value: 'hhg_local', label: 'HHG Local' },
  { value: 'hhg_long_distance', label: 'HHG Long Distance' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'storage_in', label: 'Storage In' },
  { value: 'storage_out', label: 'Storage Out' },
  { value: 'freight', label: 'Freight' },
  { value: 'other', label: 'Other' },
];

const ALL_STEPS: { id: WizardStepId; title: string; description: string }[] = [
  { id: 'basics', title: 'Basics', description: 'Identity & assignment' },
  { id: 'pickup', title: 'Pickup', description: 'Dates & origin' },
  { id: 'delivery', title: 'Delivery', description: 'Destination timing' },
  { id: 'financials', title: 'Financials', description: 'Revenue & status' },
];

async function lookupZipCode(postalCode: string): Promise<{ city: string | null; state: string | null }> {
  if (!postalCode || postalCode.length < 5) {
    return { city: null, state: null };
  }

  try {
    const response = await fetch(`/api/zip-lookup?postal_code=${encodeURIComponent(postalCode)}&country=US`);
    if (!response.ok) {
      return { city: null, state: null };
    }
    const data = await response.json();
    return { city: data.city || null, state: data.state || null };
  } catch (error) {
    console.error('ZIP lookup error:', error);
    return { city: null, state: null };
  }
}

export function LoadForm({
  initialData,
  companies,
  drivers,
  trucks,
  trailers,
  onSubmit,
  submitLabel = 'Save load',
  cancelHref = '/dashboard/loads',
  onCancel,
  loadFlowType,
}: LoadFormProps) {
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Get visible steps based on load flow type
  const visibleStepIds = getVisibleWizardSteps(loadFlowType);
  const STEPS = ALL_STEPS.filter((step) => visibleStepIds.includes(step.id));

  const [snapshot, setSnapshot] = useState({
    loadNumber: initialData?.load_number || '',
    companyId: initialData?.company_id || '',
    serviceType: initialData?.service_type || 'other',
    status: initialData?.status || 'pending',
    driverId: initialData?.assigned_driver_id || '',
    truckId: initialData?.assigned_truck_id || '',
    trailerId: initialData?.assigned_trailer_id || '',
    pickupCity: initialData?.pickup_city || '',
    deliveryCity: initialData?.delivery_city || '',
    linehaulRate: (initialData as any)?.linehaul_rate?.toString() || '',
    totalRate: (initialData as any)?.total_rate?.toString() || '',
  });
  // Build section index dynamically based on visible steps
  const sectionIndex: Record<string, number> = {};
  STEPS.forEach((step, index) => {
    sectionIndex[step.id] = index;
  });
  const getCompanyName = (id?: string | null) => {
    if (!id) {
      return 'Not selected';
    }
    return companies.find((company) => company.id === id)?.name || 'Unknown';
  };
  const getDriverName = (id?: string | null) => {
    if (!id) {
      return 'Unassigned';
    }
    const driver = drivers.find((d) => d.id === id);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };
  const getTruckLabel = (id?: string | null) => {
    if (!id) {
      return 'Unassigned';
    }
    const truck = trucks.find((t) => t.id === id);
    return truck?.unit_number || 'Truck';
  };
  const getTrailerLabel = (id?: string | null) => {
    if (!id) {
      return 'Unassigned';
    }
    const trailer = trailers.find((t) => t.id === id);
    return trailer?.unit_number || 'Trailer';
  };

  // ZIP lookup handlers
  const handlePickupZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.trim();
    if (zip.length >= 5) {
      const { city, state } = await lookupZipCode(zip);
      const cityInput = document.getElementById('pickup_city') as HTMLInputElement;
      const stateInput = document.getElementById('pickup_state') as HTMLInputElement;
      if (cityInput && city) cityInput.value = city;
      if (stateInput && state) stateInput.value = state;
    }
  };

  const handleDeliveryZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.trim();
    if (zip.length >= 5) {
      const { city, state } = await lookupZipCode(zip);
      const cityInput = document.getElementById('delivery_city') as HTMLInputElement;
      const stateInput = document.getElementById('delivery_state') as HTMLInputElement;
      if (cityInput && city) cityInput.value = city;
      if (stateInput && state) stateInput.value = state;
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
        loadNumber: (formData.get('load_number') as string) || '',
        companyId: (formData.get('company_id') as string) || '',
        serviceType: ((formData.get('service_type') as string) || 'other') as ServiceType,
        status: ((formData.get('status') as string) || 'pending') as LoadStatus,
        driverId: (formData.get('assigned_driver_id') as string) || '',
        truckId: (formData.get('assigned_truck_id') as string) || '',
        trailerId: (formData.get('assigned_trailer_id') as string) || '',
        pickupCity: (formData.get('pickup_city') as string) || '',
        deliveryCity: (formData.get('delivery_city') as string) || '',
        linehaulRate: (formData.get('linehaul_rate') as string) || '',
        totalRate: (formData.get('total_rate') as string) || '',
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

  const renderStepContent = (stepId: WizardStepId) => {
    switch (stepId) {
      case 'basics':
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Load Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="load_number" className="text-sm">
                      Load Number
                    </Label>
                    <Input
                      id="load_number"
                      name="load_number"
                      defaultValue={initialData?.load_number || ''}
                      className="h-9 read-only:bg-muted read-only:cursor-not-allowed"
                      placeholder="Auto-generated (LD-000001)"
                      readOnly={Boolean(initialData?.load_number)}
                    />
                    {!initialData?.load_number && (
                      <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
                    )}
                    {state?.errors?.load_number && (
                      <p className="text-xs text-destructive">{state.errors.load_number}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="internal_reference" className="text-sm">
                      Internal Reference
                    </Label>
                    <Input
                      id="internal_reference"
                      name="internal_reference"
                      defaultValue={(initialData as any)?.internal_reference || ''}
                      className="h-9"
                      placeholder="Your CRM # (optional)"
                    />
                    {state?.errors?.internal_reference && (
                      <p className="text-xs text-destructive">{state.errors.internal_reference}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="service_type" className="text-sm">
                      Service Type <span className="text-destructive">*</span>
                    </Label>
                    <SelectWithHiddenInput name="service_type" defaultValue={initialData?.service_type || 'other'} required>
                      <SelectTrigger id="service_type" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectWithHiddenInput>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company_id" className="text-sm">
                      Company <span className="text-destructive">*</span>
                    </Label>
                    <SelectWithHiddenInput name="company_id" defaultValue={initialData?.company_id || ''} required>
                      <SelectTrigger id="company_id" className="h-9">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectWithHiddenInput>
                    {state?.errors?.company_id && (
                      <p className="text-xs text-destructive">{state.errors.company_id}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DRIVER ASSIGNMENT RULE UPDATE: Driver and equipment assignment removed from load forms.
                Drivers are assigned via trips - see syncTripDriverToLoads().
                Equipment is assigned via trips - see syncTripEquipmentToLoads(). */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Driver and equipment are assigned via trips.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'pickup':
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pickup Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_date" className="text-sm">Date</Label>
                    <DatePicker
                      name="pickup_date"
                      defaultValue={initialData?.pickup_date || ''}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_window_start" className="text-sm">Window Start</Label>
                    <Input
                      id="pickup_window_start"
                      name="pickup_window_start"
                      type="datetime-local"
                      defaultValue={
                        initialData?.pickup_window_start
                          ? new Date(initialData.pickup_window_start).toISOString().slice(0, 16)
                          : ''
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_window_end" className="text-sm">Window End</Label>
                    <Input
                      id="pickup_window_end"
                      name="pickup_window_end"
                      type="datetime-local"
                      defaultValue={
                        initialData?.pickup_window_end
                          ? new Date(initialData.pickup_window_end).toISOString().slice(0, 16)
                          : ''
                      }
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickup_address_line1" className="text-sm">Address Line 1</Label>
                  <Input
                    id="pickup_address_line1"
                    name="pickup_address_line1"
                    defaultValue={initialData?.pickup_address_line1 || ''}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickup_address_line2" className="text-sm">Address Line 2</Label>
                  <Input
                    id="pickup_address_line2"
                    name="pickup_address_line2"
                    defaultValue={initialData?.pickup_address_line2 || ''}
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_postal_code" className="text-sm">Postal Code</Label>
                    <Input
                      id="pickup_postal_code"
                      name="pickup_postal_code"
                      defaultValue={initialData?.pickup_postal_code || ''}
                      onBlur={handlePickupZipBlur}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_city" className="text-sm">City</Label>
                    <Input
                      id="pickup_city"
                      name="pickup_city"
                      defaultValue={initialData?.pickup_city || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_state" className="text-sm">State</Label>
                    <Input
                      id="pickup_state"
                      name="pickup_state"
                      defaultValue={initialData?.pickup_state || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pickup_country" className="text-sm">Country</Label>
                    <Input
                      id="pickup_country"
                      name="pickup_country"
                      defaultValue={initialData?.pickup_country || 'US'}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Load Specs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cubic_feet_estimate" className="text-sm">Cubic Feet Estimate</Label>
                    <Input
                      id="cubic_feet_estimate"
                      name="cubic_feet_estimate"
                      type="number"
                      min="0"
                      defaultValue={initialData?.cubic_feet_estimate || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weight_lbs_estimate" className="text-sm">Weight (lbs) Estimate</Label>
                    <Input
                      id="weight_lbs_estimate"
                      name="weight_lbs_estimate"
                      type="number"
                      min="0"
                      defaultValue={initialData?.weight_lbs_estimate || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pieces_count" className="text-sm">Pieces Count</Label>
                    <Input
                      id="pieces_count"
                      name="pieces_count"
                      type="number"
                      min="0"
                      defaultValue={initialData?.pieces_count || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={initialData?.description || ''}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'delivery':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_date" className="text-sm">Date</Label>
                  <DatePicker
                    name="delivery_date"
                    defaultValue={initialData?.delivery_date || ''}
                    placeholder="Select date"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_window_start" className="text-sm">Window Start</Label>
                  <Input
                    id="delivery_window_start"
                    name="delivery_window_start"
                    type="datetime-local"
                    defaultValue={
                      initialData?.delivery_window_start
                        ? new Date(initialData.delivery_window_start).toISOString().slice(0, 16)
                        : ''
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_window_end" className="text-sm">Window End</Label>
                  <Input
                    id="delivery_window_end"
                    name="delivery_window_end"
                    type="datetime-local"
                    defaultValue={
                      initialData?.delivery_window_end
                        ? new Date(initialData.delivery_window_end).toISOString().slice(0, 16)
                        : ''
                    }
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery_address_line1" className="text-sm">Address Line 1</Label>
                <Input
                  id="delivery_address_line1"
                  name="delivery_address_line1"
                  defaultValue={initialData?.delivery_address_line1 || ''}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery_address_line2" className="text-sm">Address Line 2</Label>
                <Input
                  id="delivery_address_line2"
                  name="delivery_address_line2"
                  defaultValue={initialData?.delivery_address_line2 || ''}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_postal_code" className="text-sm">Postal Code</Label>
                  <Input
                    id="delivery_postal_code"
                    name="delivery_postal_code"
                    defaultValue={initialData?.delivery_postal_code || ''}
                    onBlur={handleDeliveryZipBlur}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_city" className="text-sm">City</Label>
                  <Input
                    id="delivery_city"
                    name="delivery_city"
                    defaultValue={initialData?.delivery_city || ''}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_state" className="text-sm">State</Label>
                  <Input
                    id="delivery_state"
                    name="delivery_state"
                    defaultValue={initialData?.delivery_state || ''}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_country" className="text-sm">Country</Label>
                  <Input
                    id="delivery_country"
                    name="delivery_country"
                    defaultValue={initialData?.delivery_country || 'US'}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'financials':
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="linehaul_rate" className="text-sm">Linehaul Rate</Label>
                    <Input
                      id="linehaul_rate"
                      name="linehaul_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(initialData as any)?.linehaul_rate ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="packing_rate" className="text-sm">Packing Rate</Label>
                    <Input
                      id="packing_rate"
                      name="packing_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(initialData as any)?.packing_rate ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="materials_rate" className="text-sm">Materials Rate</Label>
                    <Input
                      id="materials_rate"
                      name="materials_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(initialData as any)?.materials_rate ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accessorials_rate" className="text-sm">Accessorials Rate</Label>
                    <Input
                      id="accessorials_rate"
                      name="accessorials_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(initialData as any)?.accessorials_rate ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="total_rate" className="text-sm">Total Rate</Label>
                    <Input
                      id="total_rate"
                      name="total_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(initialData as any)?.total_rate ?? ''}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contract Accessorials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_stairs" className="text-sm">Stairs</Label>
                    <Input
                      id="contract_accessorials_stairs"
                      name="contract_accessorials_stairs"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_stairs ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_shuttle" className="text-sm">Shuttle</Label>
                    <Input
                      id="contract_accessorials_shuttle"
                      name="contract_accessorials_shuttle"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_shuttle ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_long_carry" className="text-sm">Long Carry</Label>
                    <Input
                      id="contract_accessorials_long_carry"
                      name="contract_accessorials_long_carry"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_long_carry ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_packing" className="text-sm">Packing</Label>
                    <Input
                      id="contract_accessorials_packing"
                      name="contract_accessorials_packing"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_packing ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_bulky" className="text-sm">Bulky Items</Label>
                    <Input
                      id="contract_accessorials_bulky"
                      name="contract_accessorials_bulky"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_bulky ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contract_accessorials_other" className="text-sm">Other</Label>
                    <Input
                      id="contract_accessorials_other"
                      name="contract_accessorials_other"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      defaultValue={(initialData as any)?.contract_accessorials_other ?? ''}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dispatch Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dispatch_contact_name" className="text-sm">Contact Name</Label>
                    <Input
                      id="dispatch_contact_name"
                      name="dispatch_contact_name"
                      defaultValue={(initialData as any)?.dispatch_contact_name ?? ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dispatch_contact_phone" className="text-sm">Contact Phone</Label>
                    <Input
                      id="dispatch_contact_phone"
                      name="dispatch_contact_phone"
                      type="tel"
                      defaultValue={(initialData as any)?.dispatch_contact_phone ?? ''}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <SelectWithHiddenInput name="status" defaultValue={initialData?.status || 'pending'}>
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    defaultValue={initialData?.notes || ''}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
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
            <CardTitle className="text-base font-semibold">Load Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Keep key facts visible while you fill the wizard.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Load #</span>
              <span className="font-medium text-right">{snapshot.loadNumber || 'Auto (LD-XXXXXX)'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium text-right">{getCompanyName(snapshot.companyId)}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium text-right capitalize">
                {serviceTypeOptions.find((opt) => opt.value === snapshot.serviceType)?.label || 'Other'}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-right capitalize">{snapshot.status}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Driver</span>
              <span className="font-medium text-right">{getDriverName(snapshot.driverId)}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Equipment</span>
              <span className="font-medium text-right text-xs text-muted-foreground">
                Assigned via Trip
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Route</span>
              <span className="font-medium text-right">
                {snapshot.pickupCity || '—'} → {snapshot.deliveryCity || '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <form ref={formRef} action={formAction} className="space-y-6">
        <div className={cn(
          "grid gap-3 sm:grid-cols-2",
          STEPS.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}>
          {[
            {
              id: 'basics' as WizardStepId,
              title: 'Basics ready',
              body: 'Customer & service type set.',
              complete: Boolean(snapshot.companyId && snapshot.serviceType),
            },
            {
              id: 'pickup' as WizardStepId,
              title: 'Pickup ready',
              body: 'Origin city/state set.',
              complete: Boolean(snapshot.pickupCity),
            },
            {
              id: 'delivery' as WizardStepId,
              title: 'Delivery ready',
              body: 'Destination city/state set.',
              complete: Boolean(snapshot.deliveryCity),
            },
            {
              id: 'financials' as WizardStepId,
              title: 'Revenue ready',
              body: 'Linehaul/total + status set.',
              complete: Boolean(snapshot.linehaulRate || snapshot.totalRate || snapshot.status),
            },
          ]
            .filter((card) => visibleStepIds.includes(card.id))
            .map((card) => (
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
          <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-sm text-destructive">
            {state.errors._form}
          </div>
        )}

        {STEPS.map((step, index) => (
          <section
            key={step.id}
            aria-hidden={currentStep !== index}
            className={cn(currentStep !== index && 'hidden')}
          >
            {renderStepContent(step.id)}
          </section>
        ))}

        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep} className="h-10">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} className="h-10">
                Cancel
              </Button>
            ) : (
              <Button variant="outline" asChild className="h-10">
                <Link href={cancelHref}>Cancel</Link>
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} className="h-10 min-w-[120px]">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={pending} className="h-10 min-w-[140px]">
                {pending ? 'Saving...' : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

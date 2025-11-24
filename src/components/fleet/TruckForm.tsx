'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type NewTruckInput } from '@/data/fleet';
import {
  type TruckVehicleType,
  getCapacityForVehicleType,
  VEHICLE_TYPE_OPTIONS,
} from '@/lib/vehicle-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Helper component for Select with hidden input
function SelectWithHiddenInput({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue?: string;
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
      <Select value={value || undefined} onValueChange={setValue}>
        {children}
      </Select>
      <input type="hidden" name={name} ref={hiddenInputRef} value={value} />
    </>
  );
}

const STEPS = [
  { id: 'vehicle', title: 'Vehicle', description: 'Identity & specs' },
  { id: 'assignment', title: 'Assignment', description: 'Status & driver' },
  { id: 'rental', title: 'Rental', description: 'Rental configuration' },
  { id: 'documents', title: 'Documents', description: 'Registration, IFTA, insurance, maintenance' },
  { id: 'notes', title: 'Notes', description: 'Operational notes' },
];

interface TruckFormProps {
  initialData?: Partial<NewTruckInput>;
  drivers?: Array<{ id: string; first_name: string; last_name: string }>;
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; truckId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; truckId?: string } | null>;
  submitLabel?: string;
  cancelHref?: string;
}

export function TruckForm({
  initialData,
  drivers = [],
  onSubmit,
  submitLabel = 'Save truck',
  cancelHref = '/dashboard/fleet',
}: TruckFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const [currentStep, setCurrentStep] = useState(0);
  const [vehicleType, setVehicleType] = useState<TruckVehicleType | ''>(initialData?.vehicle_type || '');
  const [cubicCapacity, setCubicCapacity] = useState<string>(
    initialData?.cubic_capacity?.toString() || ''
  );
  const [capacityManuallyEdited, setCapacityManuallyEdited] = useState(false);
  const [isRentalUnit, setIsRentalUnit] = useState(initialData?.is_rental_unit || false);
  const [rentalCompany, setRentalCompany] = useState<'ryder' | 'penske' | 'other' | ''>(
    initialData?.rental_company || ''
  );
  const [docPreviews, setDocPreviews] = useState<Record<string, { name: string; url: string } | null>>({
    registration_file: null,
    ifta_file: null,
    insurance_file: null,
    maintenance_file: null,
  });
  const docTiles = [
    { id: 'registration_file', label: 'Registration copy' },
    { id: 'ifta_file', label: 'IFTA' },
    { id: 'insurance_file', label: 'Insurance' },
    { id: 'maintenance_file', label: 'Maintenance records' },
  ];
  const capacityInputRef = useRef<HTMLInputElement>(null);
  const hiddenVehicleTypeRef = useRef<HTMLInputElement>(null);
  const hiddenCapacityRef = useRef<HTMLInputElement>(null);
  const hiddenIsRentalUnitRef = useRef<HTMLInputElement>(null);
  const hiddenRentalCompanyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [snapshot, setSnapshot] = useState({
    unitNumber: initialData?.unit_number || '',
    vehicleType: initialData?.vehicle_type || '',
    status: initialData?.status || 'active',
    assignedDriverId: initialData?.assigned_driver_id || '',
    isRental: initialData?.is_rental_unit || false,
    rentalCompany: initialData?.rental_company || '',
  });
  const getDriverName = (id?: string | null) => {
    if (!id) {
      return 'Unassigned';
    }
    const driver = drivers.find((d) => d.id === id);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const handleDateClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.currentTarget?.showPicker) {
      try {
        event.currentTarget.showPicker();
      } catch {
        // ignore if browser blocks programmatic open
      }
    }
  };

  // Auto-fill capacity when vehicle type changes (if not manually edited)
  useEffect(() => {
    if (vehicleType && !capacityManuallyEdited) {
      const capacity = getCapacityForVehicleType(vehicleType);
      if (capacity !== null && capacity > 0) {
        setCubicCapacity(capacity.toString());
        if (hiddenCapacityRef.current) {
          hiddenCapacityRef.current.value = capacity.toString();
        }
      }
    }
  }, [vehicleType, capacityManuallyEdited]);

  // On successful server action, toast and navigate
  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Truck saved',
        description: 'The truck was created successfully.',
      });
      router.push('/dashboard/fleet');
      router.refresh();
    }
  }, [state?.success, router, toast]);

  // Update hidden inputs when values change
  useEffect(() => {
    if (hiddenVehicleTypeRef.current) {
      hiddenVehicleTypeRef.current.value = vehicleType || '';
    }
  }, [vehicleType]);

  useEffect(() => {
    if (hiddenCapacityRef.current) {
      hiddenCapacityRef.current.value = cubicCapacity || '';
    }
  }, [cubicCapacity]);

  useEffect(() => {
    if (hiddenIsRentalUnitRef.current) {
      hiddenIsRentalUnitRef.current.value = isRentalUnit ? 'true' : 'false';
    }
  }, [isRentalUnit]);

  useEffect(() => {
    if (hiddenRentalCompanyRef.current) {
      hiddenRentalCompanyRef.current.value = rentalCompany || '';
    }
  }, [rentalCompany]);

  const setDocPreview = (key: string, file?: File | null) => {
    setDocPreviews((prev) => {
      const existing = prev[key];
      if (existing?.url) URL.revokeObjectURL(existing.url);
      if (!file) return { ...prev, [key]: null };
      return { ...prev, [key]: { name: file.name, url: URL.createObjectURL(file) } };
    });
  };

  useEffect(() => {
    return () => {
      Object.values(docPreviews).forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [docPreviews]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const syncSnapshot = () => {
      const formData = new FormData(form);
      setSnapshot({
        unitNumber: (formData.get('unit_number') as string) || '',
        vehicleType: (formData.get('vehicle_type') as string) || '',
        status: ((formData.get('status') as string) || 'active') as NewTruckInput['status'],
        assignedDriverId: (formData.get('assigned_driver_id') as string) || '',
        isRental: (formData.get('is_rental_unit') as string) === 'true',
        rentalCompany: (formData.get('rental_company') as string) || '',
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

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vehicle & Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="unit_number" className="text-sm">Truck Number</Label>
                <Input
                  type="text"
                  id="unit_number"
                  name="unit_number"
                  defaultValue={initialData?.unit_number}
                  className="h-9"
                />
                {state?.errors?.unit_number && (
                  <p className="text-xs text-destructive">{state.errors.unit_number}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="plate_number" className="text-sm">Plate Number</Label>
                  <Input
                    type="text"
                    id="plate_number"
                    name="plate_number"
                    defaultValue={initialData?.plate_number}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plate_state" className="text-sm">Plate State</Label>
                  <Input
                    type="text"
                    id="plate_state"
                    name="plate_state"
                    placeholder="CA, NY"
                    defaultValue={initialData?.plate_state}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vin" className="text-sm">VIN</Label>
                <Input
                  type="text"
                  id="vin"
                  name="vin"
                  defaultValue={initialData?.vin}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="make" className="text-sm">Make</Label>
                  <Input
                    type="text"
                    id="make"
                    name="make"
                    defaultValue={initialData?.make}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-sm">Model</Label>
                  <Input
                    type="text"
                    id="model"
                    name="model"
                    defaultValue={initialData?.model}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-sm">Year</Label>
                  <Input
                    type="number"
                    id="year"
                    name="year"
                    min="1900"
                    max="2100"
                    defaultValue={initialData?.year || ''}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_type" className="text-sm">Vehicle Type</Label>
                  <Select
                    value={vehicleType || undefined}
                    onValueChange={(value) => {
                      setVehicleType(value as TruckVehicleType);
                      setCapacityManuallyEdited(false);
                      if (value === 'tractor') {
                        setCubicCapacity('');
                        if (hiddenCapacityRef.current) {
                          hiddenCapacityRef.current.value = '';
                        }
                      }
                    }}
                  >
                    <SelectTrigger id="vehicle_type" className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="hidden"
                    name="vehicle_type"
                    ref={hiddenVehicleTypeRef}
                    value={vehicleType || ''}
                  />
                </div>
                {vehicleType !== 'tractor' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cubic_capacity" className="text-sm">Cubic Capacity (cu ft)</Label>
                    <Input
                      ref={capacityInputRef}
                      type="number"
                      id="cubic_capacity"
                      name="cubic_capacity"
                      min="0"
                      step="1"
                      value={cubicCapacity}
                      onChange={(e) => {
                        setCubicCapacity(e.target.value);
                        setCapacityManuallyEdited(true);
                      }}
                      className="h-9"
                      placeholder="Auto-filled"
                    />
                    <input
                      type="hidden"
                      name="cubic_capacity"
                      ref={hiddenCapacityRef}
                      value={cubicCapacity || ''}
                    />
                    {state?.errors?.cubic_capacity && (
                      <p className="text-xs text-destructive">{state.errors.cubic_capacity}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_odometer" className="text-sm">Current Odometer (miles)</Label>
                <Input
                  type="number"
                  id="current_odometer"
                  name="current_odometer"
                  step="0.01"
                  min="0"
                  defaultValue={initialData?.current_odometer?.toString() || ''}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="registration_expiry" className="text-sm">Registration Expiry</Label>
                  <Input
                    type="date"
                    id="registration_expiry"
                    name="registration_expiry"
                    defaultValue={initialData?.registration_expiry || ''}
                    className="h-9"
                    onClick={handleDateClick}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inspection_expiry" className="text-sm">Inspection Expiry</Label>
                  <Input
                    type="date"
                    id="inspection_expiry"
                    name="inspection_expiry"
                    defaultValue={initialData?.inspection_expiry || ''}
                    className="h-9"
                    onClick={handleDateClick}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assignment & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <SelectWithHiddenInput
                    name="status"
                    defaultValue={initialData?.status || 'active'}
                  >
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assigned_driver_id" className="text-sm">Assigned Driver</Label>
                  <SelectWithHiddenInput
                    name="assigned_driver_id"
                    defaultValue={initialData?.assigned_driver_id || ''}
                  >
                    <SelectTrigger id="assigned_driver_id" className="h-9">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rental Unit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_rental_unit"
                  checked={isRentalUnit}
                  onCheckedChange={(checked) => setIsRentalUnit(checked === true)}
                />
                <Label htmlFor="is_rental_unit" className="text-sm font-normal cursor-pointer">
                  This is a rental unit
                </Label>
                <input
                  type="hidden"
                  name="is_rental_unit"
                  ref={hiddenIsRentalUnitRef}
                  value={isRentalUnit ? 'true' : 'false'}
                />
              </div>

              {isRentalUnit && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="rental_company" className="text-sm">
                      Rental Company <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={rentalCompany || undefined}
                      onValueChange={(value) => setRentalCompany(value as 'ryder' | 'penske' | 'other')}
                    >
                      <SelectTrigger id="rental_company" className="h-9">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ryder">Ryder</SelectItem>
                        <SelectItem value="penske">Penske</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="rental_company"
                      ref={hiddenRentalCompanyRef}
                      value={rentalCompany || ''}
                    />
                    {state?.errors?.rental_company && (
                      <p className="text-xs text-destructive">{state.errors.rental_company}</p>
                    )}
                  </div>

                  {rentalCompany === 'other' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rental_company_other" className="text-sm">
                        Rental Company Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="text"
                        id="rental_company_other"
                        name="rental_company_other"
                        defaultValue={initialData?.rental_company_other || ''}
                        className="h-9"
                        placeholder="Enter company name"
                      />
                      {state?.errors?.rental_company_other && (
                        <p className="text-xs text-destructive">{state.errors.rental_company_other}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="rental_truck_number" className="text-sm">Rental Company Truck Number</Label>
                    <Input
                      type="text"
                      id="rental_truck_number"
                      name="rental_truck_number"
                      defaultValue={initialData?.rental_truck_number || ''}
                      className="h-9"
                      placeholder="Enter truck number"
                    />
                    {state?.errors?.rental_truck_number && (
                      <p className="text-xs text-destructive">{state.errors.rental_truck_number}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <p className="text-xs text-muted-foreground">
                Registration, IFTA, insurance, and maintenance records for quick access.
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="registration_file" className="text-sm">Registration</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="registration_file"
                      name="registration_file"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(event) => setDocPreview('registration_file', event.target.files?.[0] || null)}
                    />
                    {docPreviews.registration_file?.url && (
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => window.open(docPreviews.registration_file!.url, '_blank')}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ifta_file" className="text-sm">IFTA</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="ifta_file"
                      name="ifta_file"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(event) => setDocPreview('ifta_file', event.target.files?.[0] || null)}
                    />
                    {docPreviews.ifta_file?.url && (
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => window.open(docPreviews.ifta_file!.url, '_blank')}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="insurance_file" className="text-sm">Insurance</Label>
                  <div className="flex items-center gap-3">
                  <Input
                    id="insurance_file"
                    name="insurance_file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => setDocPreview('insurance_file', event.target.files?.[0] || null)}
                  />
                    {docPreviews.insurance_file?.url && (
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => window.open(docPreviews.insurance_file!.url, '_blank')}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maintenance_file" className="text-sm">Maintenance records</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="maintenance_file"
                      name="maintenance_file"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(event) => setDocPreview('maintenance_file', event.target.files?.[0] || null)}
                    />
                    {docPreviews.maintenance_file?.url && (
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={() => window.open(docPreviews.maintenance_file!.url, '_blank')}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Additional notes about this truck..."
                  defaultValue={initialData?.notes}
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
  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const syncSnapshot = () => {
      const formData = new FormData(form);
      setSnapshot({
        unitNumber: (formData.get('unit_number') as string) || '',
        vehicleType: (formData.get('vehicle_type') as string) || '',
        status: ((formData.get('status') as string) || 'active') as NewTruckInput['status'],
        assignedDriverId: (formData.get('assigned_driver_id') as string) || '',
        isRental: (formData.get('is_rental_unit') as string) === 'true',
        rentalCompany: (formData.get('rental_company') as string) || '',
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

  const openDocOrJump = (inputId: string) => {
    const preview = docPreviews[inputId];
    if (preview?.url) {
      window.open(preview.url, '_blank');
      return;
    }
    setCurrentStep(3);
    scrollToTop();
    setTimeout(() => {
      const el = document.getElementById(inputId) as HTMLInputElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    }, 0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Truck Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              High-level context while you work.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Unit #</span>
              <span className="font-medium text-right">{snapshot.unitNumber || 'Not set'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Vehicle type</span>
              <span className="font-medium text-right">
                {VEHICLE_TYPE_OPTIONS.find((opt) => opt.value === snapshot.vehicleType)?.label || '—'}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-right capitalize">{snapshot.status}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Driver</span>
              <span className="font-medium text-right">{getDriverName(snapshot.assignedDriverId)}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Rental</span>
              <span className="font-medium text-right">
                {snapshot.isRental
                  ? `Yes${snapshot.rentalCompany ? ` · ${snapshot.rentalCompany}` : ''}`
                  : 'No'}
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <form ref={formRef} action={formAction} className="space-y-6">
        {state?.errors?._form && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-sm text-destructive">
            {state.errors._form}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {docTiles.map((tile) => {
            const ok = Boolean(docPreviews[tile.id]?.url);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => openDocOrJump(tile.id)}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">{tile.label}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ok ? 'Added — tap to view or replace.' : 'Missing — tap to add this file.'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      ok ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ok ? 'Ready' : 'Pending'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

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
              <Button type="button" variant="outline" onClick={prevStep} className="h-10">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            <Button variant="outline" asChild className="h-10">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
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

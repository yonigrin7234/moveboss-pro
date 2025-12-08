'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type NewDriverInput, type DriverPayMode, formatPayMode } from '@/data/driver-shared';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSetupProgress } from '@/hooks/use-setup-progress';

// Helper component for Select with hidden input
function SelectWithHiddenInput({
  name,
  defaultValue,
  required,
  value,
  onValueChange,
  children,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = internalValue;
    }
  }, [internalValue]);

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <>
      <Select value={internalValue || undefined} onValueChange={handleChange} required={required}>
        {children}
      </Select>
      <input type="hidden" name={name} ref={hiddenInputRef} value={internalValue} />
    </>
  );
}

const STEPS = [
  { id: 'profile', title: 'Personal', description: 'Identity, contact, dates' },
  { id: 'access', title: 'Access', description: 'Portal login setup' },
  { id: 'compliance', title: 'Compliance', description: 'Licenses & docs' },
  { id: 'assignment', title: 'Assignment', description: 'Status & equipment' },
  { id: 'comp', title: 'Compensation', description: 'Pay & notes' },
];

interface DriverFormProps {
  initialData?: Partial<NewDriverInput> & {
    default_truck_id?: string | null;
    default_trailer_id?: string | null;
  };
  trucks?: Array<{ id: string; unit_number: string | null; plate_number: string | null; vehicle_type?: string | null; assigned_driver_id?: string | null }>;
  trailers?: Array<{ id: string; unit_number: string; type?: string | null; assigned_driver_id?: string | null }>;
  driverLookup?: Record<string, string>; // Maps driver ID to driver name
  currentDriverId?: string; // For edit mode - the driver being edited
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; driverId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; driverId?: string } | null>;
  submitLabel?: string;
  cancelHref?: string;
  hasServiceRoleKey?: boolean;
}

export function DriverForm({
  initialData,
  trucks = [],
  trailers = [],
  driverLookup = {},
  currentDriverId,
  onSubmit,
  submitLabel = 'Save driver',
  cancelHref = '/dashboard/drivers',
  hasServiceRoleKey = false,
}: DriverFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { markComplete } = useSetupProgress();
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const [currentStep, setCurrentStep] = useState(0);
  const [payMode, setPayMode] = useState<DriverPayMode>(
    (initialData?.pay_mode as DriverPayMode) || 'per_mile'
  );
  const [hasLogin, setHasLogin] = useState(
    hasServiceRoleKey ? (initialData?.has_login || false) : false
  );
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>(
    (initialData?.login_method as 'email' | 'phone') || 'email'
  );
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  // Location & capacity settings state
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(
    (initialData as any)?.location_sharing_enabled || false
  );
  const [autoPostCapacity, setAutoPostCapacity] = useState(
    (initialData as any)?.auto_post_capacity || false
  );
  
  // Disable portal access if service role key is missing
  useEffect(() => {
    if (!hasServiceRoleKey && hasLogin) {
      setHasLogin(false);
    }
  }, [hasServiceRoleKey, hasLogin]);
  const [licenseFile, setLicenseFile] = useState<{ name: string; url: string } | null>(null);
  const [medicalCardFile, setMedicalCardFile] = useState<{ name: string; url: string } | null>(null);
  const [drugTestFile, setDrugTestFile] = useState<{ name: string; url: string } | null>(null);
  const [taxFormFile, setTaxFormFile] = useState<{ name: string; url: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [snapshot, setSnapshot] = useState({
    name: [initialData?.first_name, initialData?.last_name].filter(Boolean).join(' ').trim(),
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    status: initialData?.status || 'active',
    payMode: ((initialData?.pay_mode as DriverPayMode) || 'per_mile') as DriverPayMode,
    assignedTruckId: initialData?.assigned_truck_id || '',
    assignedTrailerId: initialData?.assigned_trailer_id || '',
    defaultTruckId: initialData?.default_truck_id || '',
    defaultTrailerId: initialData?.default_trailer_id || '',
    hasLogin: initialData?.has_login || false,
    licenseNumber: initialData?.license_number || '',
    licenseExpiry: initialData?.license_expiry || '',
    medicalCardExpiry: initialData?.medical_card_expiry || '',
    authUserId: (initialData as any)?.auth_user_id || null,
  });

  // Track equipment conflicts for warnings
  const getEquipmentConflict = (type: 'truck' | 'trailer', equipmentId: string | null | undefined) => {
    if (!equipmentId || equipmentId === 'unassigned' || equipmentId === 'none') return null;
    const equipment = type === 'truck'
      ? trucks.find(t => t.id === equipmentId)
      : trailers.find(t => t.id === equipmentId);
    if (!equipment?.assigned_driver_id || equipment.assigned_driver_id === currentDriverId) return null;
    const driverName = driverLookup[equipment.assigned_driver_id];
    return driverName || 'another driver';
  };

  // Get current conflicts for assigned equipment
  const assignedTruckConflict = getEquipmentConflict('truck', snapshot.assignedTruckId);
  const assignedTrailerConflict = getEquipmentConflict('trailer', snapshot.assignedTrailerId);

  // Handler: When default equipment is set, auto-populate assigned if empty
  const handleDefaultTruckChange = (value: string) => {
    setSnapshot((prev) => {
      const newState = { ...prev, defaultTruckId: value };
      // Auto-sync to assigned if assigned is empty/unassigned
      if (!prev.assignedTruckId || prev.assignedTruckId === 'unassigned') {
        newState.assignedTruckId = value === 'none' ? '' : value;
      }
      return newState;
    });
  };

  const handleDefaultTrailerChange = (value: string) => {
    setSnapshot((prev) => {
      const newState = { ...prev, defaultTrailerId: value };
      // Auto-sync to assigned if assigned is empty/unassigned
      if (!prev.assignedTrailerId || prev.assignedTrailerId === 'unassigned') {
        newState.assignedTrailerId = value === 'none' ? '' : value;
      }
      return newState;
    });
  };

  // Store form values to preserve data on validation errors
  const [savedFormData, setSavedFormData] = useState<Record<string, string>>({});

  // Track whether to show errors (hide after user starts editing/navigating)
  const [errorsCleared, setErrorsCleared] = useState(false);

  // Confirmation dialog state for equipment reassignment
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const confirmedReassignmentRef = useRef(false);

  // Check if there are any equipment conflicts that need confirmation
  const hasEquipmentConflicts = assignedTruckConflict || assignedTrailerConflict;

  // Reset errorsCleared when new errors come in from form submission
  useEffect(() => {
    if (state?.errors) {
      setErrorsCleared(false);
    }
  }, [state?.errors]);

  // Helper to get field value: savedFormData (on error) > initialData > empty
  const getFieldValue = (fieldName: string, initialValue?: string) => {
    if (state?.errors && savedFormData[fieldName] !== undefined) {
      return savedFormData[fieldName];
    }
    return initialValue || '';
  };

  // Check if errors should be shown
  const shouldShowErrors = state?.errors && !errorsCleared;
  const sectionIndex: Record<string, number> = {
    profile: 0,
    access: 1,
    compliance: 2,
    assignment: 3,
    comp: 4,
  };

  // Map field names to step indices for error navigation
  const fieldToStepMap: Record<string, number> = {
    // Step 0 - Personal
    first_name: 0,
    last_name: 0,
    phone: 0,
    email: 0,
    date_of_birth: 0,
    start_date: 0,
    // Step 1 - Access
    has_login: 1,
    login_method: 1,
    driver_password: 1,
    driver_password_confirm: 1,
    // Step 2 - Compliance
    license_number: 2,
    license_state: 2,
    license_expiry: 2,
    is_cdl: 2,
    cdl_class: 2,
    cdl_endorsements: 2,
    cdl_restrictions: 2,
    medical_card_expiry: 2,
    medical_card_issue_date: 2,
    twic_card_number: 2,
    twic_card_expiry: 2,
    mvr_date: 2,
    // Step 3 - Assignment
    status: 3,
    assigned_truck_id: 3,
    assigned_trailer_id: 3,
    default_truck_id: 3,
    default_trailer_id: 3,
    // Step 4 - Compensation
    pay_mode: 4,
    rate_per_mile: 4,
    rate_per_cuft: 4,
    percent_of_revenue: 4,
    flat_daily_rate: 4,
    notes: 4,
  };
  const setFilePreview = (
    setter: React.Dispatch<React.SetStateAction<{ name: string; url: string } | null>>,
    file?: File
  ) => {
    setter((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      if (!file) return null;
      return { name: file.name, url: URL.createObjectURL(file) };
    });
  };
  useEffect(() => {
    return () => {
      [licenseFile, medicalCardFile, drugTestFile, taxFormFile].forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [licenseFile, medicalCardFile, drugTestFile, taxFormFile]);

  // On successful server action, show toast then navigate.
  useEffect(() => {
    if (state?.success) {
      // Mark setup progress for first driver
      markComplete('first_driver_added');
      // TEMPORARY DEBUG: Show what was sent
      const debugInfo = (state as any)?._debug;
      toast({
        title: 'Driver saved',
        description: debugInfo
          ? `DEBUG: form_loc=${debugInfo.form_location_sharing}, form_auto=${debugInfo.form_auto_post}, val_loc=${debugInfo.validated_location_sharing}, val_auto=${debugInfo.validated_auto_post}, truck=${debugInfo.validated_default_truck}, trailer=${debugInfo.validated_default_trailer}`
          : 'The driver was created successfully.',
      });
      router.push('/dashboard/drivers');
      router.refresh();
    }
  }, [state?.success, router, toast, markComplete]);

  // When errors occur, navigate to the step containing the first error field
  useEffect(() => {
    if (state?.errors && !state.success) {
      const errorFields = Object.keys(state.errors).filter(key => key !== '_form');
      let targetStep = currentStep;
      let targetField: string | null = null;

      // Check for field-specific errors
      if (errorFields.length > 0) {
        // Find the lowest step index that has an error
        for (const field of errorFields) {
          const stepIndex = fieldToStepMap[field];
          if (stepIndex !== undefined && (targetField === null || stepIndex < targetStep)) {
            targetStep = stepIndex;
            targetField = field;
          }
        }
      }

      // Check for _form errors that mention specific fields (e.g., duplicate email)
      const formError = state.errors._form?.toLowerCase() || '';
      if (formError) {
        // Detect email-related errors
        if (formError.includes('email') && (targetField === null || fieldToStepMap.email < targetStep)) {
          targetStep = fieldToStepMap.email;
          targetField = 'email';
        }
        // Detect phone-related errors
        else if (formError.includes('phone') && (targetField === null || fieldToStepMap.phone < targetStep)) {
          targetStep = fieldToStepMap.phone;
          targetField = 'phone';
        }
        // Detect password-related errors
        else if ((formError.includes('password') || formError.includes('portal')) &&
                 (targetField === null || fieldToStepMap.driver_password < targetStep)) {
          targetStep = fieldToStepMap.driver_password;
          targetField = 'driver_password';
        }
        // Detect license-related errors
        else if (formError.includes('license') && (targetField === null || fieldToStepMap.license_number < targetStep)) {
          targetStep = fieldToStepMap.license_number;
          targetField = 'license_number';
        }
      }

      // Navigate to the step with the error if different from current
      if (targetStep !== currentStep) {
        setCurrentStep(targetStep);
        scrollToTop();
      }

      // Focus the error field after a brief delay
      if (targetField) {
        setTimeout(() => {
          const el = document.getElementById(targetField!);
          el?.focus();
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [state?.errors, state?.success]);
  const complianceItems = [
    { id: 'license_file', label: "Driver's license copy", ok: Boolean(licenseFile), url: licenseFile?.url },
    { id: 'medical_card_file', label: 'Medical card image', ok: Boolean(medicalCardFile), url: medicalCardFile?.url },
    { id: 'drug_test_file', label: 'Drug test documentation', ok: Boolean(drugTestFile), url: drugTestFile?.url },
    { id: 'tax_form_file', label: 'Signed W9 or W2', ok: Boolean(taxFormFile), url: taxFormFile?.url },
  ];
  const getTruckLabel = (id?: string | null) => {
    if (!id) {
      return 'Not assigned';
    }
    const truck = trucks.find((truckItem) => truckItem.id === id);
    return truck?.unit_number || truck?.plate_number || 'Truck';
  };
  const getTrailerLabel = (id?: string | null) => {
    if (!id) {
      return 'Not assigned';
    }
    const trailer = trailers.find((trailerItem) => trailerItem.id === id);
    return trailer?.unit_number || 'Trailer';
  };
  const selectedTruck = trucks.find((truckItem) => truckItem.id === snapshot.assignedTruckId);
  const selectedTruckType = (selectedTruck as any)?.vehicle_type;
  const canAssignTrailer = !selectedTruck || selectedTruckType === 'tractor';

  // Default equipment logic
  const selectedDefaultTruck = trucks.find((truckItem) => truckItem.id === snapshot.defaultTruckId);
  const selectedDefaultTruckType = selectedDefaultTruck?.vehicle_type;
  const canAssignDefaultTrailer = selectedDefaultTruck && selectedDefaultTruckType === 'tractor';
  const parseDateSafe = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const daysUntil = (value?: string | null) => {
    const date = parseDateSafe(value);
    if (!date) return null;
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const expiryBadge = (value?: string | null) => {
    if (!value) return { label: 'Not set', className: 'bg-muted text-muted-foreground' };
    const days = daysUntil(value);
    if (days === null) return { label: 'Invalid date', className: 'bg-rose-500/10 text-rose-600' };
    if (days < 0) return { label: 'Expired', className: 'bg-rose-500/10 text-rose-600' };
    if (days <= 30) return { label: `Due in ${days}d`, className: 'bg-amber-500/10 text-amber-600' };
    return { label: 'Valid', className: 'bg-emerald-500/10 text-emerald-600' };
  };
  const quickNav = [
    { id: 'profile', label: 'Profile', description: 'Name, contact, start date', target: 0 },
    { id: 'access', label: 'Access', description: 'Portal access setup', target: 1 },
    { id: 'compliance', label: 'Compliance', description: 'Licenses & medical', target: 2 },
    { id: 'assignment', label: 'Assignment', description: 'Status & equipment', target: 3 },
    { id: 'compensation', label: 'Compensation', description: 'Pay mode & notes', target: 4 },
  ];

  useEffect(() => {
    if (initialData?.pay_mode) {
      setPayMode(initialData.pay_mode as DriverPayMode);
    }
  }, [initialData?.pay_mode]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const syncSnapshot = () => {
      const formData = new FormData(form);
      const firstName = (formData.get('first_name') as string) || '';
      const lastName = (formData.get('last_name') as string) || '';
      const phoneValue = (formData.get('phone') as string) || '';
      const truckId = (formData.get('assigned_truck_id') as string) || '';
      const trailerId = (formData.get('assigned_trailer_id') as string) || '';
      const defaultTruckIdValue = (formData.get('default_truck_id') as string) || '';
      const defaultTrailerIdValue = (formData.get('default_trailer_id') as string) || '';
      const statusValue = ((formData.get('status') as string) || 'active') as 'active' | 'inactive' | 'suspended';
      const modeValue = ((formData.get('pay_mode') as DriverPayMode) || payMode) as DriverPayMode;
      const hasLoginValue = (formData.get('has_login') as string) === 'true';
      const emailValue = (formData.get('email') as string) || '';
      const licenseNumber = (formData.get('license_number') as string) || '';
      const licenseExpiry = (formData.get('license_expiry') as string) || '';
      const medicalCardExpiry = (formData.get('medical_card_expiry') as string) || '';

      setSnapshot({
        name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        phone: phoneValue,
        email: emailValue,
        status: statusValue,
        payMode: modeValue,
        assignedTruckId: truckId,
        assignedTrailerId: trailerId,
        defaultTruckId: defaultTruckIdValue,
        defaultTrailerId: defaultTrailerIdValue,
        hasLogin: hasLoginValue,
        licenseNumber,
        licenseExpiry,
        medicalCardExpiry,
        authUserId: snapshot.authUserId,
      });
    };

    syncSnapshot();
    form.addEventListener('input', syncSnapshot);
    form.addEventListener('change', syncSnapshot);

    return () => {
      form.removeEventListener('input', syncSnapshot);
      form.removeEventListener('change', syncSnapshot);
    };
  }, [payMode]);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ section: string }>).detail;
      if (!detail || !(detail.section in sectionIndex)) return;
      setCurrentStep(sectionIndex[detail.section]);
      scrollToTop();
    };
    window.addEventListener('driver-jump', handler as EventListener);
    return () => window.removeEventListener('driver-jump', handler as EventListener);
  }, []);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setErrorsCleared(true); // Clear errors when navigating
      scrollToTop();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrorsCleared(true); // Clear errors when navigating
      scrollToTop();
    }
  };

  // Capture form data before submission to preserve values on error
  // If there are equipment conflicts, show confirmation dialog first
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const values: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        values[key] = value;
      }
    });
    setSavedFormData(values);

    // If there are equipment conflicts and user hasn't confirmed, show confirmation dialog
    if (hasEquipmentConflicts && !confirmedReassignmentRef.current) {
      e.preventDefault();
      setPendingFormData(formData);
      setShowReassignConfirm(true);
      return;
    }

    // Reset the confirmation flag for next submission
    confirmedReassignmentRef.current = false;
    // No conflicts or user confirmed - let the form action run normally
  };

  // Handle confirmed reassignment - submit the form programmatically
  const handleConfirmReassignment = () => {
    setShowReassignConfirm(false);
    if (formRef.current) {
      // Set the flag so handleFormSubmit knows to skip the confirmation check
      confirmedReassignmentRef.current = true;
      // Submit the form using the action
      formRef.current.requestSubmit();
    }
    setPendingFormData(null);
  };

  // Handle cancel - close dialog without submitting
  const handleCancelReassignment = () => {
    setShowReassignConfirm(false);
    setPendingFormData(null);
  };

  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Clear, required identity fields so HR, dispatch, and compliance share a single source of truth.
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-sm">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      key={`first_name-${savedFormData.first_name ?? 'init'}`}
                      id="first_name"
                      name="first_name"
                      required
                      defaultValue={getFieldValue('first_name', initialData?.first_name)}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.first_name && (
                      <p className="text-xs text-destructive">{state.errors.first_name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-sm">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      key={`last_name-${savedFormData.last_name ?? 'init'}`}
                      id="last_name"
                      name="last_name"
                      required
                      defaultValue={getFieldValue('last_name', initialData?.last_name)}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.last_name && (
                      <p className="text-xs text-destructive">{state.errors.last_name}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      key={`phone-${savedFormData.phone ?? 'init'}`}
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      defaultValue={getFieldValue('phone', initialData?.phone)}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.phone && (
                      <p className="text-xs text-destructive">{state.errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      key={`email-${savedFormData.email ?? 'init'}`}
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={getFieldValue('email', initialData?.email)}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.email && (
                      <p className="text-xs text-destructive">{state.errors.email}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_birth" className="text-sm">Date of Birth</Label>
                    <DatePicker
                      key={`date_of_birth-${savedFormData.date_of_birth ?? 'init'}`}
                      name="date_of_birth"
                      defaultValue={getFieldValue('date_of_birth', initialData?.date_of_birth)}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-sm">Start Date</Label>
                    <DatePicker
                      key={`start_date-${savedFormData.start_date ?? 'init'}`}
                      name="start_date"
                      defaultValue={getFieldValue('start_date', initialData?.start_date)}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <Card className="border-blue-200/60 bg-blue-50/60 shadow-sm dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Portal Access (optional)</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Give this driver login access to view trips and documents. Send invite by email or mobile.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasServiceRoleKey && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Driver login creation is disabled because SUPABASE_SERVICE_ROLE_KEY is not configured.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex items-center justify-between rounded-lg border border-blue-200/70 bg-white/40 px-3 py-2 dark:bg-transparent">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable login</p>
                    <p className="text-xs text-muted-foreground">Creates a portal user tied to this driver</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="has_login"
                      checked={hasLogin}
                      disabled={!hasServiceRoleKey}
                      onCheckedChange={(checked) => setHasLogin(checked === true)}
                    />
                    <input type="hidden" name="has_login" value={hasLogin ? 'true' : 'false'} />
                  </div>
                </div>
                {hasServiceRoleKey && (
                  <p className="text-xs text-muted-foreground">
                    Credentials are handled through your auth provider; no passwords are stored here.
                  </p>
                )}
                {hasLogin && hasServiceRoleKey && (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Delivery method</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLoginMethod('email')}
                          className={cn(
                            "flex flex-col items-start rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition",
                            loginMethod === 'email'
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                              : "border-border/70 hover:border-border"
                          )}
                        >
                          <span className="font-semibold text-foreground">Email</span>
                          <span className="text-xs text-muted-foreground">
                            Send invite to driver email above
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginMethod('phone')}
                          className={cn(
                            "flex flex-col items-start rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition",
                            loginMethod === 'phone'
                              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
                              : "border-border/70 hover:border-border"
                          )}
                        >
                          <span className="font-semibold text-foreground">Mobile</span>
                          <span className="text-xs text-muted-foreground">
                            Send SMS invite to phone on file
                          </span>
                        </button>
                      </div>
                      <input type="hidden" name="login_method" value={loginMethod} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Login identifier</Label>
                        <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground">
                          {loginMethod === 'email'
                            ? (snapshot.email || 'Uses driver email above')
                            : (snapshot.phone || 'Uses driver phone above')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We will use the driver&apos;s {loginMethod === 'email' ? 'email' : 'mobile number'} as their username.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Role</Label>
                        <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          Driver (read-only trips + docs)
                        </div>
                        <p className="text-xs text-muted-foreground">Additional roles can be added later.</p>
                      </div>
                    </div>
                    {!snapshot.authUserId && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm" htmlFor="driver_password">
                            Set portal password <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="driver_password"
                            type="password"
                            name="driver_password"
                            required={hasLogin}
                            minLength={6}
                            placeholder="Password"
                            className="h-9"
                            autoComplete="new-password"
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Min 6 characters.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm" htmlFor="driver_password_confirm">
                            Confirm password <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="driver_password_confirm"
                            type="password"
                            name="driver_password_confirm"
                            required={hasLogin}
                            minLength={6}
                            placeholder="Repeat password"
                            className={cn("h-9", passwordMismatch && "border-destructive focus-visible:ring-destructive")}
                            autoComplete="new-password"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                          {passwordMismatch && (
                            <p className="text-xs text-destructive">Passwords do not match</p>
                          )}
                        </div>
                      </div>
                    )}
                    {snapshot.authUserId && (
                      <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Reset portal password</p>
                            <p className="text-xs text-muted-foreground">Requires a new strong password.</p>
                          </div>
                          <Checkbox
                            id="reset_portal_password"
                            checked={showPasswordReset}
                            onCheckedChange={(checked) => setShowPasswordReset(checked === true)}
                          />
                        </div>
                        <input type="hidden" name="reset_portal_password" value={showPasswordReset ? 'true' : 'false'} />
                        {showPasswordReset && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-sm" htmlFor="driver_password_reset">
                                New password <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="driver_password_reset"
                                type="password"
                                name="driver_password"
                                required
                                minLength={6}
                                placeholder="Password"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm" htmlFor="driver_password_confirm_reset">
                                Confirm new password <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="driver_password_confirm_reset"
                                type="password"
                                name="driver_password_confirm"
                                required
                                minLength={6}
                                placeholder="Repeat password"
                                className="h-9"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cover CDL details, medical card, and keep critical files handy.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <Card className="border-border/70 bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Driver&apos;s license</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Number, issuing state, expiry, license type, and license copy.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="license_number" className="text-sm">
                            License # <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            key={`license_number-${savedFormData.license_number ?? 'init'}`}
                            id="license_number"
                            name="license_number"
                            required
                            defaultValue={getFieldValue('license_number', initialData?.license_number)}
                            className="h-9"
                          />
                          {shouldShowErrors && state?.errors?.license_number && (
                            <p className="text-xs text-destructive">{state.errors.license_number}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="license_state" className="text-sm">State</Label>
                          <Input
                            key={`license_state-${savedFormData.license_state ?? 'init'}`}
                            id="license_state"
                            name="license_state"
                            placeholder="CA"
                            defaultValue={getFieldValue('license_state', initialData?.license_state)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="license_expiry" className="text-sm">
                            Expiry <span className="text-destructive">*</span>
                          </Label>
                          <DatePicker
                            key={`license_expiry-${savedFormData.license_expiry ?? 'init'}`}
                            name="license_expiry"
                            defaultValue={getFieldValue('license_expiry', initialData?.license_expiry)}
                            placeholder="Select date"
                            className="h-9"
                          />
                          {shouldShowErrors && state?.errors?.license_expiry && (
                            <p className="text-xs text-destructive">{state.errors.license_expiry}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">License type</Label>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="radio"
                              name="is_cdl"
                              value="true"
                              defaultChecked={false}
                              className="h-4 w-4 border-border text-primary focus:ring-primary"
                            />
                            CDL
                          </label>
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="radio"
                              name="is_cdl"
                              value="false"
                              defaultChecked
                              className="h-4 w-4 border-border text-primary focus:ring-primary"
                            />
                            Non-CDL
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">Mark whether this is a CDL license for compliance.</p>
                      </div>
                      {/* CDL-specific fields */}
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="cdl_class" className="text-sm">CDL Class</Label>
                          <Input
                            key={`cdl_class-${savedFormData.cdl_class ?? 'init'}`}
                            id="cdl_class"
                            name="cdl_class"
                            placeholder="A, B, C"
                            maxLength={1}
                            defaultValue={getFieldValue('cdl_class', (initialData as any)?.cdl_class)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cdl_endorsements" className="text-sm">Endorsements</Label>
                          <Input
                            key={`cdl_endorsements-${savedFormData.cdl_endorsements ?? 'init'}`}
                            id="cdl_endorsements"
                            name="cdl_endorsements"
                            placeholder="H, N, P, S, T, X"
                            defaultValue={getFieldValue('cdl_endorsements', (initialData as any)?.cdl_endorsements)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cdl_restrictions" className="text-sm">Restrictions</Label>
                          <Input
                            key={`cdl_restrictions-${savedFormData.cdl_restrictions ?? 'init'}`}
                            id="cdl_restrictions"
                            name="cdl_restrictions"
                            placeholder="Any restrictions"
                            defaultValue={getFieldValue('cdl_restrictions', (initialData as any)?.cdl_restrictions)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                      <Label htmlFor="license_file" className="text-sm">
                        Driver&apos;s license copy
                      </Label>
                      <Input
                        id="license_file"
                        name="license_file"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            setFilePreview(setLicenseFile, file || undefined);
                          }}
                      />
                      {licenseFile?.name && (
                          <p className="text-xs text-muted-foreground">Added: {licenseFile.name}</p>
                      )}
                    </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Medical & compliance docs</CardTitle>
                      <p className="text-xs text-muted-foreground">Track medical card and store required docs.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="medical_card_expiry" className="text-sm">
                            Medical card expiry <span className="text-destructive">*</span>
                          </Label>
                          <DatePicker
                            key={`medical_card_expiry-${savedFormData.medical_card_expiry ?? 'init'}`}
                            name="medical_card_expiry"
                            defaultValue={getFieldValue('medical_card_expiry', initialData?.medical_card_expiry)}
                            placeholder="Select date"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="medical_card_issue_date" className="text-sm">
                            Issue date (optional)
                          </Label>
                          <DatePicker
                            key={`medical_card_issue_date-${savedFormData.medical_card_issue_date ?? 'init'}`}
                            name="medical_card_issue_date"
                            defaultValue={getFieldValue('medical_card_issue_date', (initialData as any)?.medical_card_issue_date)}
                            placeholder="Select date"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="medical_card_file" className="text-sm">
                            Medical card image
                          </Label>
                          <Input
                            id="medical_card_file"
                            name="medical_card_file"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              setFilePreview(setMedicalCardFile, file || undefined);
                            }}
                          />
                          {medicalCardFile?.name && (
                            <p className="text-xs text-muted-foreground">Added: {medicalCardFile.name}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="drug_test_file" className="text-sm">
                            Drug test documentation
                          </Label>
                          <Input
                            id="drug_test_file"
                            name="drug_test_file"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              setFilePreview(setDrugTestFile, file || undefined);
                            }}
                          />
                          {drugTestFile?.name && (
                            <p className="text-xs text-muted-foreground">Added: {drugTestFile.name}</p>
                          )}
                        </div>
                      </div>
                      {/* TWIC Card */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="twic_card_number" className="text-sm">TWIC Card #</Label>
                          <Input
                            id="twic_card_number"
                            name="twic_card_number"
                            placeholder="Card number (optional)"
                            defaultValue={(initialData as any)?.twic_card_number || ''}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="twic_card_expiry" className="text-sm">TWIC Expiry</Label>
                          <DatePicker
                            name="twic_card_expiry"
                            defaultValue={(initialData as any)?.twic_card_expiry || ''}
                            placeholder="Select date"
                            className="h-9"
                          />
                        </div>
                      </div>
                      {/* MVR Date */}
                      <div className="space-y-1.5">
                        <Label htmlFor="mvr_date" className="text-sm">Last MVR Date</Label>
                        <DatePicker
                          name="mvr_date"
                          defaultValue={(initialData as any)?.mvr_date || ''}
                          placeholder="Select date"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">Date of most recent Motor Vehicle Record check</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tax_form_file" className="text-sm">
                          Signed W9 or W2
                        </Label>
                        <Input
                          id="tax_form_file"
                          name="tax_form_file"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            setFilePreview(setTaxFormFile, file || undefined);
                          }}
                        />
                        {taxFormFile?.name && (
                          <p className="text-xs text-muted-foreground">Added: {taxFormFile.name}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assignment & Status</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Keep dispatch in sync with who is active and what equipment they own today.
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <SelectWithHiddenInput
                    key={`status-${savedFormData.status ?? 'init'}`}
                    name="status"
                    defaultValue={getFieldValue('status', initialData?.status) || 'active'}
                  >
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="assigned_truck_id" className="text-sm">Assigned Truck</Label>
                    <SelectWithHiddenInput
                      key={`assigned_truck_id-${savedFormData.assigned_truck_id ?? 'init'}`}
                      name="assigned_truck_id"
                      value={snapshot.assignedTruckId || 'unassigned'}
                      onValueChange={(value) => setSnapshot(prev => ({ ...prev, assignedTruckId: value }))}
                    >
                      <SelectTrigger id="assigned_truck_id" className="h-9">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {trucks.map((truck) => {
                          const isAssignedToOther = truck.assigned_driver_id && truck.assigned_driver_id !== currentDriverId;
                          const assignedDriverName = isAssignedToOther && truck.assigned_driver_id ? driverLookup[truck.assigned_driver_id] : null;
                          const truckLabel = truck.unit_number || truck.plate_number || `Truck ${truck.id.slice(0, 8)}`;
                          return (
                            <SelectItem key={truck.id} value={truck.id}>
                              {truckLabel}
                              {assignedDriverName && (
                                <span className="text-muted-foreground"> (Assigned: {assignedDriverName})</span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </SelectWithHiddenInput>
                    {assignedTruckConflict && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ This truck is assigned to {assignedTruckConflict}. Saving will reassign it.
                      </p>
                    )}
                  </div>
                  {canAssignTrailer ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="assigned_trailer_id" className="text-sm">Assigned Trailer</Label>
                      <SelectWithHiddenInput
                        key={`assigned_trailer_id-${savedFormData.assigned_trailer_id ?? 'init'}`}
                        name="assigned_trailer_id"
                        value={snapshot.assignedTrailerId || 'unassigned'}
                        onValueChange={(value) => setSnapshot(prev => ({ ...prev, assignedTrailerId: value }))}
                      >
                        <SelectTrigger id="assigned_trailer_id" className="h-9">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {trailers.map((trailer) => {
                            const isAssignedToOther = trailer.assigned_driver_id && trailer.assigned_driver_id !== currentDriverId;
                            const assignedDriverName = isAssignedToOther && trailer.assigned_driver_id ? driverLookup[trailer.assigned_driver_id] : null;
                            return (
                              <SelectItem key={trailer.id} value={trailer.id}>
                                {trailer.unit_number}
                                {assignedDriverName && (
                                  <span className="text-muted-foreground"> (Assigned: {assignedDriverName})</span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </SelectWithHiddenInput>
                      {assignedTrailerConflict && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ This trailer is assigned to {assignedTrailerConflict}. Saving will reassign it.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Assigned Trailer</Label>
                      <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        Not applicable for this truck type
                      </div>
                      <input type="hidden" name="assigned_trailer_id" value="unassigned" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Default Equipment - for auto-populating trips */}
            <Card className="border-emerald-200/60 bg-emerald-50/60 shadow-sm dark:bg-emerald-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Default Equipment</CardTitle>
                <p className="text-xs text-muted-foreground">
                  When assigning this driver to a trip, auto-fill the trip&apos;s truck and trailer from these defaults.
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="default_truck_id" className="text-sm">Default Truck</Label>
                    <SelectWithHiddenInput
                      key={`default_truck_id-${savedFormData.default_truck_id ?? 'init'}`}
                      name="default_truck_id"
                      value={snapshot.defaultTruckId || 'none'}
                      onValueChange={handleDefaultTruckChange}
                    >
                      <SelectTrigger id="default_truck_id" className="h-9">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {trucks.map((truck) => {
                          const truckLabel = truck.unit_number || truck.plate_number || `Truck ${truck.id.slice(0, 8)}`;
                          const vehicleTypeLabel = truck.vehicle_type ? ` (${truck.vehicle_type.replace(/_/g, ' ')})` : '';
                          return (
                            <SelectItem key={truck.id} value={truck.id}>
                              {truckLabel}{vehicleTypeLabel}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </SelectWithHiddenInput>
                    <p className="text-xs text-muted-foreground">
                      {(!snapshot.assignedTruckId || snapshot.assignedTruckId === 'unassigned')
                        ? 'Will also set as assigned truck'
                        : 'Used for auto-fill when creating trips'}
                    </p>
                  </div>
                  {canAssignDefaultTrailer ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="default_trailer_id" className="text-sm">Default Trailer</Label>
                      <SelectWithHiddenInput
                        key={`default_trailer_id-${savedFormData.default_trailer_id ?? 'init'}`}
                        name="default_trailer_id"
                        value={snapshot.defaultTrailerId || 'none'}
                        onValueChange={handleDefaultTrailerChange}
                      >
                        <SelectTrigger id="default_trailer_id" className="h-9">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {trailers.map((trailer) => {
                            const trailerTypeLabel = trailer.type ? ` (${trailer.type.replace(/_/g, ' ')})` : '';
                            return (
                              <SelectItem key={trailer.id} value={trailer.id}>
                                {trailer.unit_number}{trailerTypeLabel}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </SelectWithHiddenInput>
                      <p className="text-xs text-muted-foreground">
                        {(!snapshot.assignedTrailerId || snapshot.assignedTrailerId === 'unassigned')
                          ? 'Will also set as assigned trailer'
                          : 'Used for auto-fill when creating trips'}
                      </p>
                    </div>
                  ) : snapshot.defaultTruckId && snapshot.defaultTruckId !== 'none' ? (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Default Trailer</Label>
                      <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        Not applicable (truck is not a tractor)
                      </div>
                      <input type="hidden" name="default_trailer_id" value="none" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Default Trailer</Label>
                      <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        Select a default truck first
                      </div>
                      <input type="hidden" name="default_trailer_id" value="none" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location & Matching Settings */}
            <Card className="border-indigo-200/60 bg-indigo-50/60 shadow-sm dark:bg-indigo-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Location & Load Matching</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Control GPS sharing and visibility for smart load matching suggestions.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-indigo-200/70 bg-white/40 px-3 py-2 dark:bg-transparent">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Share GPS Location</p>
                    <p className="text-xs text-muted-foreground">Allow location tracking for load suggestions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="location_sharing_enabled"
                      checked={locationSharingEnabled}
                      onCheckedChange={(checked) => setLocationSharingEnabled(checked === true)}
                    />
                    <input type="hidden" name="location_sharing_enabled" value={locationSharingEnabled ? 'true' : 'false'} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-indigo-200/70 bg-white/40 px-3 py-2 dark:bg-transparent">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Auto-Post Capacity</p>
                    <p className="text-xs text-muted-foreground">Automatically share remaining trailer capacity</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto_post_capacity"
                      checked={autoPostCapacity}
                      onCheckedChange={(checked) => setAutoPostCapacity(checked === true)}
                    />
                    <input type="hidden" name="auto_post_capacity" value={autoPostCapacity ? 'true' : 'false'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capacity_visibility" className="text-sm">Capacity Visibility</Label>
                  <SelectWithHiddenInput
                    name="capacity_visibility"
                    defaultValue={(initialData as any)?.capacity_visibility || 'private'}
                  >
                    <SelectTrigger id="capacity_visibility" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private (only you see suggestions)</SelectItem>
                      <SelectItem value="partners_only">Partners only</SelectItem>
                      <SelectItem value="public">Public (visible on marketplace)</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                  <p className="text-xs text-muted-foreground">Who can see this driver&apos;s available capacity</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 4:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compensation</CardTitle>
              <p className="text-xs text-muted-foreground">
                Select the pay structure; required fields adapt to the mode you choose.
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="pay_mode" className="text-sm">
                  Pay Mode <span className="text-destructive">*</span>
                </Label>
                <SelectWithHiddenInput
                  name="pay_mode"
                  value={payMode}
                  onValueChange={(value) => setPayMode(value as DriverPayMode)}
                  required
                >
                  <SelectTrigger id="pay_mode" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_mile">Per mile</SelectItem>
                    <SelectItem value="per_cuft">Per cubic foot</SelectItem>
                    <SelectItem value="per_mile_and_cuft">Per mile and cubic foot</SelectItem>
                  <SelectItem value="percent_of_revenue">% of trip revenue</SelectItem>
                  <SelectItem value="flat_daily_rate">Flat daily rate</SelectItem>
                </SelectContent>
              </SelectWithHiddenInput>
              {shouldShowErrors && state?.errors?.pay_mode && (
                <p className="text-xs text-destructive">{state.errors.pay_mode}</p>
              )}
            </div>

              {payMode === 'per_mile' && (
                <div className="space-y-1.5">
                  <Label htmlFor="rate_per_mile" className="text-sm">
                    Rate per mile ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    key={`rate_per_mile-${savedFormData.rate_per_mile ?? 'init'}`}
                    id="rate_per_mile"
                    name="rate_per_mile"
                    type="number"
                    step="0.01"
                    min="0"
                    required={payMode === 'per_mile'}
                    defaultValue={getFieldValue('rate_per_mile', initialData?.rate_per_mile?.toString())}
                    className="h-9"
                  />
                  {shouldShowErrors && state?.errors?.rate_per_mile && (
                    <p className="text-xs text-destructive">{state.errors.rate_per_mile}</p>
                  )}
                </div>
              )}

              {payMode === 'per_cuft' && (
                <div className="space-y-1.5">
                  <Label htmlFor="rate_per_cuft" className="text-sm">
                    Rate per cubic foot ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    key={`rate_per_cuft-${savedFormData.rate_per_cuft ?? 'init'}`}
                    id="rate_per_cuft"
                    name="rate_per_cuft"
                    type="number"
                    step="0.01"
                    min="0"
                    required={payMode === 'per_cuft'}
                    defaultValue={getFieldValue('rate_per_cuft', initialData?.rate_per_cuft?.toString())}
                    className="h-9"
                  />
                  {shouldShowErrors && state?.errors?.rate_per_cuft && (
                    <p className="text-xs text-destructive">{state.errors.rate_per_cuft}</p>
                  )}
                </div>
              )}

              {payMode === 'per_mile_and_cuft' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rate_per_mile_dual" className="text-sm">
                      Rate per mile ($) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      key={`rate_per_mile_dual-${savedFormData.rate_per_mile ?? 'init'}`}
                      id="rate_per_mile_dual"
                      name="rate_per_mile"
                      type="number"
                      step="0.01"
                      min="0"
                      required={payMode === 'per_mile_and_cuft'}
                      defaultValue={getFieldValue('rate_per_mile', initialData?.rate_per_mile?.toString())}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.rate_per_mile && (
                      <p className="text-xs text-destructive">{state.errors.rate_per_mile}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rate_per_cuft_dual" className="text-sm">
                      Rate per cubic foot ($) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      key={`rate_per_cuft_dual-${savedFormData.rate_per_cuft ?? 'init'}`}
                      id="rate_per_cuft_dual"
                      name="rate_per_cuft"
                      type="number"
                      step="0.01"
                      min="0"
                      required={payMode === 'per_mile_and_cuft'}
                      defaultValue={getFieldValue('rate_per_cuft', initialData?.rate_per_cuft?.toString())}
                      className="h-9"
                    />
                    {shouldShowErrors && state?.errors?.rate_per_cuft && (
                      <p className="text-xs text-destructive">{state.errors.rate_per_cuft}</p>
                    )}
                  </div>
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Driver is paid per mile AND per cubic foot.
                  </p>
                </div>
              )}

              {payMode === 'percent_of_revenue' && (
                <div className="space-y-1.5">
                  <Label htmlFor="percent_of_revenue" className="text-sm">
                    % of trip revenue <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    key={`percent_of_revenue-${savedFormData.percent_of_revenue ?? 'init'}`}
                    id="percent_of_revenue"
                    name="percent_of_revenue"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required={payMode === 'percent_of_revenue'}
                    defaultValue={getFieldValue('percent_of_revenue', initialData?.percent_of_revenue?.toString())}
                    className="h-9"
                  />
                  {shouldShowErrors && state?.errors?.percent_of_revenue && (
                    <p className="text-xs text-destructive">{state.errors.percent_of_revenue}</p>
                  )}
                </div>
              )}

              {payMode === 'flat_daily_rate' && (
                <div className="space-y-1.5">
                  <Label htmlFor="flat_daily_rate" className="text-sm">
                    Flat daily rate ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    key={`flat_daily_rate-${savedFormData.flat_daily_rate ?? 'init'}`}
                    id="flat_daily_rate"
                    name="flat_daily_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    required={payMode === 'flat_daily_rate'}
                    defaultValue={getFieldValue('flat_daily_rate', initialData?.flat_daily_rate?.toString())}
                    className="h-9"
                  />
                  {shouldShowErrors && state?.errors?.flat_daily_rate && (
                    <p className="text-xs text-destructive">{state.errors.flat_daily_rate}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  key={`notes-${savedFormData.notes ?? 'init'}`}
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Additional notes about this driver..."
                  defaultValue={getFieldValue('notes', initialData?.notes)}
                  className="text-sm"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                These values will be used later to calculate trip settlements. This step just stores the configuration.
              </p>
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
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Driver snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live preview as you build the record.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Driver</p>
                <p className="text-lg font-semibold text-foreground">{snapshot.name || 'Not set'}</p>
                <p className="text-xs text-muted-foreground">{snapshot.email || 'No email yet'}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                {snapshot.status}
              </span>
            </div>
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Portal</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    snapshot.hasLogin ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"
                  )}
                >
                  {snapshot.hasLogin ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pay mode</span>
                <span className="font-semibold text-foreground">{formatPayMode(snapshot.payMode)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Truck</span>
                <span className="font-semibold text-foreground">{getTruckLabel(snapshot.assignedTruckId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trailer</span>
                <span className="font-semibold text-foreground">{getTrailerLabel(snapshot.assignedTrailerId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">License expiry</span>
                {(() => {
                  const badge = expiryBadge(snapshot.licenseExpiry);
                  return (
                    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide", badge.className)}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Medical card</span>
                {(() => {
                  const badge = expiryBadge(snapshot.medicalCardExpiry);
                  return (
                    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide", badge.className)}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      <form ref={formRef} action={formAction} onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {complianceItems.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.url) {
                  window.open(card.url, '_blank');
                  return;
                }
                setCurrentStep(sectionIndex.compliance);
                scrollToTop();
                setTimeout(() => {
                  const el = document.getElementById(card.id) as HTMLInputElement | null;
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.focus();
                }, 0);
              }}
              className={cn(
                "group flex h-full flex-col rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                currentStep === sectionIndex.compliance && "border-primary/40 ring-2 ring-primary/20"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold">{card.label}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.ok ? 'Added — tap to view or replace.' : 'Missing — tap to add this file.'}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    card.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}
                >
                  {card.ok ? 'Ready' : 'Pending'}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickNav.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setCurrentStep(item.target);
                scrollToTop();
              }}
              className={cn(
                "group flex flex-col items-start rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                currentStep === item.target && "border-primary/40 ring-2 ring-primary/20"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-[12px] font-semibold text-emerald-600">
                  {item.target + 1}
                </span>
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>

        {shouldShowErrors && state?.errors?._form && (
          <Alert variant="destructive" className="py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm whitespace-pre-wrap font-mono">
              {state.errors._form}
            </AlertDescription>
          </Alert>
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
            <Button variant="outline" asChild className="h-10">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>

          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 && (
              <Button type="button" onClick={nextStep} className="h-10 min-w-[120px]">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button type="submit" disabled={pending} className="h-10 min-w-[140px]">
              {pending ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {/* Confirmation dialog for equipment reassignment */}
      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Equipment Reassignment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>The following equipment is currently assigned to other drivers:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {assignedTruckConflict && (
                    <li>
                      <strong>Truck:</strong> Currently assigned to {assignedTruckConflict}
                    </li>
                  )}
                  {assignedTrailerConflict && (
                    <li>
                      <strong>Trailer:</strong> Currently assigned to {assignedTrailerConflict}
                    </li>
                  )}
                </ul>
                <p className="pt-2">
                  Saving will reassign this equipment to the current driver. Do you want to continue?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReassignment}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReassignment}>
              Confirm Reassignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

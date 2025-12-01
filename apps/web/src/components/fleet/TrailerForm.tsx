'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type NewTrailerInput } from '@/data/fleet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Document field mappings for trailers
const DOC_FIELD_MAP: Record<string, string> = {
  registration_file: 'registration_photo_url',
  inspection_file: 'inspection_photo_url',
};

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
  { id: 'basic', title: 'Basics', description: 'Identity & status' },
  { id: 'vehicle', title: 'Vehicle Details', description: 'VIN & specs' },
  { id: 'compliance', title: 'Compliance', description: 'Expiry & assignment' },
  { id: 'documents', title: 'Documents', description: 'Registration, insurance, maintenance' },
  { id: 'notes', title: 'Notes', description: 'Additional context' },
];

interface TrailerFormProps {
  initialData?: Partial<NewTrailerInput>;
  drivers?: Array<{ id: string; first_name: string; last_name: string }>;
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; trailerId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; trailerId?: string } | null>;
  submitLabel?: string;
  cancelHref?: string;
}

export function TrailerForm({
  initialData,
  drivers = [],
  onSubmit,
  submitLabel = 'Save trailer',
  cancelHref = '/dashboard/fleet',
}: TrailerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [snapshot, setSnapshot] = useState({
    unitNumber: initialData?.unit_number || '',
    type: initialData?.type || 'other',
    status: initialData?.status || 'active',
    assignedDriverId: initialData?.assigned_driver_id || '',
  });
  const docTiles = [
    { id: 'registration_file', label: 'Registration', urlField: 'registration_photo_url' },
    { id: 'inspection_file', label: 'Inspection', urlField: 'inspection_photo_url' },
  ];
  const [docPreviews, setDocPreviews] = useState<Record<string, { name: string; url: string } | null>>({
    registration_file: null,
    inspection_file: null,
  });
  // State for uploaded document URLs (persisted to database)
  const [docUrls, setDocUrls] = useState<Record<string, string>>({
    registration_photo_url: (initialData as any)?.registration_photo_url || '',
    inspection_photo_url: (initialData as any)?.inspection_photo_url || '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const setDocPreview = (key: string, file?: File | null) => {
    setDocPreviews((prev) => {
      const existing = prev[key];
      if (existing?.url) URL.revokeObjectURL(existing.url);
      if (!file) return { ...prev, [key]: null };
      return { ...prev, [key]: { name: file.name, url: URL.createObjectURL(file) } };
    });
  };

  // Upload document to Supabase storage and store URL
  const handleDocUpload = async (inputId: string, file: File) => {
    const urlField = DOC_FIELD_MAP[inputId];
    if (!urlField) return;

    setUploadingDoc(inputId);
    setDocPreview(inputId, file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'documents');
      formData.append('folder', 'trailers');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const publicUrl = data.url || data.publicUrl;

      if (publicUrl) {
        setDocUrls((prev) => ({ ...prev, [urlField]: publicUrl }));
        toast({
          title: 'Document uploaded',
          description: `${file.name} uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
      setDocPreview(inputId, null);
    } finally {
      setUploadingDoc(null);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(docPreviews).forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [docPreviews]);

  // On successful server action, toast and navigate
  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Trailer saved',
        description: 'The trailer was created successfully.',
      });
      router.push('/dashboard/fleet/trailers');
      router.refresh();
    }
  }, [state?.success, router, toast]);

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
  const getDriverName = (id?: string | null) => {
    if (!id) {
      return 'Unassigned';
    }
    const driver = drivers.find((d) => d.id === id);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
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
        type: ((formData.get('type') as string) || 'other') as NewTrailerInput['type'],
        status: ((formData.get('status') as string) || 'active') as NewTrailerInput['status'],
        assignedDriverId: (formData.get('assigned_driver_id') as string) || '',
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
              <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="unit_number" className="text-sm">
                  Trailer Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="unit_number"
                  name="unit_number"
                  required
                  defaultValue={initialData?.unit_number}
                  className="h-9"
                />
                {state?.errors?.unit_number && (
                  <p className="text-xs text-destructive">{state.errors.unit_number}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-sm">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <SelectWithHiddenInput
                    name="type"
                    defaultValue={initialData?.type || 'other'}
                  >
                    <SelectTrigger id="type" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="53_dry_van">53' Dry Van</SelectItem>
                      <SelectItem value="26_box_truck">26' Box Truck</SelectItem>
                      <SelectItem value="straight_truck">Straight Truck</SelectItem>
                      <SelectItem value="cargo_trailer">Cargo Trailer</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                  {state?.errors?.type && (
                    <p className="text-xs text-destructive">{state.errors.type}</p>
                  )}
                </div>

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
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Plate Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
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
                    <Label htmlFor="capacity_cuft" className="text-sm">Capacity (CUFT)</Label>
                    <Input
                      type="number"
                      id="capacity_cuft"
                      name="capacity_cuft"
                      min="0"
                      placeholder="Cubic feet"
                      defaultValue={initialData?.capacity_cuft?.toString() || ''}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="side_doors_count" className="text-sm">Side Doors Count</Label>
                    <Input
                      type="number"
                      id="side_doors_count"
                      name="side_doors_count"
                      min="0"
                      defaultValue={initialData?.side_doors_count?.toString() || '0'}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expiry Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="registration_expiry" className="text-sm">Registration Expiry</Label>
                    <DatePicker
                      name="registration_expiry"
                      defaultValue={initialData?.registration_expiry || ''}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inspection_expiry" className="text-sm">Inspection Expiry</Label>
                    <DatePicker
                      name="inspection_expiry"
                      defaultValue={initialData?.inspection_expiry || ''}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
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
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <p className="text-xs text-muted-foreground">
                Registration and inspection documents for quick access.
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Hidden inputs for document URLs */}
              {Object.entries(docUrls).map(([field, url]) => (
                <input key={field} type="hidden" name={field} value={url} />
              ))}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="registration_file" className="text-sm">Registration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="registration_file"
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingDoc === 'registration_file'}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleDocUpload('registration_file', file);
                      }}
                      className="flex-1"
                    />
                    {uploadingDoc === 'registration_file' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {docUrls.registration_photo_url && (
                      <a
                        href={docUrls.registration_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inspection_file" className="text-sm">Inspection</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="inspection_file"
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingDoc === 'inspection_file'}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleDocUpload('inspection_file', file);
                      }}
                      className="flex-1"
                    />
                    {uploadingDoc === 'inspection_file' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {docUrls.inspection_photo_url && (
                      <a
                        href={docUrls.inspection_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
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
                  placeholder="Additional notes about this trailer..."
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
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24 self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Trailer Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quickly verify the essentials.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Unit #</span>
              <span className="font-medium text-right">{snapshot.unitNumber || 'Not set'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium text-right capitalize">{snapshot.type}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-right capitalize">{snapshot.status}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Driver</span>
              <span className="font-medium text-right">{getDriverName(snapshot.assignedDriverId)}</span>
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

        <div className="grid gap-3 sm:grid-cols-2">
          {docTiles.map((tile) => {
            const hasUploadedUrl = Boolean(docUrls[tile.urlField]);
            const hasPreview = Boolean(docPreviews[tile.id]?.url);
            const isUploading = uploadingDoc === tile.id;
            const ok = hasUploadedUrl || hasPreview;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => openDocOrJump(tile.id)}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  currentStep === 3 && "border-primary/40 ring-2 ring-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">{tile.label}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isUploading
                        ? 'Uploading...'
                        : ok
                        ? 'Added — tap to view or replace.'
                        : 'Missing — tap to add this file.'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                      isUploading
                        ? "bg-blue-500/10 text-blue-600"
                        : ok
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isUploading ? 'Uploading' : ok ? 'Ready' : 'Pending'}
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

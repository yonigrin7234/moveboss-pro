'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Driver } from '@/data/drivers';
import type { Truck, Trailer } from '@/data/fleet';
import type { NewTripInput, TripStatus } from '@/data/trips';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

interface TripFormProps {
  initialData?: Partial<NewTripInput> & { share_driver_with_companies?: boolean };
  drivers: Driver[];
  trucks: Truck[];
  trailers: Trailer[];
  onSubmit: (
    prevState: { errors?: Record<string, string>; success?: boolean; tripId?: string } | null,
    formData: FormData
  ) => Promise<{ errors?: Record<string, string>; success?: boolean; tripId?: string } | null>;
  submitLabel?: string;
  cancelHref?: string;
}

const statusOptions: { value: TripStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'en_route', label: 'En Route' },
  { value: 'completed', label: 'Completed' },
  { value: 'settled', label: 'Settled' },
  { value: 'cancelled', label: 'Cancelled' },
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

export function TripForm({
  initialData,
  drivers,
  trucks,
  trailers,
  onSubmit,
  submitLabel = 'Save trip',
  cancelHref = '/dashboard/trips',
}: TripFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(onSubmit, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [snapshot, setSnapshot] = useState({
    tripNumber: initialData?.trip_number || '',
    status: initialData?.status || 'planned',
    driverId: initialData?.driver_id || '',
    truckId: initialData?.truck_id || '',
    trailerId: initialData?.trailer_id || '',
    origin: initialData?.origin_city || '',
    destination: initialData?.destination_city || '',
    startDate: initialData?.start_date || '',
    endDate: initialData?.end_date || '',
  });
  const [shareDriverWithCompanies, setShareDriverWithCompanies] = useState(
    initialData?.share_driver_with_companies ?? true
  );
  const sectionRefs = {
    basics: useRef<HTMLDivElement>(null),
    routing: useRef<HTMLDivElement>(null),
    schedule: useRef<HTMLDivElement>(null),
    notes: useRef<HTMLDivElement>(null),
  };

  // ZIP lookup handlers
  const handleOriginZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.trim();
    if (zip.length >= 5) {
      const { city, state } = await lookupZipCode(zip);
      const cityInput = document.getElementById('origin_city') as HTMLInputElement;
      const stateInput = document.getElementById('origin_state') as HTMLInputElement;
      if (cityInput && city) cityInput.value = city;
      if (stateInput && state) stateInput.value = state;
    }
  };

  const handleDestinationZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const zip = e.target.value.trim();
    if (zip.length >= 5) {
      const { city, state } = await lookupZipCode(zip);
      const cityInput = document.getElementById('destination_city') as HTMLInputElement;
      const stateInput = document.getElementById('destination_state') as HTMLInputElement;
      if (cityInput && city) cityInput.value = city;
      if (stateInput && state) stateInput.value = state;
    }
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

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const syncSnapshot = () => {
      const data = new FormData(form);
      setSnapshot({
        tripNumber: (data.get('trip_number') as string) || '',
        status: ((data.get('status') as string) || 'planned') as TripStatus,
        driverId: (data.get('driver_id') as string) || '',
        truckId: (data.get('truck_id') as string) || '',
        trailerId: (data.get('trailer_id') as string) || '',
        origin: (data.get('origin_city') as string) || '',
        destination: (data.get('destination_city') as string) || '',
        startDate: (data.get('start_date') as string) || '',
        endDate: (data.get('end_date') as string) || '',
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

  // On successful server action, toast and navigate
  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Trip saved',
        description: 'The trip was created successfully.',
      });
      router.push('/dashboard/trips');
      router.refresh();
    }
  }, [state?.success, router, toast]);

  const scrollToSection = (key: keyof typeof sectionRefs) => {
    const el = sectionRefs[key].current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            id: 'basics',
            title: 'Identity ready',
            body: 'Trip #, status, and assignment.',
            complete: Boolean(snapshot.tripNumber && (snapshot.driverId || snapshot.truckId)),
          },
          {
            id: 'routing',
            title: 'Routing ready',
            body: 'Origin and destination captured.',
            complete: Boolean(snapshot.origin && snapshot.destination),
          },
          {
            id: 'schedule',
            title: 'Schedule ready',
            body: 'Start and end dates captured.',
            complete: Boolean(snapshot.startDate && snapshot.endDate),
          },
          {
            id: 'notes',
            title: 'Notes',
            body: 'Add context for dispatch/finance.',
            complete: true,
          },
        ].map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => scrollToSection(card.id as keyof typeof sectionRefs)}
            className="group flex h-full flex-col rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
        <div className="bg-destructive/10 border-destructive rounded-lg p-2">
          <p className="text-sm text-destructive">{state.errors._form}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Basic Info */}
          <Card ref={sectionRefs.basics}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="trip_number" className="text-sm">
                    Trip Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="trip_number"
                    name="trip_number"
                    required
                    defaultValue={initialData?.trip_number || ''}
                    className="h-9"
                  />
                  {state?.errors?.trip_number && (
                    <p className="text-xs text-destructive">{state.errors.trip_number}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <SelectWithHiddenInput name="status" defaultValue={initialData?.status || 'planned'}>
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
              </div>
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="driver_id" className="text-sm">Driver</Label>
                  <SelectWithHiddenInput name="driver_id" defaultValue={initialData?.driver_id || ''}>
                    <SelectTrigger id="driver_id" className="h-9">
                      <SelectValue placeholder="Unassigned" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="truck_id" className="text-sm">Truck</Label>
                  <SelectWithHiddenInput name="truck_id" defaultValue={initialData?.truck_id || ''}>
                    <SelectTrigger id="truck_id" className="h-9">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          {truck.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trailer_id" className="text-sm">Trailer</Label>
                  <SelectWithHiddenInput name="trailer_id" defaultValue={initialData?.trailer_id || ''}>
                    <SelectTrigger id="trailer_id" className="h-9">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {trailers.map((trailer) => (
                        <SelectItem key={trailer.id} value={trailer.id}>
                          {trailer.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectWithHiddenInput>
                </div>
              </div>
              {snapshot.driverId && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Checkbox
                    id="share_driver_with_companies"
                    checked={shareDriverWithCompanies}
                    onCheckedChange={(checked) => setShareDriverWithCompanies(checked === true)}
                  />
                  <Label
                    htmlFor="share_driver_with_companies"
                    className="text-sm font-normal text-muted-foreground cursor-pointer"
                  >
                    Share driver info with companies on loads
                  </Label>
                  <input
                    type="hidden"
                    name="share_driver_with_companies"
                    value={shareDriverWithCompanies ? 'true' : 'false'}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-2">Origin</h3>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="origin_postal_code" className="text-sm">Postal Code</Label>
                      <Input
                        id="origin_postal_code"
                        name="origin_postal_code"
                        defaultValue={initialData?.origin_postal_code || ''}
                        className="h-9"
                        onBlur={handleOriginZipBlur}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="origin_city" className="text-sm">City</Label>
                      <Input
                        id="origin_city"
                        name="origin_city"
                        defaultValue={initialData?.origin_city || ''}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="origin_state" className="text-sm">State</Label>
                      <Input
                        id="origin_state"
                        name="origin_state"
                        defaultValue={initialData?.origin_state || ''}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-2">Destination</h3>
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="destination_postal_code" className="text-sm">Postal Code</Label>
                      <Input
                        id="destination_postal_code"
                        name="destination_postal_code"
                        defaultValue={initialData?.destination_postal_code || ''}
                        className="h-9"
                        onBlur={handleDestinationZipBlur}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="destination_city" className="text-sm">City</Label>
                      <Input
                        id="destination_city"
                        name="destination_city"
                        defaultValue={initialData?.destination_city || ''}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="destination_state" className="text-sm">State</Label>
                      <Input
                        id="destination_state"
                        name="destination_state"
                        defaultValue={initialData?.destination_state || ''}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Schedule & Distance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Schedule & Distance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-sm">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={initialData?.start_date || ''}
                    className="h-9"
                    onClick={handleDateClick}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className="text-sm">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    defaultValue={initialData?.end_date || ''}
                    className="h-9"
                    onClick={handleDateClick}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total_miles" className="text-sm">Total Miles</Label>
                <Input
                  id="total_miles"
                  name="total_miles"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={initialData?.total_miles?.toString() || ''}
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
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
                  rows={5}
                  defaultValue={initialData?.notes || ''}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t">
        <Button type="submit" disabled={pending} className="h-9">
          {pending ? 'Saving...' : submitLabel}
        </Button>
        <Button variant="outline" asChild className="h-9">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

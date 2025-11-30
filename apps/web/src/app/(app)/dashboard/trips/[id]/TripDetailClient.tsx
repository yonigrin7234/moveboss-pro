'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DollarSign, AlertTriangle, Map, GripVertical, Receipt, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PhotoField } from '@/components/ui/photo-field';
import { DatePicker } from '@/components/ui/date-picker';
import type { TripStatus, TripWithDetails, TripLoad, TripExpense } from '@/data/trips';
import type { Load } from '@/data/loads';
import { TripMapTab } from '@/components/trips/TripMapTab';
import { useToast } from '@/hooks/use-toast';

interface DriverOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface LoadTripAssignment {
  tripId: string;
  tripNumber: string;
  tripStatus: string;
  driverName: string | null;
}

interface TripDetailClientProps {
  trip: TripWithDetails;
  availableLoads: Load[];
  availableDrivers: DriverOption[];
  loadTripAssignments: Record<string, LoadTripAssignment>;
  settlementSnapshot: {
    settlements: any[];
    receivables: any[];
    payables: any[];
  };
  actions: {
    updateTripStatus: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    addTripLoad: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    removeTripLoad: (formData: FormData) => Promise<void>;
    updateLoad: (formData: FormData) => Promise<void>;
    createExpense: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    deleteExpense: (formData: FormData) => Promise<void>;
    settleTrip: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean; settlementId?: string } | null>;
    deleteTrip: () => Promise<void>;
    recalculateSettlement: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    updateDriverSharing: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    reorderLoads: (items: { load_id: string; sequence_index: number }[]) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    confirmDeliveryOrder: () => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    reassignDriver: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
  };
}

const statusBadgeClasses: Record<TripStatus, string> = {
  planned: 'bg-muted text-foreground',
  active: 'bg-blue-500/20 text-blue-400',
  en_route: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  settled: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

function formatStatus(status: TripStatus) {
  const labels: Record<TripStatus, string> = {
    planned: 'Planned',
    active: 'Active',
    en_route: 'En Route',
    completed: 'Completed',
    settled: 'Settled',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPayMode(payMode: string): string {
  const labels: Record<string, string> = {
    per_mile: 'Per Mile',
    per_cuft: 'Per CUFT',
    per_mile_and_cuft: 'Per Mile + CUFT',
    percent_of_revenue: '% of Revenue',
    flat_daily_rate: 'Daily Rate',
  };
  return labels[payMode] || payMode;
}

// Sortable load card component
function SortableLoadCard({
  tripLoad,
  onEdit,
  onRemove,
  formatCurrency,
}: {
  tripLoad: TripLoad;
  onEdit: () => void;
  onRemove: () => void;
  formatCurrency: (amount: number | null | undefined) => string;
}) {
  const load = tripLoad.load as any;
  const company = Array.isArray(load?.company) ? load.company[0] : load?.company;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tripLoad.load_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get destination info (try both naming conventions)
  const destCity = load?.delivery_city || load?.destination_city;
  const destState = load?.delivery_state || load?.destination_state;
  const destZip = load?.delivery_postal_code || load?.destination_zip;
  const cubicFeet = load?.cubic_feet || load?.estimated_cuft;

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1 flex items-start justify-between">
            <div>
              <p className="font-medium">{load?.load_number || 'Load'}</p>
              <p className="text-sm text-muted-foreground">{company?.name || 'No company'}</p>
              <p className="text-sm font-medium mt-1">{formatCurrency(load?.total_rate)}</p>
              {(destCity || cubicFeet) && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {destCity && (
                    <p>
                      → {destCity}{destState ? `, ${destState}` : ''} {destZip || ''}
                    </p>
                  )}
                  {cubicFeet && (
                    <p>{cubicFeet.toLocaleString()} cubic feet</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {load?.load_status || 'pending'}
              </Badge>
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 p-0 h-auto mt-2 ml-8"
          onClick={onRemove}
        >
          Remove
        </Button>
      </CardContent>
    </Card>
  );
}

export function TripDetailClient({ trip, availableLoads, availableDrivers, loadTripAssignments, settlementSnapshot, actions }: TripDetailClientProps) {
  const { toast } = useToast();
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog states
  const [showDeleteTripConfirm, setShowDeleteTripConfirm] = useState(false);
  const [loadToRemove, setLoadToRemove] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [shareDriverWithCompanies, setShareDriverWithCompanies] = useState(
    trip.share_driver_with_companies ?? true
  );
  const [tripStatus, setTripStatus] = useState<TripStatus>(trip.status);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    trip.driver_id || 'unassigned'
  );
  const [isReassigning, setIsReassigning] = useState(false);

  // Drag and drop for load reordering
  const [orderedLoads, setOrderedLoads] = useState(() =>
    [...trip.loads].sort((a, b) => a.sequence_index - b.sequence_index)
  );
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isPushingToDriver, setIsPushingToDriver] = useState(false);

  // Sync orderedLoads when trip.loads prop changes (e.g., after adding/removing loads)
  useEffect(() => {
    setOrderedLoads([...trip.loads].sort((a, b) => a.sequence_index - b.sequence_index));
  }, [trip.loads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setOrderedLoads((items) => {
          const oldIndex = items.findIndex((item) => item.load_id === active.id);
          const newIndex = items.findIndex((item) => item.load_id === over.id);
          const newItems = arrayMove(items, oldIndex, newIndex);

          // Update server with new order
          const reorderPayload = newItems.map((item, index) => ({
            load_id: item.load_id,
            sequence_index: index,
          }));
          actions.reorderLoads(reorderPayload);

          // Mark that we have unsaved changes to push to driver
          setHasOrderChanges(true);

          return newItems;
        });
      }
    },
    [actions]
  );

  const handlePushToDriver = useCallback(async () => {
    setIsPushingToDriver(true);
    try {
      const result = await actions.confirmDeliveryOrder();
      if (result?.success) {
        setHasOrderChanges(false);
        toast({
          title: 'Notification sent',
          description: 'Driver has been notified of the updated delivery order.',
        });
      } else if (result?.errors) {
        toast({
          title: 'Failed to notify driver',
          description: result.errors._form || 'An error occurred',
          variant: 'destructive',
        });
      }
    } finally {
      setIsPushingToDriver(false);
    }
  }, [actions, toast]);

  const tripDriver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const tripTruck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
  const tripTrailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;

  const driverName = tripDriver ? `${tripDriver.first_name} ${tripDriver.last_name}` : 'Unassigned';
  const truckNumber = tripTruck?.unit_number || '—';
  const trailerNumber = tripTrailer?.unit_number || '—';

  // Capacity: prioritize trailer capacity, then truck capacity (for box trucks)
  const effectiveCapacity = tripTrailer?.capacity_cuft || tripTruck?.cubic_capacity || 0;

  const totalExpenses = trip.driver_pay_total + trip.fuel_total + trip.tolls_total + trip.other_expenses_total;
  const profit = trip.revenue_total - totalExpenses;

  const driverPayBreakdown = trip.driver_pay_breakdown
    ? (typeof trip.driver_pay_breakdown === 'string'
        ? JSON.parse(trip.driver_pay_breakdown)
        : trip.driver_pay_breakdown)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{trip.trip_number}</h1>
            <Badge className={statusBadgeClasses[trip.status]}>{formatStatus(trip.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {driverName} • Truck {truckNumber} {trailerNumber !== '—' ? `• Trailer ${trailerNumber}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/trips">Back to Trips</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteTripConfirm(true)}
          >
            Delete Trip
          </Button>
        </div>
      </div>

      {/* Financial Summary Card */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</p>
              <p className="text-lg font-semibold">{formatCurrency(trip.revenue_total)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Expenses</p>
              <p className="text-lg font-semibold">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Profit</p>
              <p className={`text-lg font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loads">Loads ({trip.loads.length})</TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-1" />
            Map
          </TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="settlement">Settlement</TabsTrigger>
        </TabsList>

        {/* Push to Driver Banner - shows when delivery order has been changed (visible on all tabs) */}
        {hasOrderChanges && tripDriver && (
          <Card className="border-amber-500/50 bg-amber-500/10 mb-4">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-400">Delivery order changed</p>
                <p className="text-sm text-muted-foreground">
                  Push the new order to {tripDriver.first_name} when you&apos;re done.
                </p>
              </div>
              <Button
                onClick={handlePushToDriver}
                disabled={isPushingToDriver}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isPushingToDriver ? 'Sending...' : 'Push to Driver'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Trip Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route & Schedule Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Route & Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Origin</Label>
                      <p className="font-medium">
                        {trip.origin_city || '—'}{trip.origin_state ? `, ${trip.origin_state}` : ''} {trip.origin_postal_code || ''}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Destination</Label>
                      <p className="font-medium">
                        {trip.destination_city || '—'}{trip.destination_state ? `, ${trip.destination_state}` : ''} {trip.destination_postal_code || ''}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Distance</Label>
                      <p className="font-medium">
                        {trip.actual_miles ? (
                          <>{trip.actual_miles.toLocaleString()} mi <span className="text-xs text-muted-foreground">(actual)</span></>
                        ) : trip.total_miles ? (
                          <>{trip.total_miles.toLocaleString()} mi <span className="text-xs text-muted-foreground">(estimated)</span></>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Dates</Label>
                      <p className="font-medium">{trip.start_date || '—'} → {trip.end_date || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Driver</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedDriverId}
                          onValueChange={setSelectedDriverId}
                        >
                          <SelectTrigger className="h-9 flex-1">
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {availableDrivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.first_name} {driver.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedDriverId !== (trip.driver_id || 'unassigned') && (
                          <Button
                            size="sm"
                            disabled={isReassigning}
                            onClick={async () => {
                              setIsReassigning(true);
                              const formData = new FormData();
                              formData.append('driver_id', selectedDriverId);
                              await actions.reassignDriver(formData);
                              setIsReassigning(false);
                            }}
                          >
                            {isReassigning ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Truck</Label>
                      <p className="font-medium">{truckNumber}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Trailer</Label>
                      <p className="font-medium">{trailerNumber}</p>
                    </div>
                  </div>
                  {selectedDriverId !== 'unassigned' && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="share_driver_toggle"
                          checked={shareDriverWithCompanies}
                          onCheckedChange={async (checked) => {
                            const newValue = checked === true;
                            setShareDriverWithCompanies(newValue);
                            const formData = new FormData();
                            formData.append('share_driver_with_companies', newValue.toString());
                            await actions.updateDriverSharing(formData);
                          }}
                        />
                        <Label
                          htmlFor="share_driver_toggle"
                          className="text-sm font-normal text-muted-foreground cursor-pointer"
                        >
                          Share driver info with companies
                        </Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Odometer Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Odometer</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {trip.actual_miles ? `${trip.actual_miles.toLocaleString()} actual miles` : 'Not recorded'}
                  </p>
                </CardHeader>
                <CardContent>
                  <form action={async (formData) => {
                    const result = await actions.updateTripStatus(formData);
                    if (result?.errors?._form) {
                      toast({
                        title: 'Error saving odometer',
                        description: result.errors._form,
                        variant: 'destructive',
                      });
                    } else if (result?.success) {
                      toast({
                        title: 'Odometer saved',
                        description: 'Odometer readings have been updated.',
                      });
                    }
                  }} className="space-y-4">
                    <input type="hidden" name="trip_id" value={trip.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Start Odometer</Label>
                        <Input
                          type="number"
                          name="odometer_start"
                          defaultValue={trip.odometer_start || ''}
                          placeholder="0"
                          className="h-9"
                        />
                        <PhotoField
                          name="odometer_start_photo_url"
                          label=""
                          defaultValue={trip.odometer_start_photo_url || ''}
                          description="Start photo"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">End Odometer</Label>
                        <Input
                          type="number"
                          name="odometer_end"
                          defaultValue={trip.odometer_end || ''}
                          placeholder="0"
                          className="h-9"
                        />
                        <PhotoField
                          name="odometer_end_photo_url"
                          label=""
                          defaultValue={trip.odometer_end_photo_url || ''}
                          description="End photo"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">Save Odometer</Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions & Summary */}
            <div className="space-y-6">
              {/* Trip Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trip Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={async (formData) => {
                    const result = await actions.updateTripStatus(formData);
                    if (result?.errors?._form) {
                      toast({
                        title: 'Cannot update status',
                        description: result.errors._form,
                        variant: 'destructive',
                      });
                    }
                  }}>
                    <input type="hidden" name="trip_id" value={trip.id} />
                    <input type="hidden" name="status" value={tripStatus} />
                    <div className="space-y-1.5 mb-3">
                      <Label className="text-sm">Trip Status</Label>
                      <Select value={tripStatus} onValueChange={(v) => setTripStatus(v as TripStatus)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['planned', 'active', 'en_route', 'completed', 'settled', 'cancelled'] as const).map((s) => (
                            <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Update Status</Button>
                  </form>
                  <form action={async (formData) => {
                    setIsSubmitting(true);
                    await actions.settleTrip(formData);
                    setIsSubmitting(false);
                  }}>
                    <input type="hidden" name="trip_id" value={trip.id} />
                    <Button type="submit" variant="outline" className="w-full" disabled={isSubmitting}>
                      Close & Settle Trip
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Driver Pay Card */}
              {driverPayBreakdown && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Driver Pay</CardTitle>
                      <span className="text-lg font-semibold">{formatCurrency(driverPayBreakdown.totalDriverPay)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatPayMode(driverPayBreakdown.payMode)}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {driverPayBreakdown.breakdown.miles !== undefined && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>
                            {driverPayBreakdown.breakdown.miles?.toLocaleString()} mi
                            {!trip.actual_miles && <span className="text-xs ml-1">(est)</span>}
                            {' × $'}{driverPayBreakdown.breakdown.ratePerMile?.toFixed(2)}
                          </span>
                          <span>{formatCurrency(driverPayBreakdown.breakdown.milePay)}</span>
                        </div>
                      )}
                      {driverPayBreakdown.breakdown.cuft !== undefined && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>{driverPayBreakdown.breakdown.cuft?.toLocaleString()} cf × ${driverPayBreakdown.breakdown.ratePerCuft?.toFixed(2)}</span>
                          <span>{formatCurrency(driverPayBreakdown.breakdown.cuftPay)}</span>
                        </div>
                      )}
                      {driverPayBreakdown.breakdown.revenue !== undefined && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>{formatCurrency(driverPayBreakdown.breakdown.revenue)} × {driverPayBreakdown.breakdown.percentOfRevenue}%</span>
                          <span>{formatCurrency(driverPayBreakdown.basePay)}</span>
                        </div>
                      )}
                      {driverPayBreakdown.breakdown.days !== undefined && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>{driverPayBreakdown.breakdown.days} days × ${driverPayBreakdown.breakdown.flatDailyRate?.toFixed(2)}/day</span>
                          <span>{formatCurrency(driverPayBreakdown.basePay)}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(driverPayBreakdown.totalDriverPay)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Loads Tab */}
        <TabsContent value="loads" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Attached Loads */}
            <div className="lg:col-span-2 space-y-4">
              {orderedLoads.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No loads attached to this trip yet.
                  </CardContent>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedLoads.map((tl) => tl.load_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {orderedLoads.map((tl) => (
                        <SortableLoadCard
                          key={tl.id}
                          tripLoad={tl}
                          onEdit={() => setEditingLoadId(tl.load_id)}
                          onRemove={() => setLoadToRemove(tl.load_id)}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Edit Load Sheet */}
            {editingLoadId && (() => {
              const tl = orderedLoads.find((l) => l.load_id === editingLoadId);
              if (!tl) return null;
              const load = tl.load as any;
              return (
                <Sheet open={!!editingLoadId} onOpenChange={(open) => !open && setEditingLoadId(null)}>
                  <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Edit Load: {load?.load_number}</SheetTitle>
                            </SheetHeader>
                            <form action={async (formData) => {
                              await actions.updateLoad(formData);
                              setEditingLoadId(null);
                            }} className="space-y-4 mt-4">
                              <input type="hidden" name="load_id" value={tl.load_id} />

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Basic</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Actual CUFT</Label>
                                    <Input name="actual_cuft_loaded" type="number" step="0.01" defaultValue={load?.actual_cuft_loaded || ''} className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Rate/CUFT</Label>
                                    <Input name="contract_rate_per_cuft" type="number" step="0.01" defaultValue={load?.contract_rate_per_cuft || ''} className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Balance Due</Label>
                                    <Input name="balance_due_on_delivery" type="number" step="0.01" defaultValue={load?.balance_due_on_delivery || ''} className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Load Status</Label>
                                    <select name="load_status" defaultValue={load?.load_status || ''} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                      <option value="">Select</option>
                                      <option value="pending">Pending</option>
                                      <option value="loaded">Loaded</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="storage_completed">Storage Completed</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Collections</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Collected on Delivery</Label>
                                    <Input name="amount_collected_on_delivery" type="number" step="0.01" defaultValue={load?.amount_collected_on_delivery || ''} className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-sm">Paid to Company</Label>
                                    <Input name="amount_paid_directly_to_company" type="number" step="0.01" defaultValue={load?.amount_paid_directly_to_company || ''} className="h-9" />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Contract Accessorials</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    ['contract_accessorials_shuttle', 'Shuttle'],
                                    ['contract_accessorials_stairs', 'Stairs'],
                                    ['contract_accessorials_long_carry', 'Long Carry'],
                                    ['contract_accessorials_bulky', 'Bulky'],
                                    ['contract_accessorials_other', 'Other'],
                                  ].map(([key, label]) => (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-sm">{label}</Label>
                                      <Input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="h-8" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Extra Accessorials</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    ['extra_shuttle', 'Shuttle'],
                                    ['extra_stairs', 'Stairs'],
                                    ['extra_long_carry', 'Long Carry'],
                                    ['extra_packing', 'Packing'],
                                    ['extra_bulky', 'Bulky'],
                                    ['extra_other', 'Other'],
                                  ].map(([key, label]) => (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-sm">{label}</Label>
                                      <Input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="h-8" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Storage</p>
                                <div className="flex gap-4 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Checkbox id={`storage_drop_${tl.load_id}`} name="storage_drop" defaultChecked={load?.storage_drop} />
                                    <Label htmlFor={`storage_drop_${tl.load_id}`} className="text-sm font-normal">Storage drop</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox id={`exception_${tl.load_id}`} name="company_approved_exception_delivery" defaultChecked={load?.company_approved_exception_delivery} />
                                    <Label htmlFor={`exception_${tl.load_id}`} className="text-sm font-normal">Exception approved</Label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-sm">Move-In Fee</Label>
                                    <Input name="storage_move_in_fee" type="number" step="0.01" defaultValue={load?.storage_move_in_fee || ''} className="h-8" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-sm">Daily Fee</Label>
                                    <Input name="storage_daily_fee" type="number" step="0.01" defaultValue={load?.storage_daily_fee || ''} className="h-8" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-sm">Days</Label>
                                    <Input name="storage_days_billed" type="number" defaultValue={load?.storage_days_billed || ''} className="h-8" />
                                  </div>
                                </div>
                                <Input name="storage_location_name" defaultValue={load?.storage_location_name || ''} placeholder="Location name" className="h-9" />
                                <Input name="storage_location_address" defaultValue={load?.storage_location_address || ''} placeholder="Address" className="h-9" />
                                <Textarea name="storage_notes" defaultValue={load?.storage_notes || ''} placeholder="Storage notes" rows={2} />
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Payment</p>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Payment Method</Label>
                                  <select name="payment_method" defaultValue={load?.payment_method || ''} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    <option value="">Select method</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="certified_check">Certified check</option>
                                    <option value="customer_paid_directly_to_company">Customer paid company</option>
                                  </select>
                                </div>
                                <Input name="payment_method_notes" defaultValue={load?.payment_method_notes || ''} placeholder="Payment notes" className="h-9" />
                              </div>

                              <div>
                                <PhotoField
                                  name="load_report_photo_url"
                                  label="Load Report Photo"
                                  defaultValue={load?.load_report_photo_url || ''}
                                />
                              </div>

                              <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t border-border -mx-6 px-6">
                                <Button type="submit" className="w-full">Save Load</Button>
                              </div>
                            </form>
                  </SheetContent>
                </Sheet>
              );
            })()}

            {/* Right Column - Attach Load */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attach Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={async (formData) => {
                    await actions.addTripLoad(formData);
                  }} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Select Load</Label>
                      <select name="load_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required>
                        <option value="">Select a load...</option>
                        {(() => {
                          const unassignedLoads = availableLoads.filter(
                            (load) => !loadTripAssignments[load.id]
                          );
                          const assignedLoads = availableLoads.filter(
                            (load) => loadTripAssignments[load.id]
                          );
                          return (
                            <>
                              {unassignedLoads.length > 0 && (
                                <optgroup label="Available Loads">
                                  {unassignedLoads.map((load) => {
                                    const company = Array.isArray(load.company) ? load.company[0] : load.company;
                                    return (
                                      <option key={load.id} value={load.id}>
                                        {load.load_number} - {company?.name || 'No company'}
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                              {assignedLoads.length > 0 && (
                                <optgroup label="On Other Trips (will reassign)">
                                  {assignedLoads.map((load) => {
                                    const company = Array.isArray(load.company) ? load.company[0] : load.company;
                                    const assignment = loadTripAssignments[load.id];
                                    const tripInfo = assignment
                                      ? `Trip ${assignment.tripNumber}${assignment.driverName ? ` (${assignment.driverName})` : ''}`
                                      : '';
                                    return (
                                      <option key={load.id} value={load.id}>
                                        {load.load_number} - {company?.name || 'No company'} [{tripInfo}]
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                            </>
                          );
                        })()}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Role</Label>
                      <select name="role" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" defaultValue="primary">
                        <option value="primary">Primary</option>
                        <option value="backhaul">Backhaul</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                    <input type="hidden" name="sequence_index" value="0" />
                    <Button type="submit" className="w-full">Add Load</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="space-y-4 mt-0">
          <TripMapTab
            tripId={trip.id}
            originCity={trip.origin_city}
            originState={trip.origin_state}
            originZip={trip.origin_postal_code}
            destinationCity={trip.destination_city}
            destinationState={trip.destination_state}
            destinationZip={trip.destination_postal_code}
            truckCapacity={effectiveCapacity}
            tripLoads={trip.loads.map((tl) => {
              const load = tl.load as any;
              return {
                id: tl.id,
                load_id: tl.load_id,
                sequence_index: tl.sequence_index,
                role: tl.role,
                load: load ? {
                  id: load.id,
                  load_number: load.load_number,
                  // Use origin/destination fields if available, fall back to pickup/delivery
                  origin_city: load.origin_city || load.pickup_city,
                  origin_state: load.origin_state || load.pickup_state,
                  origin_zip: load.origin_zip || load.pickup_postal_code,
                  destination_city: load.destination_city || load.delivery_city,
                  destination_state: load.destination_state || load.delivery_state,
                  destination_zip: load.destination_zip || load.delivery_postal_code,
                  cubic_feet: load.cubic_feet,
                  estimated_cuft: load.estimated_cuft,
                  total_rate: load.total_rate,
                  load_status: load.load_status,
                  company: load.company,
                } : null,
              };
            })}
            onReorderLoads={async (items) => {
              await actions.reorderLoads(items);
              setHasOrderChanges(true);
            }}
          />
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-0">
          {/* Expense Summary */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Driver Pay</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.driver_pay_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Fuel</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.fuel_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Tolls</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.tolls_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Other</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.other_expenses_total)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Expense List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Expense List</CardTitle>
                </CardHeader>
                <CardContent>
                  {trip.expenses.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No expenses recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {trip.expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                          {/* Receipt Thumbnail */}
                          {expense.receipt_photo_url ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptUrl(expense.receipt_photo_url)}
                              className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all"
                            >
                              <Image
                                src={expense.receipt_photo_url}
                                alt="Receipt"
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </button>
                          ) : (
                            <div className="h-12 w-12 flex-shrink-0 rounded-md border bg-muted flex items-center justify-center">
                              <Receipt className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{formatCurrency(expense.amount)}</p>
                            <p className="text-xs text-muted-foreground capitalize truncate">
                              {expense.category} • {expense.incurred_at}
                              {expense.description && ` • ${expense.description}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 flex-shrink-0"
                            onClick={() => setExpenseToDelete(expense.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Add Expense */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Expense</CardTitle>
                </CardHeader>
                <CardContent>
                  <Sheet open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
                    <SheetTrigger asChild>
                      <Button className="w-full">+ Add Expense</Button>
                    </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add Expense</SheetTitle>
              </SheetHeader>
              <form action={async (formData) => {
                await actions.createExpense(formData);
                setAddExpenseOpen(false);
              }} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Category</Label>
                  <select name="category" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required>
                    <option value="">Select...</option>
                    <option value="fuel">Fuel</option>
                    <option value="tolls">Tolls</option>
                    <option value="driver_pay">Driver Pay</option>
                    <option value="lumper">Lumper</option>
                    <option value="parking">Parking</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Amount</Label>
                  <Input name="amount" type="number" step="0.01" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Date</Label>
                  <DatePicker name="incurred_at" placeholder="Select date" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Description</Label>
                  <Input name="description" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Expense Type</Label>
                  <Input name="expense_type" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Paid By</Label>
                  <select name="paid_by" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="">Select...</option>
                    <option value="driver_personal">Driver Personal</option>
                    <option value="driver_cash">Driver Cash</option>
                    <option value="company_card">Company Card</option>
                    <option value="fuel_card">Fuel Card</option>
                  </select>
                </div>
                <PhotoField name="receipt_photo_url" label="Receipt Photo" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Notes</Label>
                  <Textarea name="notes" rows={2} />
                </div>
                    <div className="sticky bottom-0 bg-background pt-4 pb-2">
                      <Button type="submit" className="w-full">Save Expense</Button>
                    </div>
                  </form>
                </SheetContent>
              </Sheet>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Settlement Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Settlement Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Settlement Status</CardTitle>
                    <Badge variant="outline">
                      {settlementSnapshot.settlements[0]?.status || (trip.status === 'settled' ? 'settled' : 'Not settled')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span>{formatCurrency(trip.revenue_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Driver Pay</span>
                    <span>{formatCurrency(trip.driver_pay_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expenses</span>
                    <span>{formatCurrency(trip.fuel_total + trip.tolls_total + trip.other_expenses_total)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-medium">
                    <span>Profit</span>
                    <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatCurrency(profit)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Receivables */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Receivables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {settlementSnapshot.receivables.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No receivables yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {settlementSnapshot.receivables.map((r: any) => {
                          const company = Array.isArray(r.company) ? r.company[0] : r.company;
                          return (
                            <div key={r.id} className="flex justify-between text-sm">
                              <span>{company?.name || 'Unknown'}</span>
                              <span>{formatCurrency(r.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payables */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {settlementSnapshot.payables.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payables yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {settlementSnapshot.payables.map((p: any) => {
                          const driver = Array.isArray(p.driver) ? p.driver[0] : p.driver;
                          return (
                            <div key={p.id} className="flex justify-between text-sm">
                              <span>{driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}</span>
                              <span>{formatCurrency(p.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Settlement Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* View Settlement Button - show for completed/settled trips */}
                  {(trip.status === 'completed' || trip.status === 'settled') && (
                    <Button asChild className="w-full" variant="default">
                      <Link href={`/dashboard/trips/${trip.id}/settlement`}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        View Settlement
                      </Link>
                    </Button>
                  )}

                  {/* Settle Button */}
                  <form action={async (formData) => {
                    setIsSubmitting(true);
                    await actions.settleTrip(formData);
                    setIsSubmitting(false);
                  }}>
                    <input type="hidden" name="trip_id" value={trip.id} />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      Close & Settle Trip
                    </Button>
                  </form>

                  {/* Recalculate Settlement Button - only show if settlement exists */}
                  {settlementSnapshot.settlements.length > 0 && (
                    <form action={async (formData) => {
                      setIsSubmitting(true);
                      await actions.recalculateSettlement(formData);
                      setIsSubmitting(false);
                    }}>
                      <input type="hidden" name="trip_id" value={trip.id} />
                      <Button type="submit" variant="outline" className="w-full" disabled={isSubmitting}>
                        Recalculate Settlement
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Trip Confirmation Dialog */}
      <Dialog open={showDeleteTripConfirm} onOpenChange={setShowDeleteTripConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Trip
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete trip <strong>{trip.trip_number}</strong>? This action cannot be undone and will remove all associated data including loads, expenses, and settlements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteTripConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsSubmitting(true);
                await actions.deleteTrip();
                setShowDeleteTripConfirm(false);
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Trip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Load Confirmation Dialog */}
      <Dialog open={!!loadToRemove} onOpenChange={(open) => !open && setLoadToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove Load
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this load from the trip? The load will not be deleted but will no longer be associated with this trip.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLoadToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!loadToRemove) return;
                setIsSubmitting(true);
                const formData = new FormData();
                formData.append('load_id', loadToRemove);
                await actions.removeTripLoad(formData);
                setLoadToRemove(null);
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Removing...' : 'Remove Load'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Expense
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExpenseToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!expenseToDelete) return;
                setIsSubmitting(true);
                const formData = new FormData();
                formData.append('expense_id', expenseToDelete);
                await actions.deleteExpense(formData);
                setExpenseToDelete(null);
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!viewingReceiptUrl} onOpenChange={(open) => !open && setViewingReceiptUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Receipt Preview</DialogTitle>
          <button
            type="button"
            onClick={() => setViewingReceiptUrl(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          {viewingReceiptUrl && (
            <div className="relative w-full h-[80vh]">
              <Image
                src={viewingReceiptUrl}
                alt="Receipt"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, ChevronUp, MapPin, User, Truck, Package, DollarSign } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoField } from '@/components/ui/photo-field';
import { DatePicker } from '@/components/ui/date-picker';
import type { TripStatus, TripWithDetails, TripLoad, TripExpense } from '@/data/trips';
import type { Load } from '@/data/loads';

interface TripDetailClientProps {
  trip: TripWithDetails;
  availableLoads: Load[];
  settlementSnapshot: {
    settlements: any[];
    receivables: any[];
    payables: any[];
  };
  actions: {
    updateTripStatus: (formData: FormData) => Promise<void>;
    addTripLoad: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    removeTripLoad: (formData: FormData) => Promise<void>;
    updateLoad: (formData: FormData) => Promise<void>;
    createExpense: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
    deleteExpense: (formData: FormData) => Promise<void>;
    settleTrip: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean; settlementId?: string } | null>;
    deleteTrip: () => Promise<void>;
    recalculateSettlement: (formData: FormData) => Promise<{ errors?: Record<string, string>; success?: boolean } | null>;
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

export function TripDetailClient({ trip, availableLoads, settlementSnapshot, actions }: TripDetailClientProps) {
  const [odometerOpen, setOdometerOpen] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tripDriver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const tripTruck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
  const tripTrailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;

  const driverName = tripDriver ? `${tripDriver.first_name} ${tripDriver.last_name}` : 'Unassigned';
  const truckNumber = tripTruck?.unit_number || '—';
  const trailerNumber = tripTrailer?.unit_number || '—';

  const totalExpenses = trip.driver_pay_total + trip.fuel_total + trip.tolls_total + trip.other_expenses_total;
  const profit = trip.revenue_total - totalExpenses;

  const driverPayBreakdown = trip.driver_pay_breakdown
    ? (typeof trip.driver_pay_breakdown === 'string'
        ? JSON.parse(trip.driver_pay_breakdown)
        : trip.driver_pay_breakdown)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/trips" className="p-1 -ml-1 hover:bg-muted rounded-md">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold truncate">{trip.trip_number}</h1>
                <Badge className={statusBadgeClasses[trip.status]}>{formatStatus(trip.status)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {driverName} &bull; {truckNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary Bar */}
        <div className="grid grid-cols-3 border-t border-border bg-muted/30">
          <div className="px-3 py-2 text-center border-r border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
            <p className="text-sm font-semibold">{formatCurrency(trip.revenue_total)}</p>
          </div>
          <div className="px-3 py-2 text-center border-r border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit</p>
            <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-[89px] z-30 bg-background border-b border-border px-4">
          <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-0">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              Overview
            </TabsTrigger>
            <TabsTrigger value="loads" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              Loads ({trip.loads.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="settlement" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              Settlement
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="p-4 space-y-4 mt-0">
          {/* Route Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-0.5 h-8 bg-border" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Origin</p>
                    <p className="font-medium">
                      {trip.origin_city || '—'}{trip.origin_state ? `, ${trip.origin_state}` : ''} {trip.origin_postal_code || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Destination</p>
                    <p className="font-medium">
                      {trip.destination_city || '—'}{trip.destination_state ? `, ${trip.destination_state}` : ''} {trip.destination_postal_code || ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                <span>{trip.total_miles ? `${trip.total_miles.toLocaleString()} mi` : '— mi'}</span>
                <span>
                  {trip.start_date || '—'} → {trip.end_date || '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Card */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <User className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="text-sm font-medium truncate">{driverName}</p>
                </div>
                <div>
                  <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Truck</p>
                  <p className="text-sm font-medium">{truckNumber}</p>
                </div>
                <div>
                  <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Trailer</p>
                  <p className="text-sm font-medium">{trailerNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Odometer Card (Collapsible) */}
          <Card>
            <button
              onClick={() => setOdometerOpen(!odometerOpen)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <p className="font-medium">Odometer</p>
                <p className="text-sm text-muted-foreground">
                  {trip.actual_miles ? `${trip.actual_miles.toLocaleString()} actual miles` : 'Not recorded'}
                </p>
              </div>
              {odometerOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {odometerOpen && (
              <CardContent className="pt-0 pb-4 px-4 border-t border-border">
                <form action={actions.updateTripStatus} className="space-y-4">
                  <input type="hidden" name="trip_id" value={trip.id} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Start</label>
                      <input
                        type="number"
                        name="odometer_start"
                        defaultValue={trip.odometer_start || ''}
                        placeholder="0"
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                      />
                      <div className="mt-2">
                        <PhotoField
                          name="odometer_start_photo_url"
                          label=""
                          defaultValue={trip.odometer_start_photo_url || ''}
                          description="Start photo"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">End</label>
                      <input
                        type="number"
                        name="odometer_end"
                        defaultValue={trip.odometer_end || ''}
                        placeholder="0"
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                      />
                      <div className="mt-2">
                        <PhotoField
                          name="odometer_end_photo_url"
                          label=""
                          defaultValue={trip.odometer_end_photo_url || ''}
                          description="End photo"
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full">Save Odometer</Button>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Driver Pay Card */}
          {driverPayBreakdown && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Driver Pay</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(driverPayBreakdown.totalDriverPay)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{formatPayMode(driverPayBreakdown.payMode)}</p>
                <div className="space-y-1 text-sm">
                  {driverPayBreakdown.breakdown.miles !== undefined && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{driverPayBreakdown.breakdown.miles?.toLocaleString()} mi × ${driverPayBreakdown.breakdown.ratePerMile?.toFixed(2)}</span>
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
                </div>
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(driverPayBreakdown.totalDriverPay)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <form action={actions.updateTripStatus}>
                <input type="hidden" name="trip_id" value={trip.id} />
                <label className="text-xs text-muted-foreground block mb-1">Trip Status</label>
                <select
                  name="status"
                  defaultValue={trip.status}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background mb-3"
                >
                  {(['planned', 'active', 'en_route', 'completed', 'settled', 'cancelled'] as const).map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
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
        </TabsContent>

        {/* Loads Tab */}
        <TabsContent value="loads" className="p-4 space-y-4 mt-0">
          {trip.loads.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No loads attached to this trip yet.
              </CardContent>
            </Card>
          ) : (
            trip.loads.map((tl) => {
              const load = tl.load as any;
              const company = Array.isArray(load?.company) ? load.company[0] : load?.company;
              return (
                <Card key={tl.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{load?.load_number || 'Load'}</p>
                        <p className="text-sm text-muted-foreground">{company?.name || 'No company'}</p>
                        <p className="text-sm font-medium mt-1">{formatCurrency(load?.total_rate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {load?.load_status || 'pending'}
                        </Badge>
                        <Sheet open={editingLoadId === tl.load_id} onOpenChange={(open) => setEditingLoadId(open ? tl.load_id : null)}>
                          <SheetTrigger asChild>
                            <Button variant="outline" size="sm">Edit</Button>
                          </SheetTrigger>
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
                                  <div>
                                    <label className="text-xs text-muted-foreground">Actual CUFT</label>
                                    <input name="actual_cuft_loaded" type="number" step="0.01" defaultValue={load?.actual_cuft_loaded || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Rate/CUFT</label>
                                    <input name="contract_rate_per_cuft" type="number" step="0.01" defaultValue={load?.contract_rate_per_cuft || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Balance Due</label>
                                    <input name="balance_due_on_delivery" type="number" step="0.01" defaultValue={load?.balance_due_on_delivery || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Load Status</label>
                                    <select name="load_status" defaultValue={load?.load_status || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm">
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
                                  <div>
                                    <label className="text-xs text-muted-foreground">Collected on Delivery</label>
                                    <input name="amount_collected_on_delivery" type="number" step="0.01" defaultValue={load?.amount_collected_on_delivery || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Paid to Company</label>
                                    <input name="amount_paid_directly_to_company" type="number" step="0.01" defaultValue={load?.amount_paid_directly_to_company || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
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
                                    <div key={key}>
                                      <label className="text-xs text-muted-foreground">{label}</label>
                                      <input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
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
                                    <div key={key}>
                                      <label className="text-xs text-muted-foreground">{label}</label>
                                      <input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Storage</p>
                                <div className="flex gap-4 mb-2">
                                  <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="storage_drop" defaultChecked={load?.storage_drop} className="h-4 w-4" />
                                    Storage drop
                                  </label>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="company_approved_exception_delivery" defaultChecked={load?.company_approved_exception_delivery} className="h-4 w-4" />
                                    Exception approved
                                  </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Move-In Fee</label>
                                    <input name="storage_move_in_fee" type="number" step="0.01" defaultValue={load?.storage_move_in_fee || ''} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Daily Fee</label>
                                    <input name="storage_daily_fee" type="number" step="0.01" defaultValue={load?.storage_daily_fee || ''} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Days</label>
                                    <input name="storage_days_billed" type="number" defaultValue={load?.storage_days_billed || ''} className="w-full border border-border rounded-md px-2 py-1.5 text-sm" />
                                  </div>
                                </div>
                                <input name="storage_location_name" defaultValue={load?.storage_location_name || ''} placeholder="Location name" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                <input name="storage_location_address" defaultValue={load?.storage_location_address || ''} placeholder="Address" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                                <textarea name="storage_notes" defaultValue={load?.storage_notes || ''} placeholder="Storage notes" className="w-full border border-border rounded-md px-3 py-2 text-sm" rows={2} />
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Payment</p>
                                <select name="payment_method" defaultValue={load?.payment_method || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                                  <option value="">Select method</option>
                                  <option value="cash">Cash</option>
                                  <option value="card">Card</option>
                                  <option value="certified_check">Certified check</option>
                                  <option value="customer_paid_directly_to_company">Customer paid company</option>
                                </select>
                                <input name="payment_method_notes" defaultValue={load?.payment_method_notes || ''} placeholder="Payment notes" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
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
                      </div>
                    </div>
                    <form action={actions.removeTripLoad} className="mt-2">
                      <input type="hidden" name="load_id" value={tl.load_id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 p-0 h-auto">
                        Remove
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Attach Load */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Attach Load</p>
              <form action={async (formData) => {
                await actions.addTripLoad(formData);
              }} className="space-y-3">
                <select name="load_id" className="w-full border border-border rounded-md px-3 py-2 text-sm" required>
                  <option value="">Select a load...</option>
                  {availableLoads.map((load) => {
                    const company = Array.isArray(load.company) ? load.company[0] : load.company;
                    return (
                      <option key={load.id} value={load.id}>
                        {load.load_number} - {company?.name || 'No company'}
                      </option>
                    );
                  })}
                </select>
                <select name="role" className="w-full border border-border rounded-md px-3 py-2 text-sm" defaultValue="primary">
                  <option value="primary">Primary</option>
                  <option value="backhaul">Backhaul</option>
                  <option value="partial">Partial</option>
                </select>
                <input type="hidden" name="sequence_index" value="0" />
                <Button type="submit" className="w-full">Add Load</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="p-4 space-y-4 mt-0">
          {/* Expense Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Driver Pay</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.driver_pay_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Fuel</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.fuel_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Tolls</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.tolls_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Other</p>
                <p className="text-lg font-semibold">{formatCurrency(trip.other_expenses_total)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Add Expense Button */}
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
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <select name="category" className="w-full border border-border rounded-md px-3 py-2 text-sm" required>
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
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <input name="amount" type="number" step="0.01" className="w-full border border-border rounded-md px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date</label>
                  <DatePicker name="incurred_at" placeholder="Select date" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <input name="description" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expense Type</label>
                  <input name="expense_type" className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Paid By</label>
                  <select name="paid_by" className="w-full border border-border rounded-md px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    <option value="driver_personal">Driver Personal</option>
                    <option value="driver_cash">Driver Cash</option>
                    <option value="company_card">Company Card</option>
                    <option value="fuel_card">Fuel Card</option>
                  </select>
                </div>
                <PhotoField name="receipt_photo_url" label="Receipt Photo" />
                <div>
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <textarea name="notes" className="w-full border border-border rounded-md px-3 py-2 text-sm" rows={2} />
                </div>
                <div className="sticky bottom-0 bg-background pt-4 pb-2">
                  <Button type="submit" className="w-full">Save Expense</Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>

          {/* Expense List */}
          {trip.expenses.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No expenses recorded yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {trip.expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(expense.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {expense.category} &bull; {expense.incurred_at}
                      </p>
                    </div>
                    <form action={actions.deleteExpense}>
                      <input type="hidden" name="expense_id" value={expense.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        Delete
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="p-4 space-y-4 mt-0">
          {/* Settlement Status */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline">
                  {settlementSnapshot.settlements[0]?.status || (trip.status === 'settled' ? 'settled' : 'Not settled')}
                </Badge>
              </div>
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
                <span className={profit >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(profit)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Receivables */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Receivables</p>
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
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Payables</p>
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

          {/* Settle Button */}
          <form action={async (formData) => {
            setIsSubmitting(true);
            await actions.settleTrip(formData);
            setIsSubmitting(false);
          }}>
            <input type="hidden" name="trip_id" value={trip.id} />
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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

          {/* Delete Trip */}
          <form action={actions.deleteTrip}>
            <Button type="submit" variant="destructive" className="w-full">
              Delete Trip
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

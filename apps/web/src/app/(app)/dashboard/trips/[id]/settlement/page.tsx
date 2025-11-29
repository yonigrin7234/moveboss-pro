import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, CheckCircle, DollarSign, Truck, User, MapPin, Package, Receipt, Camera, Building2 } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getTripById } from '@/data/trips';
import { createClient } from '@/lib/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SettlementPageProps {
  params: Promise<{ id: string }>;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const settlementStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  paid: 'bg-green-100 text-green-800',
};

export default async function TripSettlementPage({ params }: SettlementPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const trip = await getTripById(id, user.id);

  if (!trip) {
    return (
      <div className="p-4">
        <h1 className="text-3xl font-bold text-foreground mb-4">Trip Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This trip either does not exist or you no longer have access to it.
        </p>
        <Link
          href="/dashboard/trips"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Trips
        </Link>
      </div>
    );
  }

  // Extract data
  const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
  const trailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'No driver assigned';

  // Calculate totals from loads
  const loads = trip.loads || [];
  const expenses = trip.expenses || [];

  // Revenue from loads
  const totalRevenue = loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    return sum + (Number(load.total_revenue) || 0);
  }, 0);

  // Amount collected by driver (COD)
  const totalCollected = loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    return sum + (Number(load.amount_collected_on_delivery) || 0);
  }, 0);

  // Total CUFT
  const totalCuft = loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    return sum + (Number(load.actual_cuft_loaded) || 0);
  }, 0);

  // Receivables (what company still owes)
  const receivables = totalRevenue - totalCollected;

  // Group loads by company for company-level breakdown
  interface CompanyBreakdown {
    companyId: string | null;
    companyName: string;
    loads: Array<{ loadNumber: string; revenue: number; collected: number; receivable: number }>;
    totalRevenue: number;
    totalCollected: number;
    totalReceivable: number;
  }

  const companyBreakdowns = loads.reduce<Record<string, CompanyBreakdown>>((acc, tl) => {
    const load = (tl.load || {}) as any;
    const company = Array.isArray(load.company) ? load.company[0] : load.company;
    const companyId = load.company_id || company?.id || null;
    const companyName = company?.name || 'Unknown Company';
    const key = companyId || 'unknown';

    const loadRevenue = Number(load.total_revenue) || 0;
    const loadCollected = Number(load.amount_collected_on_delivery) || 0;
    const loadReceivable = loadRevenue - loadCollected;

    if (!acc[key]) {
      acc[key] = {
        companyId,
        companyName,
        loads: [],
        totalRevenue: 0,
        totalCollected: 0,
        totalReceivable: 0,
      };
    }

    acc[key].loads.push({
      loadNumber: load.load_number || tl.load_id,
      revenue: loadRevenue,
      collected: loadCollected,
      receivable: loadReceivable,
    });
    acc[key].totalRevenue += loadRevenue;
    acc[key].totalCollected += loadCollected;
    acc[key].totalReceivable += loadReceivable;

    return acc;
  }, {});

  const companyList = Object.values(companyBreakdowns).sort((a, b) => b.totalRevenue - a.totalRevenue);
  const hasMultipleCompanies = companyList.length > 1;

  // Expense totals
  const expensesByType = expenses.reduce(
    (acc, exp) => {
      const amount = Number(exp.amount) || 0;
      const paidBy = (exp as any).paid_by || '';

      acc.total += amount;

      if (['company_card', 'fuel_card', 'efs_card', 'comdata'].includes(paidBy)) {
        acc.companyPaid += amount;
      } else {
        acc.driverPaid += amount;
      }

      // Categorize
      if (exp.category === 'fuel') acc.fuel += amount;
      else if (exp.category === 'tolls') acc.tolls += amount;
      else acc.other += amount;

      return acc;
    },
    { total: 0, companyPaid: 0, driverPaid: 0, fuel: 0, tolls: 0, other: 0 }
  );

  // Driver pay
  const driverPayTotal = trip.driver_pay_total || 0;

  // Miles
  const odoStart = Number((trip as any).odometer_start) || 0;
  const odoEnd = Number((trip as any).odometer_end) || 0;
  const actualMiles = odoEnd > odoStart ? odoEnd - odoStart : (trip.total_miles || 0);

  // Trip days
  const tripDays = (() => {
    if (trip.start_date && trip.end_date) {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      return diff + 1;
    }
    return 1;
  })();

  // Net settlement: Driver pay + reimbursements - collections
  const netSettlement = driverPayTotal + expensesByType.driverPaid - totalCollected;
  const settlementDirection =
    netSettlement > 0 ? 'company_owes_driver' : netSettlement < 0 ? 'driver_owes_company' : 'even';

  // Settlement status from trip
  const settlementStatus = (trip as any).settlement_status || 'pending';
  const settlementPaidAt = (trip as any).settlement_paid_at;
  const settlementPaidMethod = (trip as any).settlement_paid_method;

  // Gather documents from loads
  const documents: { type: string; url: string; loadNumber: string }[] = [];
  loads.forEach((tl) => {
    const load = (tl.load || {}) as any;
    const loadNumber = load.load_number || tl.load_id;

    if (load.loading_report_photo) {
      documents.push({ type: 'Loading Report', url: load.loading_report_photo, loadNumber });
    }
    (load.origin_paperwork_photos || []).forEach((url: string) => {
      documents.push({ type: 'Origin Paperwork', url, loadNumber });
    });
    (load.signed_bol_photos || []).forEach((url: string) => {
      documents.push({ type: 'Signed BOL', url, loadNumber });
    });
    (load.signed_inventory_photos || []).forEach((url: string) => {
      documents.push({ type: 'Signed Inventory', url, loadNumber });
    });
    if (load.delivery_location_photo) {
      documents.push({ type: 'Delivery Photo', url: load.delivery_location_photo, loadNumber });
    }
  });

  // Add odometer photos
  if ((trip as any).odometer_start_photo_url) {
    documents.push({ type: 'Odometer Start', url: (trip as any).odometer_start_photo_url, loadNumber: 'Trip' });
  }
  if ((trip as any).odometer_end_photo_url) {
    documents.push({ type: 'Odometer End', url: (trip as any).odometer_end_photo_url, loadNumber: 'Trip' });
  }

  // Add expense receipts
  expenses.forEach((exp) => {
    if ((exp as any).receipt_photo_url) {
      documents.push({ type: `Receipt: ${exp.category}`, url: (exp as any).receipt_photo_url, loadNumber: 'Expense' });
    }
  });

  // Server action to mark as paid
  async function markAsPaidAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const tripId = formData.get('trip_id') as string;
    const method = formData.get('method') as string;
    const notes = formData.get('settlement_notes') as string;
    const reference = formData.get('reference') as string;

    const supabase = await createClient();
    const { error } = await supabase
      .from('trips')
      .update({
        settlement_status: 'paid',
        settlement_paid_at: new Date().toISOString(),
        settlement_paid_method: method,
        settlement_paid_reference: reference || null,
        settlement_notes: notes || null,
      })
      .eq('id', tripId)
      .eq('owner_id', currentUser.id);

    if (error) {
      console.error('Error marking as paid:', error);
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/trips/${tripId}/settlement`);
    revalidatePath(`/dashboard/trips/${tripId}`);
    revalidatePath('/dashboard/trips');
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/trips/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Trip
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trip {trip.trip_number} Settlement</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            {driverName}
          </p>
        </div>
        <Badge className={settlementStatusColors[settlementStatus] || 'bg-gray-100 text-gray-800'}>
          {settlementStatus.charAt(0).toUpperCase() + settlementStatus.slice(1)}
        </Badge>
      </div>

      {/* Trip Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Trip Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{actualMiles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Miles</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{totalCuft.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total CUFT</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{loads.length}</p>
              <p className="text-xs text-muted-foreground">Loads Delivered</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{tripDays}</p>
              <p className="text-xs text-muted-foreground">Trip Days</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Truck:</span>
              <span className="font-medium">{truck?.unit_number || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Trailer:</span>
              <span className="font-medium">{trailer?.unit_number || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Load Revenue</span>
            <span className="font-medium">{currencyFormatter.format(totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Collected by Driver (COD)</span>
            <span className="font-medium text-green-600">-{currencyFormatter.format(totalCollected)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Receivables (Company to Collect)</span>
            <span>{currencyFormatter.format(receivables)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Company-by-Company Breakdown */}
      {hasMultipleCompanies && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Revenue by Company ({companyList.length} companies)
            </CardTitle>
            <CardDescription>
              Breakdown of revenue, collections, and receivables per company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyList.map((company, index) => (
              <div key={company.companyId || index} className="space-y-2">
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{company.companyName}</h4>
                  <Badge variant="outline">{company.loads.length} load{company.loads.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="pl-4 space-y-1 text-sm">
                  {company.loads.map((load, loadIndex) => (
                    <div key={loadIndex} className="flex justify-between text-muted-foreground">
                      <span>{load.loadNumber}</span>
                      <span>{currencyFormatter.format(load.revenue)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium">{currencyFormatter.format(company.totalRevenue)}</span>
                  </div>
                  {company.totalCollected > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collected (COD)</span>
                      <span className="font-medium text-green-600">-{currencyFormatter.format(company.totalCollected)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Receivable</span>
                    <span className={company.totalReceivable > 0 ? 'text-amber-600' : 'text-green-600'}>
                      {currencyFormatter.format(company.totalReceivable)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary row */}
            <Separator className="my-4" />
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Revenue (all companies)</span>
                <span className="font-medium">{currencyFormatter.format(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Collected</span>
                <span className="font-medium text-green-600">-{currencyFormatter.format(totalCollected)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Receivables</span>
                <span className={receivables > 0 ? 'text-amber-600' : 'text-green-600'}>
                  {currencyFormatter.format(receivables)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Company Detail (when only one company) */}
      {!hasMultipleCompanies && companyList.length === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company: {companyList[0].companyName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1 text-sm">
              {companyList[0].loads.map((load, loadIndex) => (
                <div key={loadIndex} className="flex justify-between">
                  <span className="text-muted-foreground">{load.loadNumber}</span>
                  <div className="text-right">
                    <span className="font-medium">{currencyFormatter.format(load.revenue)}</span>
                    {load.collected > 0 && (
                      <span className="ml-2 text-green-600 text-xs">({currencyFormatter.format(load.collected)} collected)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Receivable from {companyList[0].companyName}</span>
              <span className={companyList[0].totalReceivable > 0 ? 'text-amber-600' : 'text-green-600'}>
                {currencyFormatter.format(companyList[0].totalReceivable)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Pay */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Earnings</CardTitle>
          <CardDescription>
            Pay Mode: {(trip as any).trip_pay_mode?.replace(/_/g, ' ') || 'per mile'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(trip as any).trip_pay_mode === 'per_mile' && (
            <div className="flex justify-between">
              <div>
                <span className="text-foreground">Per Mile</span>
                <p className="text-xs text-muted-foreground">
                  {actualMiles.toLocaleString()} mi × ${Number((trip as any).trip_rate_per_mile || 0).toFixed(2)}/mi
                </p>
              </div>
              <span className="font-medium">{currencyFormatter.format(driverPayTotal)}</span>
            </div>
          )}
          {(trip as any).trip_pay_mode === 'per_cuft' && (
            <div className="flex justify-between">
              <div>
                <span className="text-foreground">Per Cubic Foot</span>
                <p className="text-xs text-muted-foreground">
                  {totalCuft.toLocaleString()} cf × ${Number((trip as any).trip_rate_per_cuft || 0).toFixed(2)}/cf
                </p>
              </div>
              <span className="font-medium">{currencyFormatter.format(driverPayTotal)}</span>
            </div>
          )}
          {(trip as any).trip_pay_mode === 'per_mile_and_cuft' && (
            <>
              <div className="flex justify-between">
                <div>
                  <span className="text-foreground">Per Mile</span>
                  <p className="text-xs text-muted-foreground">
                    {actualMiles.toLocaleString()} mi × ${Number((trip as any).trip_rate_per_mile || 0).toFixed(2)}/mi
                  </p>
                </div>
                <span className="font-medium">
                  {currencyFormatter.format(actualMiles * Number((trip as any).trip_rate_per_mile || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-foreground">Per Cubic Foot</span>
                  <p className="text-xs text-muted-foreground">
                    {totalCuft.toLocaleString()} cf × ${Number((trip as any).trip_rate_per_cuft || 0).toFixed(2)}/cf
                  </p>
                </div>
                <span className="font-medium">
                  {currencyFormatter.format(totalCuft * Number((trip as any).trip_rate_per_cuft || 0))}
                </span>
              </div>
            </>
          )}
          {(trip as any).trip_pay_mode === 'percent_of_revenue' && (
            <div className="flex justify-between">
              <div>
                <span className="text-foreground">Percent of Revenue</span>
                <p className="text-xs text-muted-foreground">
                  {Number((trip as any).trip_percent_of_revenue || 0)}% × {currencyFormatter.format(totalRevenue)}
                </p>
              </div>
              <span className="font-medium">{currencyFormatter.format(driverPayTotal)}</span>
            </div>
          )}
          {(trip as any).trip_pay_mode === 'flat_daily_rate' && (
            <div className="flex justify-between">
              <div>
                <span className="text-foreground">Daily Rate</span>
                <p className="text-xs text-muted-foreground">
                  {tripDays} day{tripDays !== 1 ? 's' : ''} × ${Number((trip as any).trip_flat_daily_rate || 0).toFixed(2)}/day
                </p>
              </div>
              <span className="font-medium">{currencyFormatter.format(driverPayTotal)}</span>
            </div>
          )}
          {!(trip as any).trip_pay_mode && (
            <div className="flex justify-between">
              <span className="text-foreground">Driver Pay</span>
              <span className="font-medium">{currencyFormatter.format(driverPayTotal)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Gross Driver Pay</span>
            <span>{currencyFormatter.format(driverPayTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Reimbursements */}
      {expensesByType.driverPaid > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reimbursements (Driver Paid Expenses)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenses
              .filter((exp) => {
                const paidBy = (exp as any).paid_by || '';
                return !['company_card', 'fuel_card', 'efs_card', 'comdata'].includes(paidBy);
              })
              .map((exp, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {exp.category} - {exp.description || 'No description'}
                  </span>
                  <span className="text-green-600">+{currencyFormatter.format(exp.amount)}</span>
                </div>
              ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Reimbursements</span>
              <span className="text-green-600">+{currencyFormatter.format(expensesByType.driverPaid)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collections */}
      {totalCollected > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collections (Driver Received)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loads.map((tl, index) => {
              const load = (tl.load || {}) as any;
              const collected = Number(load.amount_collected_on_delivery) || 0;
              if (collected <= 0) return null;
              return (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {load.load_number || tl.load_id} ({load.payment_method || 'cash'})
                  </span>
                  <span className="text-red-600">-{currencyFormatter.format(collected)}</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Collected</span>
              <span className="text-red-600">-{currencyFormatter.format(totalCollected)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NET SETTLEMENT */}
      <Card
        className={
          settlementDirection === 'company_owes_driver'
            ? 'border-green-500/30 bg-green-500/5'
            : settlementDirection === 'driver_owes_company'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-gray-500/30 bg-gray-500/5'
        }
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-foreground">Net Settlement</p>
              <p className="text-sm text-muted-foreground">
                {settlementDirection === 'company_owes_driver' && 'Company pays driver'}
                {settlementDirection === 'driver_owes_company' && 'Driver pays company'}
                {settlementDirection === 'even' && 'Settled even'}
              </p>
            </div>
            <p
              className={`text-3xl font-bold ${
                settlementDirection === 'company_owes_driver'
                  ? 'text-green-600'
                  : settlementDirection === 'driver_owes_company'
                    ? 'text-red-600'
                    : 'text-foreground'
              }`}
            >
              {currencyFormatter.format(Math.abs(netSettlement))}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Driver Pay</span>
              <span>+{currencyFormatter.format(driverPayTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reimbursements</span>
              <span>+{currencyFormatter.format(expensesByType.driverPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Collections (Driver Owes)</span>
              <span>-{currencyFormatter.format(totalCollected)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Trip Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {documents.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-lg border overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img src={doc.url} alt={doc.type} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <p className="text-xs text-white truncate">{doc.type}</p>
                    <p className="text-xs text-white/70 truncate">{doc.loadNumber}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {settlementStatus !== 'paid' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Settlement Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={markAsPaidAction} className="space-y-4">
              <input type="hidden" name="trip_id" value={id} />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Payment Reference (optional)</label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Check #, transaction ID, etc."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Settlement Notes (optional)</label>
                <textarea
                  name="settlement_notes"
                  placeholder="Any notes about this settlement..."
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button type="submit" name="method" value="direct_deposit" className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay (Direct Deposit)
                </Button>

                <Button type="submit" name="method" value="check" variant="outline" className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay (Check)
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button type="submit" name="method" value="cash" variant="secondary" size="sm" className="w-full">
                  Cash
                </Button>
                <Button type="submit" name="method" value="zelle" variant="secondary" size="sm" className="w-full">
                  Zelle
                </Button>
                <Button type="submit" name="method" value="venmo" variant="secondary" size="sm" className="w-full">
                  Venmo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Already Paid */}
      {settlementStatus === 'paid' && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-bold text-green-600">Settlement Paid</p>
                <p className="text-sm text-muted-foreground">
                  Paid on {settlementPaidAt ? new Date(settlementPaidAt).toLocaleDateString() : 'Unknown date'}
                  {settlementPaidMethod && <> via {settlementPaidMethod.replace(/_/g, ' ')}</>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

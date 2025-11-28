import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, DollarSign } from 'lucide-react';
import { getCurrentUser, getCurrentUserPermissions } from '@/lib/supabase-server';
import { AccessDenied } from '@/components/access-denied';
import {
  listTripsForUser,
  type Trip,
  type TripFilters,
  type TripStatus,
  getTripStatsForUser,
  getTripsNeedingSettlement,
  type TripNeedingSettlement,
} from '@/data/trips';
import { getDriversForUser, type Driver } from '@/data/drivers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TripListFilters } from './trip-list-filters';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLocation(city: string | null, state: string | null) {
  if (!city && !state) return '—';
  if (city && state) return `${city}, ${state}`;
  return city || state || '—';
}

function getStatusBadgeClasses(status: TripStatus) {
  switch (status) {
    case 'planned':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    case 'en_route':
      return 'bg-blue-500/10 text-primary dark:text-blue-400';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatStatusLabel(status: TripStatus) {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'en_route':
      return 'En Route';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

interface TripsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions?.can_manage_trips) {
    return <AccessDenied message="You don't have permission to manage trips." />;
  }

  const params = await searchParams;
  const filters: TripFilters = {
    search: params.search,
    status: (params.status as TripFilters['status']) || 'all',
    driverId: params.driverId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  let trips: Trip[] = [];
  let drivers: Driver[] = [];
  let tripsNeedingSettlement: TripNeedingSettlement[] = [];
  let error: string | null = null;
  let stats = {
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    profitLast30Days: 0,
  };

  try {
    [trips, drivers, stats, tripsNeedingSettlement] = await Promise.all([
      listTripsForUser(user.id, filters),
      getDriversForUser(user.id),
      getTripStatsForUser(user.id),
      getTripsNeedingSettlement(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load trips';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Trips
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track multi-load journeys and trip-level financials.</p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/trips/new">Add Trip</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Trips</div>
            <div className="text-2xl font-bold text-foreground">{stats.totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Active</div>
            <div className="text-2xl font-bold text-foreground">{stats.activeTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold text-foreground">{stats.completedTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Profit (30 days)</div>
            <div className="text-2xl font-bold text-foreground">
              {currencyFormatter.format(stats.profitLast30Days)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TRIPS NEEDING SETTLEMENT */}
      {tripsNeedingSettlement.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Trips Needing Settlement ({tripsNeedingSettlement.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tripsNeedingSettlement.slice(0, 5).map((trip) => {
                const driverName = trip.driver
                  ? `${trip.driver.first_name} ${trip.driver.last_name}`
                  : 'No driver';
                const netPay = (trip.driver_pay_total || 0);

                return (
                  <Link
                    key={trip.id}
                    href={`/dashboard/trips/${trip.id}/settlement`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">Trip {trip.trip_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {driverName}
                        {trip.completed_at && (
                          <> • Completed {new Date(trip.completed_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {currencyFormatter.format(netPay)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <DollarSign className="h-3 w-3" />
                        Driver pay due
                      </p>
                    </div>
                  </Link>
                );
              })}
              {tripsNeedingSettlement.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{tripsNeedingSettlement.length - 5} more trips needing settlement
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <TripListFilters initialFilters={filters} drivers={drivers} />

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {trips.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trips yet. Click 'Add Trip' to create your first one.
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Driver / Equipment</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Financials</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => {
                    const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
                    const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
                    const trailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;
                    const expensesTotal =
                      (trip.driver_pay_total || 0) +
                      (trip.fuel_total || 0) +
                      (trip.tolls_total || 0) +
                      (trip.other_expenses_total || 0);
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/trips/${trip.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {trip.trip_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(trip.status)}`}
                          >
                            {formatStatusLabel(trip.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{driver ? `${driver.first_name} ${driver.last_name}` : '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {truck ? `Truck ${truck.unit_number}` : 'No truck'}
                            {' • '}
                            {trailer ? `Trailer ${trailer.unit_number}` : 'No trailer'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatLocation(trip.origin_city, trip.origin_state)}</div>
                          <div className="text-xs text-muted-foreground">
                            →
                            <span className="ml-1">
                              {formatLocation(trip.destination_city, trip.destination_state)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">Start: {formatDate(trip.start_date)}</div>
                          <div className="text-sm">End: {formatDate(trip.end_date)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">Rev: {currencyFormatter.format(trip.revenue_total || 0)}</div>
                          <div className="text-sm">Exp: {currencyFormatter.format(expensesTotal)}</div>
                          <div className="font-semibold">
                            Profit: {currencyFormatter.format(trip.profit_total || 0)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

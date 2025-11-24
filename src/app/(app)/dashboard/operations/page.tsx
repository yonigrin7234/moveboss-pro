import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  ClipboardList,
  Plus,
  Route,
  Store,
  Truck,
} from 'lucide-react';

import { getLoadsForUser, getLoadStatsForUser, type Load, type LoadStatus } from '@/data/loads';
import { getTripStatsForUser, listTripsForUser, type Trip, type TripStatus } from '@/data/trips';
import { getCurrentUser } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const loadStatusStyles: Record<LoadStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  assigned: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  in_transit: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  delivered: 'bg-emerald-500/10 text-emerald-500',
  canceled: 'bg-rose-500/10 text-rose-500',
};

const tripStatusStyles: Record<TripStatus, string> = {
  planned: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  active: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  en_route: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-500',
  settled: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-rose-500/10 text-rose-500',
};

const quickActions = [
  {
    label: 'Post to Marketplace',
    href: '/dashboard/marketplace',
    description: 'Push open capacity to find carrier matches',
    icon: Store,
  },
  {
    label: 'Create Load',
    href: '/dashboard/loads/new',
    description: 'Add a load with assignment and timing',
    icon: ClipboardList,
  },
  {
    label: 'Create Trip',
    href: '/dashboard/trips/new',
    description: 'Bundle loads and assign equipment',
    icon: Route,
  },
  {
    label: 'Dispatch Alert',
    href: '/dashboard/alerts',
    description: 'Log an issue and notify the right team',
    icon: Bell,
  },
];

const mockAlerts = [
  {
    id: 'alert-1',
    title: 'Missing POD',
    detail: 'Load LD-104 waiting for proof of delivery.',
    severity: 'high',
    cta: '/dashboard/loads',
  },
  {
    id: 'alert-2',
    title: 'Trailer inspection due',
    detail: 'Trailer TR-22 expires in 5 days.',
    severity: 'medium',
    cta: '/dashboard/fleet/trailers',
  },
  {
    id: 'alert-3',
    title: 'Driver ETA check',
    detail: 'Ping DR-18 for 10 am delivery window.',
    severity: 'low',
    cta: '/dashboard/people/drivers',
  },
];

function formatLocation(city?: string | null, state?: string | null) {
  if (!city && !state) return '-';
  if (city && state) return `${city}, ${state}`;
  return city || state || '-';
}

function formatDate(date?: string | null) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function OperationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let loadStats = {
    totalLoads: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
  };
  let tripStats = {
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    profitLast30Days: 0,
  };
  let activeLoads: Load[] = [];
  let activeTrips: Trip[] = [];
  let error: string | null = null;

  try {
    const [statsLoads, statsTrips, loads, trips] = await Promise.all([
      getLoadStatsForUser(user.id),
      getTripStatsForUser(user.id),
      getLoadsForUser(user.id),
      listTripsForUser(user.id),
    ]);

    loadStats = statsLoads;
    tripStats = statsTrips;
    activeLoads = (loads || []).filter((load) =>
      ['in_transit', 'assigned', 'pending'].includes(load.status)
    ).slice(0, 5);
    activeTrips = (trips || []).filter((trip) =>
      ['planned', 'en_route'].includes(trip.status)
    ).slice(0, 5);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load operations data';
  }

  const opsHealth = [
    { label: 'Loads in motion', value: loadStats.inTransit },
    { label: 'Loads pending', value: loadStats.pending },
    { label: 'Trips active', value: tripStats.activeTrips },
    { label: 'Trips completed', value: tripStats.completedTrips },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Operations Command
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Keep freight, fleet, and teams moving
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            One place to launch loads, build trips, and triage alerts with instant access to the marketplace and fleet.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/loads/new">
                <Plus className="mr-2 h-4 w-4" />
                Create load
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/marketplace">
                Open marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/alerts">
                View alerts
                <Bell className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="w-full max-w-md border-primary/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary">Live Ops Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Loads active</p>
              <p className="text-2xl font-semibold text-foreground">{loadStats.inTransit}</p>
              <p className="text-xs text-muted-foreground">{loadStats.pending} pending assignment</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Trips live</p>
              <p className="text-2xl font-semibold text-foreground">{tripStats.activeTrips}</p>
              <p className="text-xs text-muted-foreground">{tripStats.completedTrips} completed this month</p>
            </div>
            <Separator className="col-span-2" />
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Revenue 30d</p>
                <p className="text-lg font-semibold">${tripStats.profitLast30Days.toLocaleString()}</p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard/finance/reports">
                  View reports
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {opsHealth.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">Updated from your latest dispatch data</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Active loads</CardTitle>
              <p className="text-sm text-muted-foreground">In progress or pending assignment</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/loads">
                Go to loads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {activeLoads.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No active loads yet. Create one to start dispatching.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Assignment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoads.map((load) => {
                      const company = Array.isArray(load.company) ? load.company[0] : load.company;
                      return (
	                    <TableRow key={load.id}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/loads/${load.id}`} className="hover:text-primary">
                              {load.load_number || load.job_number}
                            </Link>
                          </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company?.name ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={loadStatusStyles[load.status]}>
                            {load.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{formatLocation(load.pickup_city, load.pickup_state)}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatLocation(load.delivery_city, load.delivery_state)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-foreground">
                              {load.assigned_driver
                                ? `${load.assigned_driver.first_name} ${load.assigned_driver.last_name}`
                                : 'Unassigned'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {load.assigned_truck?.unit_number ? `Truck ${load.assigned_truck.unit_number}` : 'No truck'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1.2fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Trip queue</CardTitle>
              <p className="text-sm text-muted-foreground">Planned and en route trips</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/trips">
                Manage trips
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTrips.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No trips yet. Bundle loads and assign equipment to start tracking.
              </div>
            ) : (
              activeTrips.map((trip) => {
                const driver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
                const truck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;

                return (
                <div
                  key={trip.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Route className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/trips/${trip.id}`} className="font-semibold hover:text-primary">
                          {trip.trip_number}
                        </Link>
                        <Badge variant="secondary" className={tripStatusStyles[trip.status]}>
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatLocation(trip.origin_city, trip.origin_state)} to {formatLocation(trip.destination_city, trip.destination_state)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(trip.start_date)} - {formatDate(trip.end_date)} • {trip.total_miles ? `${trip.total_miles} mi` : 'Miles TBD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      <span>{truck?.unit_number ? `Truck ${truck.unit_number}` : 'No truck'}</span>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div>
                      <span className="text-foreground">{driver ? `${driver.first_name} ${driver.last_name}` : 'Unassigned driver'}</span>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Operational alerts</CardTitle>
              <p className="text-sm text-muted-foreground">Issues to unblock today</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" />
              {mockAlerts.length} open
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-border/70 bg-amber-50/50 px-3 py-3 shadow-sm dark:bg-amber-500/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded-full bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.detail}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    {alert.severity}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <Link href={alert.cta} className="inline-flex items-center text-primary hover:underline">
                    Open workspace
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

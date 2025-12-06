import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getTrucksForUser, getTrailersForUser, type Truck, type Trailer } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
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
import { Badge } from '@/components/ui/badge';
import { MetricsCard } from '@/components/dashboard/MetricsCard';

function formatTruckStatus(status: Truck['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'maintenance':
      return 'Maintenance';
    case 'inactive':
      return 'Inactive';
    default:
      return status;
  }
}

function formatTruckVehicleType(vehicleType: Truck['vehicle_type']): string {
  if (!vehicleType) return '—';
  switch (vehicleType) {
    case 'tractor':
      return 'Tractor';
    case '26ft_box_truck':
      return '26\' Box Truck';
    case '22ft_box_truck':
      return '22\' Box Truck';
    case '20ft_box_truck':
      return '20\' Box Truck';
    case '16ft_box_truck':
      return '16\' Box Truck';
    case '12ft_box_truck':
      return '12\' Box Truck';
    case 'sprinter_van':
      return 'Sprinter Van';
    case 'cargo_van':
      return 'Cargo Van';
    case 'other':
      return 'Other';
    default:
      return vehicleType;
  }
}

function formatTrailerStatus(status: Trailer['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'maintenance':
      return 'Maintenance';
    case 'inactive':
      return 'Inactive';
    default:
      return status;
  }
}

function formatTrailerType(type: Trailer['type']): string {
  switch (type) {
    case '53_dry_van':
      return '53\' Dry Van';
    case '26_box_truck':
      return '26\' Box Truck';
    case 'straight_truck':
      return 'Straight Truck';
    case 'cargo_trailer':
      return 'Cargo Trailer';
    case 'container':
      return 'Container';
    case 'other':
      return 'Other';
    default:
      return type;
  }
}

export default async function FleetPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let trucks: Truck[] = [];
  let trailers: Trailer[] = [];
  let drivers: Array<{ id: string; first_name: string; last_name: string }> = [];
  let error: string | null = null;

  try {
    [trucks, trailers, drivers] = await Promise.all([
      getTrucksForUser(user.id),
      getTrailersForUser(user.id),
      getDriversForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load fleet';
  }

  // Create a map for quick driver lookup
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Fleet
        </h1>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricsCard title="Total Trucks" value={trucks.length} />
        <MetricsCard title="Total Trailers" value={trailers.length} />
      </div>

      {/* Trucks Section */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Trucks</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent trucks in your fleet
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/fleet/trucks">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {trucks.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trucks yet. Click 'View all' to add your first truck.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year/Make/Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.slice(0, 5).map((truck) => {
                  const assignedDriver = truck.assigned_driver_id
                    ? driverMap.get(truck.assigned_driver_id)
                    : null;
                  return (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/fleet/trucks/${truck.id}`}
                          className="text-foreground hover:text-primary"
                        >
                          {truck.unit_number || truck.plate_number || '—'}
                        </Link>
                      </TableCell>
                      <TableCell>{formatTruckVehicleType(truck.vehicle_type)}</TableCell>
                      <TableCell>
                        {[truck.year, truck.make, truck.model].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            truck.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : truck.status === 'maintenance'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                          }
                        >
                          {formatTruckStatus(truck.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assignedDriver
                          ? `${assignedDriver.first_name} ${assignedDriver.last_name}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trailers Section */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Trailers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent trailers in your fleet
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/fleet/trailers">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {trailers.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trailers yet. Click 'View all' to add your first trailer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trailers.slice(0, 5).map((trailer) => {
                  const assignedDriver = trailer.assigned_driver_id
                    ? driverMap.get(trailer.assigned_driver_id)
                    : null;
                  return (
                    <TableRow key={trailer.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/fleet/trailers/${trailer.id}`}
                          className="text-foreground hover:text-primary"
                        >
                          {trailer.unit_number}
                        </Link>
                      </TableCell>
                      <TableCell>{formatTrailerType(trailer.type)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            trailer.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : trailer.status === 'maintenance'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                          }
                        >
                          {formatTrailerStatus(trailer.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {assignedDriver
                          ? `${assignedDriver.first_name} ${assignedDriver.last_name}`
                          : '—'}
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


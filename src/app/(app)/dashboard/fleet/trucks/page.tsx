import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getTrucksForUser, type Truck } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

function formatOwnershipType(type: Truck['ownership_type']): string {
  switch (type) {
    case 'owned':
      return 'Owned';
    case 'leased':
      return 'Leased';
    case 'rented':
      return 'Rented';
    default:
      return type;
  }
}

export default async function TrucksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let trucks: Truck[] = [];
  let drivers: Array<{ id: string; first_name: string; last_name: string }> = [];
  let error: string | null = null;

  try {
    [trucks, drivers] = await Promise.all([
      getTrucksForUser(user.id),
      getDriversForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load trucks';
  }

  // Create a map for quick driver lookup
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Trucks
        </h1>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/fleet/trucks/new">Add Truck</Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {trucks.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trucks yet. Click 'Add Truck' to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Truck # / Plate</TableHead>
                  <TableHead>Make / Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => {
                  const assignedDriver = truck.assigned_driver_id
                    ? driverMap.get(truck.assigned_driver_id)
                    : null;
                  return (
                    <TableRow 
                      key={truck.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/fleet/trucks/${truck.id}`}
                          className="text-foreground hover:text-primary"
                        >
                          {truck.unit_number || truck.plate_number || '—'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {[truck.make, truck.model].filter(Boolean).join(' ') || '—'}
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
    </div>
  );
}


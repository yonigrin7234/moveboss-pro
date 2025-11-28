import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentUserPermissions } from '@/lib/supabase-server';
import { AccessDenied } from '@/components/access-denied';
import { getTrailersForUser, type Trailer } from '@/data/fleet';
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

export default async function TrailersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions?.can_manage_vehicles) {
    return <AccessDenied message="You don't have permission to manage vehicles." />;
  }

  let trailers: Trailer[] = [];
  let drivers: Array<{ id: string; first_name: string; last_name: string }> = [];
  let error: string | null = null;

  try {
    [trailers, drivers] = await Promise.all([
      getTrailersForUser(user.id),
      getDriversForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load trailers';
  }

  // Create a map for quick driver lookup
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Trailers
        </h1>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/fleet/trailers/new">Add Trailer</Link>
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
          {trailers.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trailers yet. Click 'Add Trailer' to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trailer #</TableHead>
                  <TableHead>Capacity (CUFT)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trailers.map((trailer) => {
                  const assignedDriver = trailer.assigned_driver_id
                    ? driverMap.get(trailer.assigned_driver_id)
                    : null;
                  return (
                    <TableRow 
                      key={trailer.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/fleet/trailers/${trailer.id}`}
                          className="text-foreground hover:text-primary"
                        >
                          {trailer.unit_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {trailer.capacity_cuft ? `${trailer.capacity_cuft} cu ft` : '—'}
                      </TableCell>
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


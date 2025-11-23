import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getLatestLocationsForOwner, type DriverLocationRecord } from '@/data/location';
import { Card, CardContent } from '@/components/ui/card';
import { LiveFleetFilters } from './live-fleet-filters';

interface LiveFleetPageProps {
  searchParams: Promise<{
    availableOnly?: string;
    minCapacity?: string;
  }>;
}

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatLatLng(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatCapacity(location: DriverLocationRecord) {
  if (location.available_cubic === null && location.total_cubic_capacity === null) {
    return '—';
  }
  if (location.total_cubic_capacity) {
    return `${location.available_cubic ?? 0} / ${location.total_cubic_capacity} cu ft`;
  }
  return `${location.available_cubic ?? 0} cu ft`;
}

export default async function LiveFleetPage({ searchParams }: LiveFleetPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const minCapacityValue = params.minCapacity ? Number(params.minCapacity) : undefined;
  const filters = {
    availableOnly: params.availableOnly === '1',
    minCapacity:
      typeof minCapacityValue === 'number' && !Number.isNaN(minCapacityValue)
        ? minCapacityValue
        : undefined,
  };

  const locations = await getLatestLocationsForOwner(user.id);
  const filteredLocations = locations.filter((location) => {
    if (filters.availableOnly && !location.is_available_for_loads) return false;
    if (
      filters.minCapacity !== undefined &&
      (location.available_cubic ?? 0) < filters.minCapacity
    ) {
      return false;
    }
    return true;
  });

  const totalDrivers = locations.length;
  const availableDrivers = locations.filter((loc) => loc.is_available_for_loads).length;
  const averageCapacity =
    filteredLocations.length > 0
      ? Math.round(
          filteredLocations.reduce((sum, loc) => sum + (loc.available_cubic ?? 0), 0) /
            filteredLocations.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Live Fleet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Latest driver pings, capacity, and quick actions to match nearby loads.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="text-sm text-muted-foreground">Drivers reporting</div>
          <div className="text-2xl font-bold text-foreground">{totalDrivers}</div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="text-sm text-muted-foreground">Available for loads</div>
          <div className="text-2xl font-bold text-foreground">{availableDrivers}</div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <div className="text-sm text-muted-foreground">Avg. open cubic (filtered)</div>
          <div className="text-2xl font-bold text-foreground">{averageCapacity} cu ft</div>
        </div>
      </div>

      <LiveFleetFilters initialFilters={filters} />

      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No recent pings that match your filters. Have drivers send a ping from the mobile app or relax your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLocations.map((location) => (
            <div key={location.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {location.driver
                      ? `${location.driver.first_name} ${location.driver.last_name}`
                      : 'Unknown driver'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {location.driver ? location.driver.status : '—'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    location.is_available_for_loads
                      ? 'bg-green-100 text-green-800'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {location.is_available_for_loads ? 'Available' : 'Busy'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Last ping</div>
                  <div className="text-foreground font-medium">{formatRelativeTime(location.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Location</div>
                  <div className="text-foreground font-medium">{formatLatLng(location.latitude, location.longitude)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Equipment</div>
                  <div className="text-foreground font-medium">
                    {location.truck ? `Truck ${location.truck.unit_number}` : 'Truck —'}
                  </div>
                  <div className="text-muted-foreground">
                    {location.trailer ? `Trailer ${location.trailer.unit_number}` : 'Trailer —'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Capacity</div>
                  <div className="text-foreground font-medium">{formatCapacity(location)}</div>
                  {location.used_cubic !== null && (
                    <div className="text-xs text-muted-foreground">{location.used_cubic} cubic in use</div>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground">Speed</div>
                  <div className="text-foreground font-medium">
                    {location.speed_kph !== null ? `${location.speed_kph.toFixed(1)} km/h` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Heading</div>
                  <div className="text-foreground font-medium">
                    {location.heading_deg !== null ? `${location.heading_deg.toFixed(0)}°` : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Source: {location.source || 'unknown'}</span>
                <span>Odo: {location.odometer_miles ?? '—'} mi</span>
              </div>

              <div className="mt-4 flex gap-3">
                <Link
                  href="/dashboard/loads"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                >
                  Find loads along route
                </Link>
                <span className="px-4 py-2 border border-border text-muted-foreground rounded-md text-sm">
                  Assignment workflow coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



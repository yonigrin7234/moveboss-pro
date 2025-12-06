'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Truck, Package, RefreshCw, Clock, Navigation, User, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface DriverLocation {
  id: string;
  driver_id: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  speed_kph: number | null;
  heading_deg: number | null;
  odometer_miles: number | null;
  total_cubic_capacity: number | null;
  used_cubic: number | null;
  available_cubic: number | null;
  is_available_for_loads: boolean;
  source: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  driver?: { id: string; first_name: string; last_name: string; status: string } | { id: string; first_name: string; last_name: string; status: string }[] | null;
  truck?: { id: string; unit_number: string } | { id: string; unit_number: string }[] | null;
  trailer?: { id: string; unit_number: string } | { id: string; unit_number: string }[] | null;
}

interface UnassignedLoad {
  id: string;
  load_number: string;
  pickup_city: string | null;
  pickup_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  pickup_date: string | null;
  cubic_feet: number | null;
  cubic_feet_estimate: number | null;
  linehaul_rate: number | null;
  status: string;
  service_type: string;
  company?: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface FleetStats {
  totalDrivers: number;
  availableDrivers: number;
  averageCapacity: number;
}

interface LiveFleetDashboardProps {
  initialLocations: DriverLocation[];
  initialStats: FleetStats;
}

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatCapacity(location: DriverLocation) {
  if (location.available_cubic === null && location.total_cubic_capacity === null) return '—';
  if (location.total_cubic_capacity) {
    return `${location.available_cubic ?? 0} / ${location.total_cubic_capacity} cuft`;
  }
  return `${location.available_cubic ?? 0} cuft`;
}

function getHeadingDirection(heading: number | null): string {
  if (heading === null) return '—';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

export function LiveFleetDashboard({ initialLocations, initialStats }: LiveFleetDashboardProps) {
  const [locations, setLocations] = useState<DriverLocation[]>(initialLocations);
  const [stats, setStats] = useState<FleetStats>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [unassignedLoads, setUnassignedLoads] = useState<UnassignedLoad[]>([]);
  const [isLoadingLoads, setIsLoadingLoads] = useState(false);
  const [assigningLoadId, setAssigningLoadId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ availableOnly: false, minCapacity: '' });
  const { toast } = useToast();

  // Fetch latest locations
  const refreshLocations = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/live-fleet');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLocations(data.locations);
      setStats(data.stats);
      setLastUpdated(new Date());
      if (showToast) {
        toast({ title: 'Fleet updated', description: `${data.locations.length} drivers reporting` });
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      if (showToast) {
        toast({ title: 'Refresh failed', description: 'Could not update fleet data', variant: 'destructive' });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => refreshLocations(false), 30000);
    return () => clearInterval(interval);
  }, [refreshLocations]);

  // Fetch unassigned loads when a driver is selected
  const openAssignmentModal = async (location: DriverLocation) => {
    setSelectedDriver(location);
    setIsLoadingLoads(true);
    try {
      const response = await fetch('/api/live-fleet/unassigned-loads');
      if (!response.ok) throw new Error('Failed to fetch loads');
      const data = await response.json();
      setUnassignedLoads(data.loads);
    } catch (error) {
      console.error('Error fetching loads:', error);
      toast({ title: 'Error', description: 'Could not fetch available loads', variant: 'destructive' });
    } finally {
      setIsLoadingLoads(false);
    }
  };

  // Assign load to driver
  const assignLoadToDriver = async (load: UnassignedLoad) => {
    if (!selectedDriver) return;

    const driver = Array.isArray(selectedDriver.driver) ? selectedDriver.driver[0] : selectedDriver.driver;
    const truck = Array.isArray(selectedDriver.truck) ? selectedDriver.truck[0] : selectedDriver.truck;
    const trailer = Array.isArray(selectedDriver.trailer) ? selectedDriver.trailer[0] : selectedDriver.trailer;

    setAssigningLoadId(load.id);
    try {
      const response = await fetch('/api/live-fleet/assign-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadId: load.id,
          driverId: selectedDriver.driver_id,
          truckId: truck?.id,
          trailerId: trailer?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign');
      }

      toast({
        title: 'Load assigned!',
        description: `${load.load_number} assigned to ${driver?.first_name} ${driver?.last_name}`,
      });

      // Remove from list
      setUnassignedLoads((prev) => prev.filter((l) => l.id !== load.id));
    } catch (error) {
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Could not assign load',
        variant: 'destructive',
      });
    } finally {
      setAssigningLoadId(null);
    }
  };

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    if (filters.availableOnly && !location.is_available_for_loads) return false;
    const minCap = filters.minCapacity ? Number(filters.minCapacity) : undefined;
    if (minCap !== undefined && !Number.isNaN(minCap) && (location.available_cubic ?? 0) < minCap) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Live Fleet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time driver locations and capacity • Auto-updates every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(lastUpdated.toISOString())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshLocations(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drivers Reporting</p>
                <p className="text-2xl font-bold">{stats.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Truck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available for Loads</p>
                <p className="text-2xl font-bold">{stats.availableDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Package className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Available Capacity</p>
                <p className="text-2xl font-bold">{stats.averageCapacity} cuft</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={filters.availableOnly}
                onChange={(e) => setFilters((f) => ({ ...f, availableOnly: e.target.checked }))}
              />
              <span>Available only</span>
            </label>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="minCapacity">Min capacity (cuft)</label>
              <input
                id="minCapacity"
                type="number"
                min="0"
                value={filters.minCapacity}
                onChange={(e) => setFilters((f) => ({ ...f, minCapacity: e.target.value }))}
                placeholder="0"
                className="w-24 px-3 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver Cards */}
      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No drivers match your filters.</p>
            <p className="text-sm">Have drivers send location pings from the mobile app.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => {
            const driver = Array.isArray(location.driver) ? location.driver[0] : location.driver;
            const truck = Array.isArray(location.truck) ? location.truck[0] : location.truck;
            const trailer = Array.isArray(location.trailer) ? location.trailer[0] : location.trailer;

            return (
              <Card key={location.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown Driver'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {driver?.status || 'No status'}
                      </p>
                    </div>
                    <Badge variant={location.is_available_for_loads ? 'default' : 'secondary'}>
                      {location.is_available_for_loads ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatRelativeTime(location.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {location.speed_kph !== null ? `${Math.round(location.speed_kph * 0.621)} mph` : '—'}
                        {' '}
                        {getHeadingDirection(location.heading_deg)}
                      </span>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div className="flex flex-wrap gap-2">
                    {truck && (
                      <Badge variant="outline" className="text-xs">
                        <Truck className="h-3 w-3 mr-1" />
                        {truck.unit_number}
                      </Badge>
                    )}
                    {trailer && (
                      <Badge variant="outline" className="text-xs">
                        Trailer {trailer.unit_number}
                      </Badge>
                    )}
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Capacity</span>
                    <span className="font-medium">{formatCapacity(location)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => openAssignmentModal(location)}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Assign Load
                    </Button>
                    {location.latitude && location.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign Load to{' '}
              {selectedDriver &&
                (Array.isArray(selectedDriver.driver)
                  ? `${selectedDriver.driver[0]?.first_name} ${selectedDriver.driver[0]?.last_name}`
                  : `${selectedDriver.driver?.first_name} ${selectedDriver.driver?.last_name}`)}
            </DialogTitle>
            <DialogDescription>
              Select a load to assign to this driver. The driver will receive the assignment immediately.
            </DialogDescription>
          </DialogHeader>

          {isLoadingLoads ? (
            <div className="py-8 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
              Loading available loads...
            </div>
          ) : unassignedLoads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No unassigned loads available</p>
              <Link href="/dashboard/loads/new" className="text-primary hover:underline text-sm">
                Create a new load
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {unassignedLoads.map((load) => {
                const company = Array.isArray(load.company) ? load.company[0] : load.company;
                const cuft = load.cubic_feet || load.cubic_feet_estimate;

                return (
                  <div
                    key={load.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{load.load_number}</span>
                        {company && (
                          <Badge variant="outline" className="text-xs">
                            {company.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {load.pickup_date && (
                          <span>
                            Pickup: {new Date(load.pickup_date).toLocaleDateString()}
                          </span>
                        )}
                        {cuft && <span>{cuft} cuft</span>}
                        {load.linehaul_rate && <span>${load.linehaul_rate.toLocaleString()}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => assignLoadToDriver(load)}
                      disabled={assigningLoadId === load.id}
                    >
                      {assigningLoadId === load.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Assign
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

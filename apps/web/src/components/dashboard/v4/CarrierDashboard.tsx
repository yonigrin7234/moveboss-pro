'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Truck,
  DollarSign,
  Search,
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface AssignedLoad {
  id: string;
  load_number: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  load_status: string;
  carrier_rate: number | null;
  assigned_driver_name: string | null;
  source_company_name: string | null;
}

interface DriverStatus {
  id: string;
  name: string;
  status: 'available' | 'on_trip' | 'off_duty';
  current_location?: string;
  current_trip_id?: string;
}

interface AvailableLoad {
  id: string;
  load_number: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  estimated_cuft: number | null;
}

interface CarrierDashboardProps {
  assignedLoads: AssignedLoad[];
  drivers: DriverStatus[];
  availableLoads: AvailableLoad[];
  metrics: {
    activeLoadsCount: number;
    driversOnRoad: number;
    totalDrivers: number;
    earningsThisWeek: number;
    earningsThisMonth: number;
    pendingRequestsCount: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Needs Confirm', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle },
  accepted: { label: 'Ready to Load', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  loading: { label: 'Loading', color: 'bg-amber-500/20 text-amber-400', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function CarrierDashboard({
  assignedLoads,
  drivers,
  availableLoads,
  metrics,
}: CarrierDashboardProps) {
  const driversOnRoad = drivers.filter(d => d.status === 'on_trip');
  const driversAvailable = drivers.filter(d => d.status === 'available');

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* HEADER + QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Carrier Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/load-board">
                <Search className="h-4 w-4 mr-1" />
                Find Loads
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/my-requests">
                <Clock className="h-4 w-4 mr-1" />
                My Requests
                {metrics.pendingRequestsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {metrics.pendingRequestsCount}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>

        {/* DRIVERS NOW - Hero section */}
        <Card className="mb-6 border-border/50 bg-gradient-to-r from-card to-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-foreground">Drivers Now</h2>
                <span className="text-xs text-muted-foreground">
                  {metrics.driversOnRoad} / {metrics.totalDrivers} on road
                </span>
              </div>
              <Link href="/dashboard/drivers" className="text-xs text-primary hover:underline flex items-center gap-1">
                All drivers <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {drivers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No drivers added yet</p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/dashboard/drivers/new">Add Driver</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {drivers.slice(0, 8).map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{driver.name}</p>
                      <p className={`text-xs ${driver.status === 'on_trip' ? 'text-purple-400' : driver.status === 'available' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {driver.status === 'on_trip' ? 'On Trip' : driver.status === 'available' ? 'Available' : 'Off Duty'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PRIMARY METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link href="/dashboard/assigned-loads">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Loads</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.activeLoadsCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.earningsThisWeek)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.earningsThisMonth)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/dashboard/load-board">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Available</p>
                    <p className="text-2xl font-bold text-foreground">{availableLoads.length}+</p>
                    <p className="text-xs text-muted-foreground">loads</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Search className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ACTIVE LOADS - 2/3 width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-400" />
                    Active Loads
                  </CardTitle>
                  <Link href="/dashboard/assigned-loads" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignedLoads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active loads</p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/dashboard/load-board">
                        <Search className="h-4 w-4 mr-1" />
                        Find Loads
                      </Link>
                    </Button>
                  </div>
                ) : (
                  assignedLoads.slice(0, 5).map((load) => {
                    const status = statusConfig[load.load_status] || statusConfig.pending;
                    return (
                      <Link
                        key={load.id}
                        href={`/dashboard/assigned-loads/${load.id}`}
                        className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{load.load_number}</span>
                              <Badge className={status.color}>{status.label}</Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(load.pickup_date).toLocaleDateString()}
                              </span>
                              {load.assigned_driver_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {load.assigned_driver_name}
                                </span>
                              )}
                            </div>
                          </div>
                          {load.carrier_rate && (
                            <span className="text-sm font-medium text-emerald-400">
                              ${load.carrier_rate.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Available Loads */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Search className="h-4 w-4 text-amber-400" />
                    Available Loads
                  </CardTitle>
                  <Link href="/dashboard/load-board" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Browse all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableLoads.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No loads available</p>
                  </div>
                ) : (
                  availableLoads.slice(0, 5).map((load) => (
                    <Link
                      key={load.id}
                      href={`/dashboard/load-board/${load.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{load.load_number}</span>
                        {load.estimated_cuft && (
                          <span className="text-xs text-muted-foreground">
                            {load.estimated_cuft} cuft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {load.origin_city} → {load.destination_city}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(load.pickup_date).toLocaleDateString()}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

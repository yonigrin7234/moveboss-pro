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
  Clock,
  CheckCircle,
  AlertCircle,
  Navigation,
} from 'lucide-react';

interface CurrentLoad {
  id: string;
  load_number: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  delivery_date: string | null;
  load_status: string;
  carrier_rate: number | null;
  source_company_name: string | null;
  estimated_cuft: number | null;
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

interface ScheduleEvent {
  id: string;
  type: 'pickup' | 'delivery';
  load_number: string;
  city: string;
  state: string;
  time: string;
}

interface OwnerOperatorDashboardProps {
  currentLoad: CurrentLoad | null;
  upcomingLoads: CurrentLoad[];
  availableLoads: AvailableLoad[];
  todaysSchedule: ScheduleEvent[];
  metrics: {
    earningsThisWeek: number;
    earningsThisMonth: number;
    completedLoadsThisMonth: number;
    moneyOwedToYou: number;
    moneyYouOwe: number;
    collectedToday: number;
    pendingRequestsCount: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  pending: { label: 'Needs Confirm', color: 'bg-yellow-500/20 text-yellow-400', description: 'Confirm this load to proceed' },
  accepted: { label: 'Ready to Load', color: 'bg-blue-500/20 text-blue-400', description: 'Head to pickup location' },
  loading: { label: 'Loading', color: 'bg-amber-500/20 text-amber-400', description: 'Currently loading' },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400', description: 'On the road' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400', description: 'Delivery complete' },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function OwnerOperatorDashboard({
  currentLoad,
  upcomingLoads,
  availableLoads,
  todaysSchedule,
  metrics,
}: OwnerOperatorDashboardProps) {
  const status = currentLoad ? (statusConfig[currentLoad.load_status] || statusConfig.pending) : null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">My Dashboard</h1>
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
          </div>
        </div>

        {/* CURRENT LOAD - Hero Card */}
        {currentLoad ? (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-card to-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Load</p>
                  <h2 className="text-lg font-semibold">{currentLoad.load_number}</h2>
                  {currentLoad.source_company_name && (
                    <p className="text-sm text-muted-foreground">From: {currentLoad.source_company_name}</p>
                  )}
                </div>
                <Badge className={status?.color}>{status?.label}</Badge>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                  <p className="font-medium">{currentLoad.origin_city}, {currentLoad.origin_state}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(currentLoad.pickup_date).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 p-3 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                  <p className="font-medium">{currentLoad.destination_city}, {currentLoad.destination_state}</p>
                  {currentLoad.delivery_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(currentLoad.delivery_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {currentLoad.estimated_cuft && (
                    <span>{currentLoad.estimated_cuft} cuft</span>
                  )}
                  {currentLoad.carrier_rate && (
                    <span className="text-emerald-400 font-medium">
                      ${currentLoad.carrier_rate.toLocaleString()}
                    </span>
                  )}
                </div>
                <Button asChild size="sm">
                  <Link href={`/dashboard/assigned-loads/${currentLoad.id}`}>
                    <Navigation className="h-4 w-4 mr-1" />
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-dashed">
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">No Current Load</h3>
              <p className="text-sm text-muted-foreground mb-4">Find your next haul on the load board</p>
              <Button asChild>
                <Link href="/dashboard/load-board">
                  <Search className="h-4 w-4 mr-1" />
                  Browse Available Loads
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* EARNINGS & FINANCIAL */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(metrics.earningsThisWeek)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(metrics.earningsThisMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Loads</p>
              <p className="text-xl font-bold text-foreground">{metrics.completedLoadsThisMonth}</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>
        </div>

        {/* FINANCIAL STATUS */}
        {(metrics.moneyOwedToYou > 0 || metrics.moneyYouOwe > 0 || metrics.collectedToday > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Link href="/dashboard/finance/receivables">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Owed to You</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(metrics.moneyOwedToYou)}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/finance/payables">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">You Owe</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(metrics.moneyYouOwe)}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/finance/receivables">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Collected Today</p>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(metrics.collectedToday)}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* TODAY'S SCHEDULE */}
        {todaysSchedule.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaysSchedule.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/assigned-loads/${event.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        event.type === 'pickup' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                      }`}>
                        {event.type === 'pickup' ? (
                          <Package className="h-4 w-4 text-blue-400" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {event.type === 'pickup' ? 'Pickup' : 'Delivery'} - {event.load_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.city}, {event.state}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* UPCOMING LOADS */}
        {upcomingLoads.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                Upcoming Loads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingLoads.map((load) => {
                const loadStatus = statusConfig[load.load_status] || statusConfig.pending;
                return (
                  <Link
                    key={load.id}
                    href={`/dashboard/assigned-loads/${load.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{load.load_number}</span>
                          <Badge className={loadStatus.color} variant="outline">
                            {loadStatus.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {load.origin_city} → {load.destination_city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(load.pickup_date).toLocaleDateString()}
                        </p>
                        {load.carrier_rate && (
                          <p className="text-sm text-emerald-400">${load.carrier_rate.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* FIND MORE LOADS */}
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
                <p className="text-sm">No loads available right now</p>
              </div>
            ) : (
              availableLoads.slice(0, 4).map((load) => (
                <Link
                  key={load.id}
                  href={`/dashboard/load-board/${load.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{load.load_number}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(load.pickup_date).toLocaleDateString()}
                      </p>
                      {load.estimated_cuft && (
                        <p className="text-xs text-muted-foreground">{load.estimated_cuft} cuft</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* PENDING REQUESTS NOTICE */}
        {metrics.pendingRequestsCount > 0 && (
          <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <Link href="/dashboard/my-requests" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Pending Requests</p>
                    <p className="text-xs text-muted-foreground">
                      You have {metrics.pendingRequestsCount} request{metrics.pendingRequestsCount > 1 ? 's' : ''} awaiting response
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

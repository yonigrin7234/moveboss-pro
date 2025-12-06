'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Users,
  Truck,
  ArrowRight,
  Plus,
  Search,
  Clock,
  CheckCircle,
  MapPin,
} from 'lucide-react';

interface LoadPosted {
  id: string;
  load_number: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  status: string;
  request_count: number;
}

interface PendingRequest {
  id: string;
  load_id: string;
  load_number: string;
  carrier_name: string;
  requested_at: string;
  origin_city: string;
  destination_city: string;
}

interface LoadInTransit {
  id: string;
  load_number: string;
  carrier_name: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  load_status: string;
  pickup_date: string;
}

interface BrokerDashboardProps {
  loadsPosted: LoadPosted[];
  pendingRequests: PendingRequest[];
  loadsInTransit: LoadInTransit[];
  metrics: {
    totalLoadsPosted: number;
    pendingRequestCount: number;
    loadsInTransitCount: number;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Posted', color: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Assigned', color: 'bg-emerald-500/20 text-emerald-400' },
  loading: { label: 'Loading', color: 'bg-amber-500/20 text-amber-400' },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400' },
};

export function BrokerDashboard({
  loadsPosted,
  pendingRequests,
  loadsInTransit,
  metrics,
}: BrokerDashboardProps) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* HEADER + QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Broker Dashboard</h1>
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
              <Link href="/dashboard/post-pickup">
                <Plus className="h-4 w-4 mr-1" />
                Post Load
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/marketplace-capacity">
                <Search className="h-4 w-4 mr-1" />
                Find Truck
              </Link>
            </Button>
          </div>
        </div>

        {/* PRIMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Link href="/dashboard/posted-jobs">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Loads Posted</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.totalLoadsPosted}</p>
                    <p className="text-xs text-muted-foreground">active listings</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/carrier-requests">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Requests</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.pendingRequestCount}</p>
                    <p className="text-xs text-muted-foreground">awaiting review</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${metrics.pendingRequestCount > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                    <Users className={`h-5 w-5 ${metrics.pendingRequestCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/loads-given-out">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">In Transit</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.loadsInTransitCount}</p>
                    <p className="text-xs text-muted-foreground">with carriers</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PENDING REQUESTS */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  Carrier Requests
                </CardTitle>
                <Link href="/dashboard/carrier-requests" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending requests</p>
                </div>
              ) : (
                pendingRequests.slice(0, 5).map((request) => (
                  <Link
                    key={request.id}
                    href={`/dashboard/carrier-requests?load=${request.load_id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{request.carrier_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.load_number} • {request.origin_city} → {request.destination_city}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                        Review
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* LOADS IN TRANSIT */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  Loads In Transit
                </CardTitle>
                <Link href="/dashboard/loads-given-out" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadsInTransit.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No loads in transit</p>
                </div>
              ) : (
                loadsInTransit.slice(0, 5).map((load) => {
                  const status = statusConfig[load.load_status] || statusConfig.pending;
                  return (
                    <Link
                      key={load.id}
                      href={`/dashboard/posted-jobs/${load.id}`}
                      className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{load.load_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {load.carrier_name} • {load.origin_city} → {load.destination_city}
                          </p>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* LOADS POSTED */}
        <Card className="mt-5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                Active Listings
              </CardTitle>
              <Link href="/dashboard/posted-jobs" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadsPosted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active listings</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/dashboard/post-pickup">
                    <Plus className="h-4 w-4 mr-1" />
                    Post Your First Load
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loadsPosted.slice(0, 6).map((load) => (
                  <Link
                    key={load.id}
                    href={`/dashboard/posted-jobs/${load.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm">{load.load_number}</span>
                      {load.request_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {load.request_count} request{load.request_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(load.pickup_date).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

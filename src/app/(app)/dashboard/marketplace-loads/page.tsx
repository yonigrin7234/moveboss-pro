import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCarrierMarketplaceLoads, getCarrierMarketplaceLoadCounts } from '@/data/marketplace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  Package,
  Truck,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  CheckCircle,
} from 'lucide-react';
import type { CarrierMarketplaceLoad } from '@/data/marketplace';

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'TBD';
  const startDate = new Date(start);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (!end || end === start) return startStr;

  const endDate = new Date(end);
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function formatRate(rate: number | null, rateType: string, cuft: number | null): string {
  if (!rate) return 'TBD';
  const total = cuft ? rate * cuft : null;
  if (rateType === 'per_cuft') {
    return total ? `$${rate.toFixed(2)}/cf ($${total.toLocaleString()})` : `$${rate.toFixed(2)}/cf`;
  }
  return `$${rate.toLocaleString()}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'unassigned':
      return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">Unassigned</Badge>;
    case 'assigned_to_driver':
      return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">Assigned</Badge>;
    case 'en_route_to_pickup':
    case 'at_pickup':
    case 'loading':
      return <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-0">Loading</Badge>;
    case 'loaded':
    case 'in_transit':
      return <Badge className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-0">In Transit</Badge>;
    case 'at_delivery':
    case 'delivered':
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">Delivered</Badge>;
    case 'completed':
      return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function LoadCard({ load }: { load: CarrierMarketplaceLoad }) {
  const isPickup = load.posting_type === 'pickup';

  return (
    <Link href={`/dashboard/marketplace-loads/${load.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Badge Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                  FROM MARKETPLACE
                </Badge>
                {isPickup ? (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                    PICKUP
                  </Badge>
                ) : load.load_subtype === 'rfd' ? (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                    RFD
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                    LIVE LOAD
                  </Badge>
                )}
                {getStatusBadge(load.operational_status)}
                {load.truck_requirement === 'semi_only' && (
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-0">
                    🚛 Semi Only
                  </Badge>
                )}
                {load.truck_requirement === 'box_truck_only' && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    📦 Box Truck Only
                  </Badge>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>{load.origin_city}, {load.origin_state}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>{load.destination_city}, {load.destination_state}</span>
              </div>

              {/* Details Row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {load.estimated_cuft?.toLocaleString() || '?'} CF
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatRate(load.carrier_rate, load.carrier_rate_type, load.estimated_cuft)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Load: {formatDateRange(load.proposed_load_date_start, load.proposed_load_date_end)}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {load.source_company_name}
                </span>
              </div>

              {/* Status Info */}
              {load.trip_id ? (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Assigned to Trip #{load.trip?.trip_number}
                  {load.trip?.driver && (
                    <span> (Driver: {load.trip.driver.first_name} {load.trip.driver.last_name})</span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Not assigned to a trip yet
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 text-right">
              <Button variant="outline" size="sm" asChild>
                <span>View Details</span>
              </Button>
              {!load.trip_id && (
                <Button size="sm" asChild>
                  <span>Assign to Trip</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MarketplaceLoadsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const currentTab = params.tab || 'all';

  const [loads, counts] = await Promise.all([
    getCarrierMarketplaceLoads(user.id),
    getCarrierMarketplaceLoadCounts(user.id),
  ]);

  // Filter loads based on tab
  const filteredLoads = currentTab === 'unassigned'
    ? loads.filter(l => !l.trip_id)
    : currentTab === 'assigned'
    ? loads.filter(l => l.trip_id)
    : loads;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace Loads</h1>
        <p className="text-muted-foreground">
          Loads assigned to you from the marketplace. Assign them to trips and track delivery.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={currentTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/marketplace-loads?tab=all">
              All ({counts.total})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="unassigned" asChild>
            <Link href="/dashboard/marketplace-loads?tab=unassigned">
              Unassigned ({counts.unassigned})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="assigned" asChild>
            <Link href="/dashboard/marketplace-loads?tab=assigned">
              Assigned ({counts.assigned})
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-4 space-y-4">
          {filteredLoads.length > 0 ? (
            filteredLoads.map((load) => (
              <LoadCard key={load.id} load={load} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">
                  {currentTab === 'unassigned'
                    ? 'No unassigned loads'
                    : currentTab === 'assigned'
                    ? 'No loads assigned to trips yet'
                    : 'No marketplace loads'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {currentTab === 'all'
                    ? 'Request loads from the load board to get started.'
                    : currentTab === 'unassigned'
                    ? 'All your marketplace loads have been assigned to trips.'
                    : 'Assign your marketplace loads to trips to track them here.'}
                </p>
                <Button asChild>
                  <Link href="/dashboard/load-board">Browse Load Board</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      {counts.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.total}</p>
                <p className="text-sm text-muted-foreground">Total Marketplace Loads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.unassigned}</p>
                <p className="text-sm text-muted-foreground">Need Trip Assignment</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.assigned}</p>
                <p className="text-sm text-muted-foreground">Assigned to Trips</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

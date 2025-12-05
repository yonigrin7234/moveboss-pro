import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getLoadsGivenOut } from '@/data/marketplace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Truck,
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting Confirmation', color: 'bg-yellow-500/20 text-yellow-400' },
  accepted: { label: 'Ready to Load', color: 'bg-blue-500/20 text-blue-400' },
  loading: { label: 'Loading', color: 'bg-yellow-500/20 text-yellow-400' },
  loaded: { label: 'Loaded', color: 'bg-orange-500/20 text-orange-400' },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400' },
};

export default async function LoadsGivenOutPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const loads = await getLoadsGivenOut(user.id);

  // Separate by confirmation status
  const needsConfirmation = loads.filter((l) => !l.carrier_confirmed_at);
  const confirmedLoads = loads.filter((l) => l.carrier_confirmed_at);

  // Group confirmed loads by status
  const activeLoads = confirmedLoads.filter(
    (l) => !['delivered', 'cancelled'].includes(l.load_status)
  );
  const completedLoads = confirmedLoads.filter(
    (l) => l.load_status === 'delivered'
  );

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loads Given Out</h1>
          <p className="text-muted-foreground">
            Loads you&apos;ve assigned to external carriers
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/carrier-requests">
            <Package className="h-4 w-4 mr-2" />
            View Requests
          </Link>
        </Button>
      </div>

      {/* Needs Confirmation */}
      {needsConfirmation.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Awaiting Carrier Confirmation ({needsConfirmation.length})
          </h2>

          <div className="space-y-2">
            {needsConfirmation.map((load) => {
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;

              return (
                <Link key={load.id} href={`/dashboard/posted-jobs/${load.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-yellow-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>{load.carrier?.name || 'Unknown Carrier'}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {load.estimated_cuft} CUFT
                            </span>
                            {load.carrier_rate && (
                              <span className="text-green-500 font-medium">
                                ${load.carrier_rate.toFixed(2)}/cf
                                {totalValue && ` = $${totalValue.toLocaleString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Loads */}
      {activeLoads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            Active ({activeLoads.length})
          </h2>

          <div className="space-y-2">
            {activeLoads.map((load) => {
              const status =
                statusConfig[load.load_status] || statusConfig.accepted;
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;

              return (
                <Link key={load.id} href={`/dashboard/posted-jobs/${load.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>{load.carrier?.name || 'Unknown Carrier'}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {load.estimated_cuft} CUFT
                            </span>
                            {load.expected_load_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(load.expected_load_date).toLocaleDateString()}
                              </span>
                            )}
                            {totalValue && (
                              <span className="text-green-500 font-medium">
                                ${totalValue.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Loads */}
      {completedLoads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completed ({completedLoads.length})
          </h2>

          <div className="space-y-2">
            {completedLoads.slice(0, 5).map((load) => {
              const totalValue =
                load.carrier_rate && load.estimated_cuft
                  ? load.carrier_rate * load.estimated_cuft
                  : null;

              return (
                <Link key={load.id} href={`/dashboard/posted-jobs/${load.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span>{load.carrier?.name || 'Unknown Carrier'}</span>
                            <span>-</span>
                            <span>{load.load_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500/20 text-green-400">
                            Delivered
                          </Badge>
                          {totalValue && (
                            <p className="text-sm text-green-500 font-medium mt-1">
                              ${totalValue.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {loads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No loads given out</h3>
            <p className="text-muted-foreground mb-4">
              When you assign loads to carriers, they&apos;ll appear here
            </p>
            <Button asChild>
              <Link href="/dashboard/carrier-requests">
                <Package className="h-4 w-4 mr-2" />
                View Carrier Requests
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

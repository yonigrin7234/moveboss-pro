import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCompanyLoadsWithRequests } from '@/data/company-portal';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';

async function getCompanySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('company_session');
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export default async function CompanyRequestsPage() {
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const loads = await getCompanyLoadsWithRequests(session.company_id);

  // Filter to loads with pending requests or on marketplace
  const loadsWithRequests = loads.filter((l) => l.pending_request_count > 0);
  const marketplaceLoads = loads.filter(
    (l) => l.is_marketplace_visible && !l.assigned_carrier_id
  );
  const assignedLoads = loads.filter((l) => l.assigned_carrier_id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-semibold">Load Requests</h1>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Loads with Pending Requests */}
        {loadsWithRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Requests (
              {loadsWithRequests.reduce(
                (sum, l) => sum + l.pending_request_count,
                0
              )}
              )
            </h2>

            <div className="space-y-2">
              {loadsWithRequests.map((load) => (
                <Link key={load.id} href={`/company/loads/${load.id}/requests`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-yellow-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}{' '}
                              {load.origin_zip}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}{' '}
                              {load.destination_zip}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {load.load_number} • {load.estimated_cuft} CUFT
                            {load.company_rate && ` • $${load.company_rate}/cf`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            <Users className="h-3 w-3 mr-1" />
                            {load.pending_request_count} request
                            {load.pending_request_count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* On Marketplace (no requests yet) */}
        {marketplaceLoads.filter((l) => l.pending_request_count === 0).length >
          0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              On Marketplace (Waiting for Requests)
            </h2>

            <div className="space-y-2">
              {marketplaceLoads
                .filter((l) => l.pending_request_count === 0)
                .map((load) => (
                  <Link key={load.id} href={`/company/loads/${load.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">
                                {load.origin_city}, {load.origin_state}{' '}
                                {load.origin_zip}
                              </p>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <p className="font-semibold">
                                {load.destination_city}, {load.destination_state}{' '}
                                {load.destination_zip}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {load.load_number} • {load.estimated_cuft} CUFT
                            </p>
                          </div>
                          <Badge variant="outline">On Marketplace</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Already Assigned */}
        {assignedLoads.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Assigned to Carrier
            </h2>

            <div className="space-y-2">
              {assignedLoads.slice(0, 5).map((load) => (
                <Link key={load.id} href={`/company/loads/${load.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              {load.origin_city}, {load.origin_state}
                            </p>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {load.destination_city}, {load.destination_state}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {load.load_number} • {load.carrier?.name}
                          </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                          Assigned
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {loads.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loads posted</h3>
              <p className="text-muted-foreground mb-4">
                Post a load to the marketplace to receive requests from carriers
              </p>
              <Button asChild>
                <Link href="/company/loads/new">Post a Load</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

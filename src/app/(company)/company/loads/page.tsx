import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCompanyLoads } from '@/data/company-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Filter,
  User,
  Phone,
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-gray-500/20 text-gray-400',
    icon: <Clock className="h-3 w-3" />,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-blue-500/20 text-blue-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  loading: {
    label: 'Loading',
    color: 'bg-yellow-500/20 text-yellow-400',
    icon: <Package className="h-3 w-3" />,
  },
  loaded: {
    label: 'Loaded',
    color: 'bg-orange-500/20 text-orange-400',
    icon: <Truck className="h-3 w-3" />,
  },
  in_transit: {
    label: 'In Transit',
    color: 'bg-purple-500/20 text-purple-400',
    icon: <Truck className="h-3 w-3" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

export default async function CompanyLoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getCompanySession();
  const params = await searchParams;

  if (!session) {
    redirect('/company-login');
  }

  const statusFilter = params.status || 'all';
  const loads = await getCompanyLoads(session.company_id, statusFilter);

  const filterOptions = [
    { value: 'all', label: 'All Loads' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/company/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-semibold">All Loads</h1>
          </div>
          <Button asChild size="sm">
            <Link href="/company/loads/new">
              <Plus className="h-4 w-4 mr-1" />
              Post Load
            </Link>
          </Button>
        </div>
      </header>

      <main className="container py-6 max-w-3xl space-y-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link
                href={
                  opt.value === 'all'
                    ? '/company/loads'
                    : `/company/loads?status=${opt.value}`
                }
              >
                {opt.label}
              </Link>
            </Button>
          ))}
        </div>

        {/* Loads List */}
        {loads.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {statusFilter === 'all' ? 'All Loads' : filterOptions.find(f => f.value === statusFilter)?.label}
                <span className="text-muted-foreground font-normal">({loads.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loads.map((load) => {
                  const carrier = load.carrier as { id: string; name: string } | null;
                  const status = statusConfig[load.load_status as string] || statusConfig.pending;

                  return (
                    <Link
                      key={load.id}
                      href={`/company/loads/${load.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{load.load_number}</span>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {load.origin_city}, {load.origin_state} → {load.destination_city},{' '}
                          {load.destination_state}
                        </p>
                        {carrier && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {carrier.name}
                            </p>
                            {load.assigned_driver_name ? (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {load.assigned_driver_name}
                                {load.assigned_driver_phone && (
                                  <span className="flex items-center gap-0.5 text-blue-500">
                                    <Phone className="h-2.5 w-2.5" />
                                    {load.assigned_driver_phone}
                                  </span>
                                )}
                              </p>
                            ) : load.assigned_carrier_id ? (
                              <p className="text-xs text-yellow-500 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Driver TBD
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {load.estimated_cuft && (
                          <p className="text-sm">{load.estimated_cuft} CUFT</p>
                        )}
                        <p className="text-sm text-green-500">
                          ${(load.total_revenue as number || 0).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No Loads Found</h2>
              <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                {statusFilter === 'all'
                  ? "You haven't posted any loads yet."
                  : `No loads with status "${statusFilter}".`}
              </p>
              <Button asChild>
                <Link href="/company/loads/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Load
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompanyDashboardStats,
  getCompanyLoadsByStatusGroups,
  getCompanyPaymentSummary,
  getCompanyPendingRequestsCount,
} from '@/data/company-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  LogOut,
  Building2,
  Bell,
  Users,
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

export default async function CompanyDashboardPage() {
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const [stats, loadGroups, payments, pendingRequestsCount] = await Promise.all([
    getCompanyDashboardStats(session.company_id),
    getCompanyLoadsByStatusGroups(session.company_id),
    getCompanyPaymentSummary(session.company_id),
    getCompanyPendingRequestsCount(session.company_id),
  ]);

  async function logoutAction() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('company_session');
    redirect('/company-login');
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-500/20 text-gray-400',
    accepted: 'bg-blue-500/20 text-blue-400',
    loading: 'bg-yellow-500/20 text-yellow-400',
    loaded: 'bg-orange-500/20 text-orange-400',
    in_transit: 'bg-purple-500/20 text-purple-400',
    delivered: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">{session.company_name}</p>
              <p className="text-xs text-muted-foreground">Dispatch Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/company/loads/new">
                <Plus className="h-4 w-4 mr-2" />
                Post Load
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{loadGroups.pending.length}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{loadGroups.assigned.length}</p>
              <p className="text-xs text-muted-foreground">With Carrier</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-500">
                {loadGroups.in_transit.length}
              </p>
              <p className="text-xs text-muted-foreground">In Transit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-500">
                {loadGroups.delivered.length}
              </p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">
                ${payments.total_owed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Owed to Carriers</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Carrier Requests Alert */}
        {pendingRequestsCount > 0 && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {pendingRequestsCount} Carrier Request
                      {pendingRequestsCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Carriers want to haul your loads
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/company/requests">View Requests</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unassigned Loads - Need Attention */}
        {loadGroups.pending.length > 0 && (
          <Card className="border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Needs Carrier ({loadGroups.pending.length})
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/company/loads?status=pending">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loadGroups.pending.slice(0, 3).map((load) => (
                  <Link
                    key={load.id as string}
                    href={`/company/loads/${load.id}`}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{load.load_number as string}</p>
                      <p className="text-sm text-muted-foreground">
                        {load.origin_city as string}, {load.origin_state as string} →{' '}
                        {load.destination_city as string}, {load.destination_state as string}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{load.estimated_cuft as number} CUFT</p>
                      <p className="text-sm text-muted-foreground">
                        ${((load.total_revenue as number) || 0).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* In Transit */}
        {loadGroups.in_transit.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-500" />
                In Transit ({loadGroups.in_transit.length})
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/company/loads?status=in_transit">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loadGroups.in_transit.slice(0, 3).map((load) => {
                  const carrier = load.carrier as { name: string } | null;
                  return (
                    <Link
                      key={load.id as string}
                      href={`/company/loads/${load.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{load.load_number as string}</p>
                          <Badge className={statusColors[load.load_status as string]}>
                            {(load.load_status as string).replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {carrier?.name}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        → {load.destination_city as string}, {load.destination_state as string}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recently Delivered */}
        {loadGroups.delivered.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Recently Delivered
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/company/loads?status=delivered">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loadGroups.delivered.slice(0, 3).map((load) => {
                  const carrier = load.carrier as { name: string } | null;
                  const deliveryPhotos = load.delivery_photos as string[] | null;
                  return (
                    <Link
                      key={load.id as string}
                      href={`/company/loads/${load.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{load.load_number as string}</p>
                        <p className="text-sm text-muted-foreground">
                          {carrier?.name} • {load.destination_city as string},{' '}
                          {load.destination_state as string}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {Boolean(load.delivery_signature_url) && (
                          <Badge variant="outline" className="text-xs">
                            Signed
                          </Badge>
                        )}
                        {deliveryPhotos && deliveryPhotos.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Photos
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/company/loads/new">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Post Load</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/company/loads">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">All Loads</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/company/carriers">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">My Carriers</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/company/requests">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">Requests</p>
                {pendingRequestsCount > 0 && (
                  <Badge className="mt-1 bg-blue-500/20 text-blue-400">
                    {pendingRequestsCount} pending
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

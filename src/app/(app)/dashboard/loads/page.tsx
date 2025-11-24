import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getLoadsForUser,
  getLoadStatsForUser,
  type Load,
  type LoadFilters,
  type LoadStatus,
} from '@/data/loads';
import { getCompaniesForUser, type Company } from '@/data/companies';
import { LoadListFilters } from './load-list-filters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatStatus(status: Load['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'assigned':
      return 'Assigned';
    case 'in_transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

function formatServiceType(serviceType: Load['service_type']): string {
  switch (serviceType) {
    case 'hhg_local':
      return 'HHG Local';
    case 'hhg_long_distance':
      return 'HHG Long Distance';
    case 'commercial':
      return 'Commercial';
    case 'storage_in':
      return 'Storage In';
    case 'storage_out':
      return 'Storage Out';
    case 'freight':
      return 'Freight';
    case 'other':
      return 'Other';
    default:
      return serviceType;
  }
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

interface LoadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    companyId?: string;
  }>;
}

const LOAD_STATUSES: readonly LoadStatus[] = ['pending', 'assigned', 'in_transit', 'delivered', 'canceled'] as const;
const isLoadStatus = (value: string | undefined): value is LoadStatus =>
  value !== undefined && (LOAD_STATUSES as readonly string[]).includes(value);

export default async function LoadsPage({ searchParams }: LoadsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;

  const filters: LoadFilters = {
    search: params.search,
    status: isLoadStatus(params.status) ? params.status : 'all',
    companyId: params.companyId,
  };

  let loads: Load[] = [];
  let companies: Company[] = [];
  let stats = { totalLoads: 0, pending: 0, inTransit: 0, delivered: 0 };
  let error: string | null = null;

  try {
    [loads, companies, stats] = await Promise.all([
      getLoadsForUser(user.id, filters),
      getCompaniesForUser(user.id),
      getLoadStatsForUser(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load loads';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Loads</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your loads and assignments</p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/loads/new">Add Load</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalLoads}</div>
            <p className="text-xs text-muted-foreground mt-1">All loads in your system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <LoadListFilters initialFilters={filters} companies={companies} />

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loads.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <p className="mb-4">No loads yet. Add your first load to begin.</p>
              <Button asChild>
                <Link href="/dashboard/loads/new">Add Load</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load Number</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loads.map((load) => {
                  const company = Array.isArray(load.company) ? load.company[0] : load.company;
                  return (
                  <TableRow key={load.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/loads/${load.id}`}
                        className="text-foreground hover:text-primary"
                      >
                        {load.load_number || load.job_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatServiceType(load.service_type)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {load.pickup_city && load.pickup_state
                          ? `${load.pickup_city}, ${load.pickup_state}`
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {load.delivery_city && load.delivery_state
                          ? `${load.delivery_city}, ${load.delivery_state}`
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {load.assigned_driver
                        ? `${load.assigned_driver.first_name} ${load.assigned_driver.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          load.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : load.status === 'canceled'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : load.status === 'in_transit'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : load.status === 'assigned'
                                  ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                  : 'bg-muted text-muted-foreground'
                        }
                      >
                        {formatStatus(load.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(load.total_rate)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/loads/${load.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCompanyById } from '@/data/companies';
import {
  getCompanyLedgerSummary,
  getLoadsFromCompany,
  getLoadsToCompany,
  getCompanyReceivables,
} from '@/data/company-ledger';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Calendar,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  FileText,
} from 'lucide-react';

interface CompanyLedgerPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRoute(load: {
  pickup_city: string | null;
  pickup_state: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
}): string {
  const origin =
    load.pickup_city && load.pickup_state
      ? `${load.pickup_city}, ${load.pickup_state}`
      : '-';
  const dest =
    load.dropoff_city && load.dropoff_state
      ? `${load.dropoff_city}, ${load.dropoff_state}`
      : load.delivery_city && load.delivery_state
        ? `${load.delivery_city}, ${load.delivery_state}`
        : '-';
  return `${origin} → ${dest}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'assigned':
      return <Badge className="bg-blue-500/10 text-blue-600 border-0">Assigned</Badge>;
    case 'in_transit':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-0">In Transit</Badge>;
    case 'delivered':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Delivered</Badge>;
    case 'canceled':
      return <Badge className="bg-red-500/10 text-red-600 border-0">Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getReceivableStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-0">Open</Badge>;
    case 'paid':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Paid</Badge>;
    case 'partial':
      return <Badge className="bg-blue-500/10 text-blue-600 border-0">Partial</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500/10 text-red-600 border-0">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function CompanyLedgerPage({ params }: CompanyLedgerPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const company = await getCompanyById(id, user.id);

  if (!company) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-foreground">Company Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The company you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link
              href="/dashboard/companies"
              className="text-foreground hover:text-primary underline"
            >
              Back to Companies
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all ledger data in parallel
  const [summary, loadsFrom, loadsTo, receivables] = await Promise.all([
    getCompanyLedgerSummary(id, user.id),
    getLoadsFromCompany(id, user.id, { limit: 50 }),
    getLoadsToCompany(id, user.id, { limit: 50 }),
    getCompanyReceivables(id, user.id, { limit: 50 }),
  ]);

  const netBalanceClass =
    summary.netBalance > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : summary.netBalance < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {company.name}
            </h1>
            <Badge variant="secondary">Ledger</Badge>
          </div>
          <p className="text-muted-foreground">
            Financial overview and transaction history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/companies/${id}`}>Company Details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/companies">All Companies</Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Loads From Them */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loads From Them</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.loadsFromThem.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.loadsFromThem.totalRevenue)} total revenue
            </p>
            {summary.loadsFromThem.totalOwed > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(summary.loadsFromThem.totalOwed)} owed to you
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loads To Them */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loads To Them</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.loadsToThem.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.loadsToThem.totalPaid)} total paid
            </p>
            {summary.loadsToThem.totalOwing > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(summary.loadsToThem.totalOwing)} you owe
              </p>
            )}
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalanceClass}`}>
              {formatCurrency(Math.abs(summary.netBalance))}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.netBalance > 0
                ? 'They owe you'
                : summary.netBalance < 0
                  ? 'You owe them'
                  : 'Balanced'}
            </p>
          </CardContent>
        </Card>

        {/* Last Payment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.lastPaymentAmount
                ? formatCurrency(summary.lastPaymentAmount)
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.lastPaymentDate
                ? formatDate(summary.lastPaymentDate)
                : 'No payments yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="from" className="space-y-4">
        <TabsList>
          <TabsTrigger value="from" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Loads From ({summary.loadsFromThem.count})
          </TabsTrigger>
          <TabsTrigger value="to" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Loads To ({summary.loadsToThem.count})
          </TabsTrigger>
          <TabsTrigger value="receivables" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Receivables ({receivables.length})
          </TabsTrigger>
        </TabsList>

        {/* Loads FROM this company (they gave us) */}
        <TabsContent value="from" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Loads Received From {company.name}
              </CardTitle>
              <CardDescription>
                Loads this company gave you to haul
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadsFrom.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No loads received from this company yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load #</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>CUFT</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">They Owe</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadsFrom.map((load) => (
                      <TableRow key={load.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/loads/${load.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {load.load_number || load.internal_reference || '-'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{getRoute(load)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(load.pickup_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {load.cubic_feet ?? '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(load.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {load.company_owes && load.company_owes > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatCurrency(load.company_owes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(load.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loads TO this company (we gave them) */}
        <TabsContent value="to" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-600" />
                Loads Given To {company.name}
              </CardTitle>
              <CardDescription>
                Loads you assigned to this company via marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadsTo.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No loads given to this company yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Load #</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>CUFT</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadsTo.map((load) => (
                      <TableRow key={load.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/loads/${load.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {load.load_number || load.internal_reference || '-'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{getRoute(load)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(load.pickup_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {load.cubic_feet ?? '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(load.linehaul_amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(load.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receivables */}
        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Receivables from {company.name}
              </CardTitle>
              <CardDescription>
                Outstanding invoices and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receivables.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No receivables from this company yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.map((receivable) => (
                      <TableRow key={receivable.id}>
                        <TableCell>
                          {receivable.trip_id ? (
                            <Link
                              href={`/dashboard/trips/${receivable.trip_id}`}
                              className="font-mono text-sm hover:underline"
                            >
                              {receivable.trip_number || receivable.trip_id.slice(0, 8)}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(receivable.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(receivable.due_date)}
                        </TableCell>
                        <TableCell>
                          {getReceivableStatusBadge(receivable.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(receivable.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

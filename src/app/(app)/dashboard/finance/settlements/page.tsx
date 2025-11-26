import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Receipt, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { listTripSettlements } from '@/data/settlements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: any }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  finalized: { label: 'Finalized', variant: 'default', icon: CheckCircle },
  final: { label: 'Finalized', variant: 'default', icon: CheckCircle },
  void: { label: 'Void', variant: 'outline', icon: XCircle },
};

export default async function SettlementsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let settlements: Awaited<ReturnType<typeof listTripSettlements>> = [];
  let error: string | null = null;

  try {
    settlements = await listTripSettlements({ ownerId: user.id, limit: 50 });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load settlements';
  }

  // Summary stats
  const totalRevenue = settlements.reduce((sum, s) => sum + s.total_revenue, 0);
  const totalProfit = settlements.reduce((sum, s) => sum + s.total_profit, 0);
  const draftCount = settlements.filter((s) => s.status === 'draft').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Settlements
          </h1>
          <p className="text-muted-foreground">
            View and manage trip settlements
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              From {settlements.length} settlements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalRevenue > 0
                ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin`
                : 'No revenue yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{draftCount}</p>
            <p className="text-xs text-muted-foreground">
              Awaiting finalization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Table */}
      <Card>
        <CardContent className="p-0">
          {settlements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No settlements yet</p>
              <p className="text-sm">Settlements will appear here after trips are settled</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Companies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => {
                    const config = statusConfig[settlement.status] || statusConfig.draft;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={settlement.id}>
                        <TableCell className="font-medium">
                          {settlement.trip_number || settlement.trip_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {settlement.driver_name || '—'}
                        </TableCell>
                        <TableCell>
                          {settlement.companies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {settlement.companies.slice(0, 2).map((name) => (
                                <Badge key={name} variant="outline" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                              {settlement.companies.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{settlement.companies.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(settlement.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              settlement.total_profit >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }
                          >
                            {formatCurrency(settlement.total_profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(settlement.created_at)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/trips/${settlement.trip_id}/settlement`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

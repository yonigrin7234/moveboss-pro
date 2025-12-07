import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Building2, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { listReceivables, type ReceivableListItem } from '@/data/settlements';
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
import { ReceivableActions } from './receivable-actions';

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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any }> = {
  open: { label: 'Open', variant: 'secondary', icon: Clock },
  partial: { label: 'Partial', variant: 'outline', icon: AlertCircle },
  paid: { label: 'Paid', variant: 'default', icon: CheckCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

export default async function ReceivablesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let receivables: ReceivableListItem[] = [];
  let error: string | null = null;

  try {
    receivables = await listReceivables({ ownerId: user.id });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load receivables';
  }

  // Summary stats
  const openReceivables = receivables.filter((r) => r.status === 'open');
  const paidReceivables = receivables.filter((r) => r.status === 'paid');
  const totalOpen = openReceivables.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = paidReceivables.reduce((sum, r) => sum + r.amount, 0);

  // Group by company
  const byCompany = new Map<string, { name: string; total: number; count: number }>();
  openReceivables.forEach((r) => {
    const key = r.company_id || 'unknown';
    const name = r.company_name || 'Unknown Company';
    const existing = byCompany.get(key) || { name, total: 0, count: 0 };
    existing.total += r.amount;
    existing.count += 1;
    byCompany.set(key, existing);
  });
  const companyList = Array.from(byCompany.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Receivables
        </h1>
        <p className="text-muted-foreground">
          Track money owed by companies
        </p>
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
              Open Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalOpen)}
            </p>
            <p className="text-xs text-muted-foreground">
              {openReceivables.length} invoices pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground">
              {paidReceivables.length} invoices paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Companies Owing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{byCompany.size}</p>
            <p className="text-xs text-muted-foreground">
              With open balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company Breakdown */}
      {companyList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Company</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open receivables grouped by company
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {companyList.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.count} invoice{company.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-amber-600">
                    {formatCurrency(company.total)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Receivables</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receivables.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No receivables yet</p>
              <p className="text-sm">Receivables will appear here after trips are settled</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Due Date</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((receivable) => {
                    const config = statusConfig[receivable.status] || statusConfig.open;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={receivable.id}>
                        <TableCell className="font-medium">
                          {receivable.company_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {receivable.trip_id ? (
                            <Link
                              href={`/dashboard/trips/${receivable.trip_id}`}
                              className="text-primary hover:underline"
                            >
                              {receivable.trip_number || 'View Trip'}
                            </Link>
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
                          {formatCurrency(receivable.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {receivable.due_date ? formatDate(receivable.due_date) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(receivable.created_at)}
                        </TableCell>
                        <TableCell>
                          <ReceivableActions
                            receivableId={receivable.id}
                            status={receivable.status}
                            amount={receivable.amount}
                            companyName={receivable.company_name}
                          />
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

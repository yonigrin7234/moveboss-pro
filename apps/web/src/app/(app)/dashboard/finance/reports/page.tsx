import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  Building2,
  User,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getFinanceSummary, listTripSettlements, listReceivables } from '@/data/settlements';
import { listTripExpenses } from '@/data/expenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let error: string | null = null;
  let summary30 = null;
  let summary90 = null;
  let settlements: Awaited<ReturnType<typeof listTripSettlements>> = [];
  let receivables: Awaited<ReturnType<typeof listReceivables>> = [];
  let expenses: Awaited<ReturnType<typeof listTripExpenses>> = [];

  try {
    [summary30, summary90, settlements, receivables, expenses] = await Promise.all([
      getFinanceSummary({ ownerId: user.id, periodDays: 30 }),
      getFinanceSummary({ ownerId: user.id, periodDays: 90 }),
      listTripSettlements({ ownerId: user.id, limit: 100 }),
      listReceivables({ ownerId: user.id }),
      listTripExpenses({ ownerId: user.id }),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load report data';
  }

  // Calculate metrics
  const totalTrips = settlements.length;
  const avgRevenuePerTrip = totalTrips > 0 ? summary90!.total_revenue / totalTrips : 0;
  const avgProfitPerTrip = totalTrips > 0 ? summary90!.total_profit / totalTrips : 0;
  const profitMargin = summary90?.total_revenue
    ? (summary90.total_profit / summary90.total_revenue) * 100
    : 0;

  // Driver performance
  const driverStats = new Map<
    string,
    { name: string; revenue: number; trips: number; profit: number }
  >();
  settlements.forEach((s) => {
    if (s.driver_name) {
      const existing = driverStats.get(s.driver_name) || {
        name: s.driver_name,
        revenue: 0,
        trips: 0,
        profit: 0,
      };
      existing.revenue += s.total_revenue;
      existing.trips += 1;
      existing.profit += s.total_profit;
      driverStats.set(s.driver_name, existing);
    }
  });
  const topDrivers = Array.from(driverStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Company performance
  const companyStats = new Map<string, { name: string; revenue: number; trips: number }>();
  settlements.forEach((s) => {
    s.companies.forEach((name) => {
      const existing = companyStats.get(name) || { name, revenue: 0, trips: 0 };
      existing.revenue += s.total_revenue / s.companies.length;
      existing.trips += 1;
      companyStats.set(name, existing);
    });
  });
  const topCompanies = Array.from(companyStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Expense breakdown
  const expenseByType = new Map<string, number>();
  expenses.forEach((e) => {
    const type = e.expense_type || 'other';
    expenseByType.set(type, (expenseByType.get(type) || 0) + e.amount);
  });
  const expenseBreakdown = Array.from(expenseByType.entries())
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Financial Reports
        </h1>
        <p className="text-muted-foreground">
          Analytics and insights for your fleet operations
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue (30d)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary30?.total_revenue || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              90-day: {formatCurrency(summary90?.total_revenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit Margin
            </CardTitle>
            {profitMargin >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary90?.total_profit || 0)} profit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Revenue/Trip
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(avgRevenuePerTrip)}</p>
            <p className="text-xs text-muted-foreground">
              Across {totalTrips} trips
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Profit/Trip
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${avgProfitPerTrip >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(avgProfitPerTrip)}
            </p>
            <p className="text-xs text-muted-foreground">
              Per trip average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver & Company Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Top Drivers by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDrivers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No driver data yet
              </p>
            ) : (
              <div className="space-y-3">
                {topDrivers.map((driver, index) => (
                  <div
                    key={driver.name}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {driver.trips} trip{driver.trips !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(driver.revenue)}</p>
                      <p className="text-xs text-emerald-600">
                        +{formatCurrency(driver.profit)} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Companies by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No company data yet
              </p>
            ) : (
              <div className="space-y-3">
                {topCompanies.map((company, index) => (
                  <div
                    key={company.name}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {company.trips} trip{company.trips !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{formatCurrency(company.revenue)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total expenses by category
          </p>
        </CardHeader>
        <CardContent>
          {expenseBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expense data yet
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {expenseBreakdown.map((item) => (
                <div key={item.type} className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground capitalize">
                    {item.type}
                  </p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receivables Aging (simplified) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Receivables Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Outstanding balances
            </p>
          </div>
          <Link
            href="/dashboard/finance/receivables"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {receivables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No receivables
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-xl font-bold text-amber-600 mt-1">
                  {formatCurrency(
                    receivables
                      .filter((r) => r.status === 'open')
                      .reduce((sum, r) => sum + r.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receivables.filter((r) => r.status === 'open').length} invoices
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(
                    receivables
                      .filter((r) => r.status === 'paid')
                      .reduce((sum, r) => sum + r.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receivables.filter((r) => r.status === 'paid').length} invoices
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Total Tracked</p>
                <p className="text-xl font-bold mt-1">
                  {formatCurrency(receivables.reduce((sum, r) => sum + r.amount, 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receivables.length} invoices
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  ArrowRight,
  Building2,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getFinanceSummary } from '@/data/settlements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function FinanceOverviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let summary = null;
  let error: string | null = null;

  try {
    summary = await getFinanceSummary({ ownerId: user.id, periodDays: 30 });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load finance data';
  }

  const statCards = summary
    ? [
        {
          label: 'Total Revenue',
          value: formatCurrency(summary.total_revenue),
          description: 'Last 30 days',
          icon: DollarSign,
          color: 'text-emerald-500',
        },
        {
          label: 'Net Profit',
          value: formatCurrency(summary.total_profit),
          description: 'After all expenses',
          icon: TrendingUp,
          color: 'text-blue-500',
        },
        {
          label: 'Driver Pay',
          value: formatCurrency(summary.total_driver_pay),
          description: 'Paid to drivers',
          icon: Wallet,
          color: 'text-purple-500',
        },
        {
          label: 'Open Receivables',
          value: formatCurrency(summary.open_receivables_amount),
          description: `${summary.open_receivables_count} invoices pending`,
          icon: Receipt,
          color: 'text-amber-500',
        },
      ]
    : [];

  const quickLinks = [
    {
      label: 'Settlements',
      description: 'View and manage trip settlements',
      href: '/dashboard/finance/settlements',
      icon: Receipt,
    },
    {
      label: 'Receivables',
      description: 'Track money owed by companies',
      href: '/dashboard/finance/receivables',
      icon: Wallet,
    },
    {
      label: 'Expenses',
      description: 'Review all trip expenses',
      href: '/dashboard/finance/expenses',
      icon: CreditCard,
    },
    {
      label: 'Reports',
      description: 'Financial reports and analytics',
      href: '/dashboard/finance/reports',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground">
          Track revenue, expenses, and receivables across your fleet
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error loading finance data: {error}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{link.label}</p>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Trips & Top Companies */}
      {summary && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Settled Trips */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Settlements</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest settled trips
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/finance/settlements">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {summary.recent_trips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No settled trips yet
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.recent_trips.map((trip) => (
                    <div
                      key={trip.settlement_id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <Link
                          href={`/dashboard/trips/${trip.trip_id}/settlement`}
                          className="font-medium hover:text-primary"
                        >
                          {trip.trip_number || 'Trip'}
                        </Link>
                        {trip.driver_name && (
                          <p className="text-xs text-muted-foreground">
                            {trip.driver_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(trip.revenue)}</p>
                        <p className="text-xs text-emerald-600">
                          +{formatCurrency(trip.profit)} profit
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Companies by Receivables */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Receivables</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Companies with outstanding balances
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/finance/receivables">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {summary.top_companies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open receivables
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.top_companies.map((company) => (
                    <div
                      key={company.company_id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{company.company_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-amber-600">
                        {formatCurrency(company.total)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

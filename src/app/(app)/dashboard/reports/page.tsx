import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser } from "@/lib/supabase-server";
import { getFinanceSummary } from "@/data/settlements";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  Store,
  DollarSign,
  ArrowRight,
} from "lucide-react";

const detailedReports = [
  {
    id: 'revenue',
    title: 'Revenue Report',
    description: 'Earnings by period, customer, and lane',
    icon: DollarSign,
    href: '/dashboard/reports/revenue',
    color: 'text-green-500',
  },
  {
    id: 'profitability',
    title: 'Trip Profitability',
    description: 'Profit margins, costs, and per-mile metrics',
    icon: TrendingUp,
    href: '/dashboard/reports/profitability',
    color: 'text-blue-500',
  },
  {
    id: 'drivers',
    title: 'Driver Performance',
    description: 'Loads completed, pay, and efficiency',
    icon: Users,
    href: '/dashboard/reports/drivers',
    color: 'text-purple-500',
  },
  {
    id: 'compliance',
    title: 'Compliance Status',
    description: 'Expiring documents and compliance overview',
    icon: Shield,
    href: '/dashboard/reports/compliance',
    color: 'text-orange-500',
  },
  {
    id: 'marketplace',
    title: 'Marketplace Activity',
    description: 'Load requests, acceptance rates, reliability',
    icon: Store,
    href: '/dashboard/reports/marketplace',
    color: 'text-cyan-500',
  },
];

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const summary = await getFinanceSummary({ ownerId: user.id, periodDays: 30 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">Business insights and performance analytics</p>
        </div>
      </div>

      {/* Detailed Report Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {detailedReports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.id} href={report.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <Icon className={`h-6 w-6 ${report.color}`} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-2 text-sm">{report.title}</CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Finance Overview Section */}
      <div className="pt-4 border-t">
        <h2 className="text-xl font-semibold text-foreground mb-4">Finance Overview (30 days)</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Revenue (30d)" value={summary.total_revenue} />
        <Kpi label="Driver pay (30d)" value={summary.total_driver_pay} />
        <Kpi label="Expenses (30d)" value={summary.total_expenses} />
        <Kpi label="Profit (30d)" value={summary.total_profit} />
        <Kpi label="Open receivables" value={summary.open_receivables_amount} extra={`${summary.open_receivables_count} open`} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Top companies</h2>
          <p className="text-sm text-muted-foreground">By receivable amount currently open.</p>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {summary.top_companies.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  No open receivables.
                </td>
              </tr>
            )}
            {summary.top_companies.map((c) => (
              <tr key={c.company_id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-3 text-foreground">{c.company_name}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Recent settlements</h2>
          <p className="text-sm text-muted-foreground">Latest 5 settlements</p>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Profit</th>
              <th className="px-4 py-3">Settled</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {summary.recent_trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No settlements yet.
                </td>
              </tr>
            )}
            {summary.recent_trips.map((t) => (
              <tr key={t.settlement_id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{t.trip_number || t.trip_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.driver_name || "—"}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(t.revenue)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(t.profit)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.settled_at ? new Date(t.settled_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <a href={`/dashboard/trips/${t.trip_id}`} className="text-primary text-sm hover:underline">
                    View trip
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, extra }: { label: string; value: number; extra?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{formatCurrency(value)}</p>
      {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
    </div>
  );
}

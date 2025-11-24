import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase-server";
import { getFinanceSummary } from "@/data/settlements";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const summary = await getFinanceSummary({ ownerId: user.id, periodDays: 30 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Finance Overview</h1>
          <p className="text-sm text-muted-foreground">Last 30 days snapshot with receivables and recent trips.</p>
        </div>
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

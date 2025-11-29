import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase-server";
import { listTripSettlements } from "@/data/settlements";
import { formatCurrency } from "@/lib/utils";

export default async function SettlementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settlements = await listTripSettlements({ ownerId: user.id, limit: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Settlements</h1>
          <p className="text-sm text-muted-foreground">Review all trip settlements and jump to trip details.</p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>Showing latest {settlements.length}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Companies</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Driver pay</th>
              <th className="px-4 py-3 text-right">Expenses</th>
              <th className="px-4 py-3 text-right">Profit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                  No settlements yet.
                </td>
              </tr>
            )}
            {settlements.map((s) => (
              <tr key={s.id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{s.trip_number || s.trip_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.driver_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.companies.length === 0 ? "—" : s.companies.length > 1 ? "Multiple" : s.companies[0]}
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(s.total_revenue)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(s.total_driver_pay)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(s.total_expenses)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(s.total_profit)}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{s.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(s.closed_at || s.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/trips/${s.trip_id}`} className="text-primary text-sm hover:underline">
                    View trip
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

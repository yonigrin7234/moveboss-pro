import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase-server";
import { listReceivables } from "@/data/settlements";
import { formatCurrency } from "@/lib/utils";

export default async function ReceivablesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const receivables = await listReceivables({ ownerId: user.id });
  const open = receivables.filter((r) => r.status === "open");
  const totalOpen = open.reduce((sum, r) => sum + r.amount, 0);
  const openCount = open.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Receivables</h1>
          <p className="text-sm text-muted-foreground">Track amounts owed by companies for completed trips.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Open balance</p>
            <p className="text-base font-semibold text-foreground">{formatCurrency(totalOpen)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Open receivables</p>
            <p className="text-base font-semibold text-foreground">{openCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {receivables.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No receivables yet.
                </td>
              </tr>
            )}
            {receivables.map((r) => (
              <tr key={r.id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-3 text-foreground font-medium">{r.company_name || "Unknown"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.trip_number || r.trip_id || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{r.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.trip_id ? (
                    <Link href={`/dashboard/trips/${r.trip_id}`} className="text-primary text-sm hover:underline">
                      View trip
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

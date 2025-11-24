import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase-server";
import { listTripExpenses } from "@/data/expenses";
import { formatCurrency } from "@/lib/utils";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const expenses = await listTripExpenses({ ownerId: user.id });

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last30 = expenses.filter((e) => e.created_at >= since30);
  const totalFuel = last30.filter((e) => e.expense_type === "fuel").reduce((s, e) => s + e.amount, 0);
  const totalTolls = last30.filter((e) => e.expense_type === "tolls").reduce((s, e) => s + e.amount, 0);
  const totalOther = last30.filter((e) => e.expense_type !== "fuel" && e.expense_type !== "tolls").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Trip expenses with receipts and payment source.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Fuel (30d)" value={formatCurrency(totalFuel)} />
          <SummaryCard label="Tolls (30d)" value={formatCurrency(totalTolls)} />
          <SummaryCard label="Other (30d)" value={formatCurrency(totalOther)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Paid by</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No expenses yet.
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{e.trip_number || e.trip_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.driver_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{e.expense_type || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{e.paid_by || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {e.receipt_photo_url ? (
                    <a
                      href={e.receipt_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      View receipt
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

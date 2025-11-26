import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase-server";
import { listReceivables } from "@/data/settlements";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ReceivablesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const receivables = await listReceivables({ ownerId: user.id });
  const open = receivables.filter((r) => r.status === "open");
  const paid = receivables.filter((r) => r.status === "paid");
  const totalOpen = open.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = paid.reduce((sum, r) => sum + r.amount, 0);
  const openCount = open.length;

  // Group receivables by company
  interface CompanyReceivableSummary {
    companyId: string | null;
    companyName: string;
    openAmount: number;
    openCount: number;
    paidAmount: number;
    paidCount: number;
    receivables: typeof receivables;
  }

  const byCompany = receivables.reduce<Record<string, CompanyReceivableSummary>>((acc, r) => {
    const key = r.company_id || "unknown";
    const name = r.company_name || "Unknown Company";

    if (!acc[key]) {
      acc[key] = {
        companyId: r.company_id,
        companyName: name,
        openAmount: 0,
        openCount: 0,
        paidAmount: 0,
        paidCount: 0,
        receivables: [],
      };
    }

    acc[key].receivables.push(r);
    if (r.status === "open") {
      acc[key].openAmount += r.amount;
      acc[key].openCount += 1;
    } else if (r.status === "paid") {
      acc[key].paidAmount += r.amount;
      acc[key].paidCount += 1;
    }

    return acc;
  }, {});

  const companySummaries = Object.values(byCompany).sort((a, b) => b.openAmount - a.openAmount);
  const companiesWithOpenBalance = companySummaries.filter((c) => c.openAmount > 0);

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

      {/* Company Summary Cards */}
      {companiesWithOpenBalance.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Open Balances by Company
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companiesWithOpenBalance.map((company) => (
              <Card key={company.companyId || "unknown"} className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{company.companyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.openCount} open receivable{company.openCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-600">{formatCurrency(company.openAmount)}</p>
                      {company.paidAmount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(company.paidAmount)} paid
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Open</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalOpen)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Companies with Balance</p>
                <p className="text-lg font-bold text-foreground">{companiesWithOpenBalance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tracked</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalOpen + totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <td className="px-4 py-3">
                  <Badge
                    variant={r.status === "paid" ? "default" : r.status === "open" ? "secondary" : "outline"}
                    className={
                      r.status === "paid"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : r.status === "open"
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          : ""
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.trip_id ? (
                    <Link href={`/dashboard/trips/${r.trip_id}/settlement`} className="text-primary text-sm hover:underline">
                      View settlement
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

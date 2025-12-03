import Link from 'next/link';
import { DollarSign, AlertCircle } from 'lucide-react';

export interface Receivable {
  id: string;
  companyName: string;
  amount: number;
  daysOutstanding: number;
}

interface WhoOwesYouProps {
  receivables: Receivable[];
  total: number;
}

export function WhoOwesYou({ receivables, total }: WhoOwesYouProps) {
  if (receivables.length === 0) {
    return (
      <div className="bg-white border border-border/40 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Who Owes You</h2>
        <p className="text-sm text-muted-foreground">No outstanding receivables.</p>
      </div>
    );
  }

  const sorted = [...receivables].sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  const overdueCount = sorted.filter(r => r.daysOutstanding >= 60).length;

  return (
    <div className="bg-white border border-border/40 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Who Owes You</h2>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <Link
          href="/dashboard/finance/receivables"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-2 mb-4">
        {sorted.slice(0, 5).map((item) => {
          const isOverdue = item.daysOutstanding >= 60;
          const isWarning = item.daysOutstanding >= 30;

          return (
            <Link
              key={item.id}
              href={`/dashboard/finance/receivables/${item.id}`}
              className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg hover:bg-muted/30 hover:shadow-sm transition-all duration-150 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium text-foreground truncate">{item.companyName}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-foreground">${item.amount.toLocaleString()}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  isOverdue 
                    ? 'bg-red-100 text-red-700' 
                    : isWarning 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.daysOutstanding}d
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total Outstanding</span>
          </div>
          <span className="text-xl font-bold tabular-nums text-foreground">${(total / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}

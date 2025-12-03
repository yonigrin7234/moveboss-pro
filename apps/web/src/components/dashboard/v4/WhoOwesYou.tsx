import Link from 'next/link';
import { Phone, ExternalLink } from 'lucide-react';

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
  if (receivables.length === 0) return null;

  const sorted = [...receivables].sort((a, b) => b.daysOutstanding - a.daysOutstanding);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          WHO OWES YOU
        </h2>
        <Link
          href="/dashboard/finance/receivables"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-2">
        {sorted.slice(0, 5).map((item) => {
          const isOverdue = item.daysOutstanding >= 60;
          const isWarning = item.daysOutstanding >= 30;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white border border-border/20 hover:border-border/40 hover:shadow-sm transition-all duration-150"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full ${isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium truncate">{item.companyName}</span>
              </div>

              <span className="text-sm font-semibold tabular-nums">${item.amount.toLocaleString()}</span>

              <span className={`text-xs font-semibold min-w-[50px] text-right px-2 py-1 rounded-md ${isOverdue ? 'bg-red-50 text-red-700' : isWarning ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {item.daysOutstanding}d
              </span>

              {isOverdue ? (
                <Link href={`/dashboard/finance/receivables/${item.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                  <Phone className="h-3 w-3" />
                  Call
                </Link>
              ) : (
                <Link href={`/dashboard/finance/receivables/${item.id}`} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  View
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/20 px-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Outstanding</span>
          <span className="text-lg font-semibold tabular-nums">${(total / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}

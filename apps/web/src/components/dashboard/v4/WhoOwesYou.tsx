import Link from 'next/link';
import { Phone } from 'lucide-react';

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
    <div className="space-y-2">
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

      <div className="bg-white border border-border/20 rounded-lg shadow-sm p-3 space-y-2">
        {sorted.slice(0, 5).map((item) => {
          const isOverdue = item.daysOutstanding >= 60;
          const isWarning = item.daysOutstanding >= 30;
          const badgeColor = isOverdue ? 'bg-red-50 text-red-700 border-red-200' : isWarning ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

          return (
            <Link
              key={item.id}
              href={`/dashboard/finance/receivables/${item.id}`}
              className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/30 hover:shadow-md transition-all duration-150 group"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium truncate text-foreground">{item.companyName}</span>
              </div>

              <span className="text-sm font-semibold tabular-nums text-foreground">${item.amount.toLocaleString()}</span>

              {/* Visible aging badge */}
              <span className={`text-xs font-semibold min-w-[60px] text-center px-2 py-1 rounded border ${badgeColor}`}>
                {item.daysOutstanding} days
              </span>
            </Link>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/20 px-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Outstanding</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">${(total / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}

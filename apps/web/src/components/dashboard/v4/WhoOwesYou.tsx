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

  // Sort by days outstanding (oldest first)
  const sorted = [...receivables].sort((a, b) => b.daysOutstanding - a.daysOutstanding);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-all group"
            >
              {/* Days dot + Company */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isOverdue
                      ? 'bg-red-500'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-sm font-medium truncate">{item.companyName}</span>
              </div>

              {/* Amount */}
              <span className="text-sm font-semibold tabular-nums">
                ${item.amount.toLocaleString()}
              </span>

              {/* Days */}
              <span className="text-xs text-muted-foreground min-w-[50px] text-right">
                {item.daysOutstanding}d
              </span>

              {/* Action */}
              {isOverdue ? (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-700 text-xs font-semibold hover:bg-red-500/20 transition-colors">
                  <Phone className="h-3 w-3" />
                  Call
                </button>
              ) : (
                <Link
                  href={`/dashboard/finance/receivables/${item.id}`}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Outstanding</span>
          <span className="text-lg font-semibold tabular-nums">
            ${(total / 1000).toFixed(1)}k
          </span>
        </div>
      </div>
    </div>
  );
}

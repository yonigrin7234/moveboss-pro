import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

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
      <Card className="rounded-xl border-border/50" id="receivables">
        <CardHeader className="px-6 py-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              WHO OWES YOU
            </h3>
            <span className="text-2xl font-semibold text-foreground">$0</span>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium text-foreground">All paid up!</p>
          <p className="text-xs text-muted-foreground mt-1">No outstanding receivables.</p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityDot = (days: number) => {
    if (days >= 60) return 'bg-red-500';
    if (days >= 30) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getActionButton = (days: number) => {
    if (days >= 60) {
      return (
        <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold">
          Call
        </span>
      );
    }
    return (
      <span className="text-xs font-medium text-primary">View</span>
    );
  };

  // Sort by days outstanding (oldest first)
  const sortedReceivables = [...receivables].sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  const displayReceivables = sortedReceivables.slice(0, 5);

  return (
    <Card className="rounded-xl border-border/50 overflow-hidden" id="receivables">
      <CardHeader className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            WHO OWES YOU
          </h3>
          <span className="text-2xl font-semibold text-foreground">
            ${(total / 1000).toFixed(1)}k
          </span>
        </div>
      </CardHeader>
      <div className="divide-y divide-dashed divide-border/50">
        {displayReceivables.map((receivable) => (
          <Link
            key={receivable.id}
            href={`/dashboard/companies/${receivable.id}`}
            className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getSeverityDot(receivable.daysOutstanding)}`} />
            <span className="flex-1 text-sm font-semibold text-foreground">
              {receivable.companyName}
            </span>
            <span className="text-base font-semibold text-foreground tabular-nums">
              ${(receivable.amount / 1000).toFixed(1)}k
            </span>
            <span className="text-sm text-muted-foreground w-20 text-right">
              {receivable.daysOutstanding} days
            </span>
            {getActionButton(receivable.daysOutstanding)}
          </Link>
        ))}
      </div>
      {sortedReceivables.length > 5 && (
        <div className="px-6 py-3 border-t border-border/50 text-right">
          <Link
            href="/dashboard/finance/receivables"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all {sortedReceivables.length} →
          </Link>
        </div>
      )}
    </Card>
  );
}

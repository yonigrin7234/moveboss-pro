import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
      <div className="bg-white rounded-lg border border-gray-200/80 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Who Owes You</h2>
        <p className="text-sm text-gray-500">No outstanding receivables.</p>
      </div>
    );
  }

  const sorted = [...receivables].sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  const overdueCount = sorted.filter(r => r.daysOutstanding >= 60).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Who Owes You</h2>
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <Link
          href="/dashboard/finance/receivables"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {sorted.slice(0, 5).map((item) => {
          const isOverdue = item.daysOutstanding >= 60;
          const isWarning = item.daysOutstanding >= 30;

          return (
            <Link
              key={item.id}
              href={`/dashboard/finance/receivables/${item.id}`}
              className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-sm font-medium text-gray-900 truncate">{item.companyName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  ${item.amount.toLocaleString()}
                </span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  isOverdue
                    ? 'bg-red-100 text-red-700'
                    : isWarning
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.daysOutstanding}d
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Total Outstanding</span>
          <span className="text-lg font-bold tabular-nums text-gray-900">${(total / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </div>
  );
}

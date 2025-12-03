import Link from 'next/link';
import { DollarSign, CheckCircle2, TrendingUp } from 'lucide-react';

export interface Collection {
  id: string;
  driverName: string;
  amount: number;
  loadId: string;
  time: string;
}

interface TodaysCollectionsProps {
  collections: Collection[];
  total: number;
}

export function TodaysCollections({ collections, total }: TodaysCollectionsProps) {
  return (
    <div className="bg-white border border-border/40 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Today's Collections</h2>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <span className="text-lg font-bold text-emerald-600 tabular-nums">
            ${(total / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="py-8 text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No collections yet today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/trips/${item.loadId}`}
              className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg hover:bg-muted/30 hover:shadow-sm transition-all duration-150 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{item.driverName}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                  ${item.amount.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums min-w-[50px] text-right">
                  {item.time}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

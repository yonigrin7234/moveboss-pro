import Link from 'next/link';
import { DollarSign, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          TODAY'S COLLECTIONS
        </h2>
        <span className="text-lg font-semibold text-emerald-600 tabular-nums">
          ${(total / 1000).toFixed(1)}k
        </span>
      </div>

      {collections.length === 0 ? (
        <div className="p-6 rounded-lg border border-border/50 bg-card text-center">
          <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No collections yet today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/trips/${item.loadId}`}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-all group"
            >
              {/* Driver */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.driverName}</span>
              </div>

              {/* Amount */}
              <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                ${item.amount.toLocaleString()}
              </span>

              {/* Time */}
              <span className="text-xs text-muted-foreground tabular-nums min-w-[50px] text-right">
                {item.time}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

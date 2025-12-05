'use client';

import { CheckCircle2, Banknote } from 'lucide-react';
import type { DriverCollection } from '@/data/dashboard-data';

interface DriverCollectionsTodayProps {
  collections: DriverCollection[];
  total: number;
}

export function DriverCollectionsToday({ collections, total }: DriverCollectionsTodayProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Driver Collections Today</h2>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          +${total.toLocaleString()}
        </span>
      </div>

      {collections.length === 0 ? (
        <div className="py-8 px-6 text-center">
          <Banknote className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No collections yet today</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="px-6 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {collection.driverName}
                </p>
                {collection.paymentMethod && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {collection.paymentMethod}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +${collection.amount.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {collection.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { CheckCircle2, TrendingUp } from 'lucide-react';

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
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Today's Collections</h2>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-600 tabular-nums">
            ${(total / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="py-8 px-4 text-center">
          <p className="text-sm text-gray-500">No collections yet today</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {collections.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/trips/${item.loadId}`}
              className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{item.driverName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                  +${item.amount.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 tabular-nums">
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

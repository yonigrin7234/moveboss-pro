import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface AttentionItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  label: string;
  count: number;
  href: string;
}

interface AttentionListProps {
  items: AttentionItem[];
}

export function AttentionList({ items }: AttentionListProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 rounded-lg border border-border/50 bg-card text-center">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-emerald-600/50" />
        <p className="text-sm font-medium text-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground mt-1">No items need attention</p>
      </div>
    );
  }

  // Sort by severity: critical → warning → info
  const sorted = [...items].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        NEEDS ATTENTION
      </h2>

      <div className="space-y-2">
        {sorted.slice(0, 5).map((item) => {
          const Icon =
            item.severity === 'critical'
              ? AlertCircle
              : item.severity === 'warning'
              ? AlertTriangle
              : Info;

          const classes =
            item.severity === 'critical'
              ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
              : item.severity === 'warning'
              ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
              : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10';

          const iconColor =
            item.severity === 'critical'
              ? 'text-red-600'
              : item.severity === 'warning'
              ? 'text-amber-600'
              : 'text-blue-600';

          const badgeColor =
            item.severity === 'critical'
              ? 'bg-red-500/20 text-red-700'
              : item.severity === 'warning'
              ? 'bg-amber-500/20 text-amber-700'
              : 'bg-blue-500/20 text-blue-700';

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${classes}`}
            >
              <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeColor}`}>
                {item.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

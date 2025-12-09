'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import type { AuditLogEntry, AuditEntityType } from '@/lib/audit';
import { ActivityFeed } from '@/components/activity/ActivityFeed';

interface ActivityPageClientProps {
  logs: AuditLogEntry[];
}

type FilterType = 'all' | AuditEntityType;

const filterConfig: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'load', label: 'Loads' },
  { value: 'trip', label: 'Trips' },
  { value: 'partnership', label: 'Partnerships' },
  { value: 'company', label: 'Company' },
];

export function ActivityPageClient({ logs }: ActivityPageClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter((log) => log.entity_type === activeFilter);

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Activity
          </h1>
          <p className="text-muted-foreground">Recent activity across your workspace</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filterConfig.map((filter) => {
          const isActive = activeFilter === filter.value;
          const count = filter.value === 'all'
            ? logs.length
            : logs.filter((log) => log.entity_type === filter.value).length;

          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {filter.label}
              {count > 0 && (
                <span className={`ml-1.5 ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Activity Feed */}
      <ActivityFeed
        logs={filteredLogs}
        emptyMessage={
          activeFilter === 'all'
            ? 'No activity recorded yet'
            : `No ${filterConfig.find(f => f.value === activeFilter)?.label.toLowerCase()} activity yet`
        }
      />
    </div>
  );
}

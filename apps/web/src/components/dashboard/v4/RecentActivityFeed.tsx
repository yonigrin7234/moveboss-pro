'use client';

import { Activity, Truck, Package, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import type { ActivityEvent } from '@/data/dashboard-data';

interface RecentActivityFeedProps {
  activities: ActivityEvent[];
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trip_started: Truck,
  trip_completed: CheckCircle2,
  load_accepted: Package,
  delivery_completed: CheckCircle2,
  expense_added: DollarSign,
  default: Activity,
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
      </div>

      {activities.length === 0 ? (
        <div className="py-8 px-6 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="relative max-h-[240px] overflow-y-auto">
          {/* Timeline line */}
          <div className="absolute left-[30px] top-0 bottom-0 w-px bg-border" />

          <div className="divide-y divide-border">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || activityIcons.default;

              return (
                <div
                  key={activity.id}
                  className="px-6 py-3 flex gap-3 relative hover:bg-accent/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="relative flex-shrink-0 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center z-10">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">{activity.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activity.driverName && (
                        <span className="text-xs text-muted-foreground">{activity.driverName}</span>
                      )}
                      <span className="text-xs text-muted-foreground/60">{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

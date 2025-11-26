import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Receipt,
  Flag,
  CircleDot,
  Clock,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase-server';
import { getRecentActivities, type ActivityType } from '@/data/activity-log';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const activityIcons: Record<ActivityType, { icon: any; color: string; bg: string }> = {
  trip_started: { icon: Flag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  trip_completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  load_accepted: { icon: CircleDot, color: 'text-green-500', bg: 'bg-green-500/10' },
  loading_started: { icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  loading_finished: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  delivery_started: { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  delivery_completed: { icon: MapPin, color: 'text-green-600', bg: 'bg-green-500/10' },
  expense_added: { icon: Receipt, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
};

function timeAgo(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const activities = await getRecentActivities(user.id, { limit: 100 });

  // Group activities by date
  const groupedActivities: Record<string, typeof activities> = {};
  activities.forEach((activity) => {
    const dateKey = new Date(activity.created_at).toDateString();
    if (!groupedActivities[dateKey]) {
      groupedActivities[dateKey] = [];
    }
    groupedActivities[dateKey].push(activity);
  });

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Live Activity
          </h1>
          <p className="text-muted-foreground">Real-time updates from your drivers</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {activities.length} activities
        </div>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No recent activity</p>
            <p className="text-sm">Activity will appear here as your drivers work</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateKey, dayActivities]) => (
            <div key={dateKey} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                {formatDate(dayActivities[0].created_at)}
              </h2>
              <div className="space-y-3">
                {dayActivities.map((activity) => {
                  const config = activityIcons[activity.activity_type] || activityIcons.load_accepted;
                  const Icon = config.icon;

                  return (
                    <Card key={activity.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div
                            className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-foreground">{activity.title}</p>
                              <div className="text-right flex-shrink-0">
                                <span className="text-xs text-muted-foreground block">
                                  {timeAgo(activity.created_at)}
                                </span>
                                <span className="text-xs text-muted-foreground/70">
                                  {formatTime(activity.created_at)}
                                </span>
                              </div>
                            </div>

                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              {activity.trip_number && (
                                <Link href={`/dashboard/trips/${activity.trip_id}`}>
                                  <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                                    Trip {activity.trip_number}
                                  </Badge>
                                </Link>
                              )}
                              {activity.load_number && !activity.trip_number && (
                                <Badge variant="outline">{activity.load_number}</Badge>
                              )}
                              {activity.driver_name && (
                                <span className="text-xs text-muted-foreground">
                                  by {activity.driver_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

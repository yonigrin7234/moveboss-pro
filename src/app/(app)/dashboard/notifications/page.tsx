import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  Package,
  Check,
  X,
  CheckCircle,
  Truck,
  ArrowLeft,
  Undo2,
  Star,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@/data/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, { icon: React.ElementType; color: string }> = {
  load_request_received: { icon: Package, color: 'text-blue-500' },
  request_accepted: { icon: Check, color: 'text-emerald-500' },
  request_declined: { icon: X, color: 'text-red-500' },
  load_confirmed: { icon: CheckCircle, color: 'text-green-600' },
  driver_assigned: { icon: Truck, color: 'text-purple-500' },
  request_withdrawn: { icon: ArrowLeft, color: 'text-amber-500' },
  load_given_back: { icon: Undo2, color: 'text-orange-500' },
  carrier_canceled: { icon: X, color: 'text-red-600' },
  partner_load_posted: { icon: Star, color: 'text-yellow-500' },
  rating_received: { icon: Star, color: 'text-yellow-500' },
  compliance_docs_requested: { icon: Package, color: 'text-orange-500' },
  compliance_doc_approved: { icon: CheckCircle, color: 'text-green-500' },
  compliance_doc_rejected: { icon: X, color: 'text-red-500' },
};

function timeAgo(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const dateKey = formatDate(n.created_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(n);
  }

  return groups;
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const notifications = await getUserNotifications(user.id, 50);
  const groupedNotifications = groupNotificationsByDate(notifications);
  const hasUnread = notifications.some((n) => !n.is_read);

  async function markAllReadAction() {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    await markAllNotificationsRead(currentUser.id);
    revalidatePath('/dashboard/notifications');
    revalidatePath('/dashboard');
  }

  async function markReadAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    const notificationId = formData.get('notification_id') as string;
    if (notificationId) {
      await markNotificationRead(notificationId);
      revalidatePath('/dashboard/notifications');
      revalidatePath('/dashboard');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated on your marketplace activity
          </p>
        </div>
        {hasUnread && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-foreground mb-1">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              When you receive load requests or updates, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {items.map((notification) => {
                    const config =
                      notificationIcons[notification.type] || notificationIcons.load_request_received;
                    const Icon = config.icon;
                    const isUnread = !notification.is_read;
                    const linkHref = notification.type === 'partner_load_posted' && notification.load_id
                      ? `/dashboard/marketplace`
                      : notification.load_id
                        ? `/dashboard/loads/${notification.load_id}`
                        : notification.request_id
                          ? `/dashboard/marketplace/my-requests`
                          : '#';

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-4 px-4 py-3 transition-colors',
                          isUnread && 'bg-primary/5'
                        )}
                      >
                        <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-sm truncate',
                                  isUnread ? 'font-semibold text-foreground' : 'text-foreground'
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-sm text-muted-foreground truncate mt-0.5">
                                  {notification.message}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {timeAgo(notification.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {linkHref !== '#' && (
                              <Link
                                href={linkHref}
                                className="text-xs text-primary hover:underline"
                              >
                                View details
                              </Link>
                            )}
                            {isUnread && (
                              <form action={markReadAction} className="inline">
                                <input
                                  type="hidden"
                                  name="notification_id"
                                  value={notification.id}
                                />
                                <button
                                  type="submit"
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Mark as read
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <div className="flex-shrink-0">
                            <span className="block h-2 w-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

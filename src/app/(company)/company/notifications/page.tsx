import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  getCompanyNotifications,
  markAllCompanyNotificationsRead,
  markNotificationRead,
} from '@/data/notifications';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  User,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Undo2,
  Navigation,
  Star,
} from 'lucide-react';

async function getCompanySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('company_session');
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; href: (n: { load_id?: string | null }) => string }
> = {
  load_request_received: {
    icon: Truck,
    color: 'text-blue-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}/requests` : '/company/requests'),
  },
  load_confirmed: {
    icon: CheckCircle,
    color: 'text-green-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  driver_assigned: {
    icon: User,
    color: 'text-green-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  request_withdrawn: {
    icon: Undo2,
    color: 'text-orange-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}/requests` : '/company/requests'),
  },
  load_given_back: {
    icon: AlertTriangle,
    color: 'text-red-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  load_loading: {
    icon: Package,
    color: 'text-blue-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  load_loaded: {
    icon: Truck,
    color: 'text-orange-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  load_in_transit: {
    icon: Navigation,
    color: 'text-purple-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  load_delivered: {
    icon: CheckCircle,
    color: 'text-green-500',
    href: (n) => (n.load_id ? `/company/loads/${n.load_id}` : '/company/dashboard'),
  },
  rating_received: {
    icon: Star,
    color: 'text-yellow-500',
    href: () => '/company/dashboard',
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default async function CompanyNotificationsPage() {
  const session = await getCompanySession();

  if (!session) {
    redirect('/company-login');
  }

  const notifications = await getCompanyNotifications(session.company_id, 50);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllReadAction() {
    'use server';
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('company_session');
    if (!sessionCookie) return;
    const sessionData = JSON.parse(sessionCookie.value);
    await markAllCompanyNotificationsRead(sessionData.company_id);
    revalidatePath('/company/notifications');
  }

  async function markReadAction(formData: FormData) {
    'use server';
    const notificationId = formData.get('notification_id') as string;
    if (notificationId) {
      await markNotificationRead(notificationId);
      revalidatePath('/company/notifications');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-semibold">Notifications</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
          {unreadCount > 0 && (
            <form action={markAllReadAction}>
              <Button variant="outline" size="sm" type="submit">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            </form>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You&apos;ll see updates about your loads here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type] || {
                icon: Bell,
                color: 'text-muted-foreground',
                href: () => '/company/dashboard',
              };
              const Icon = config.icon;
              const href = config.href(notification);

              return (
                <Link key={notification.id} href={href}>
                  <Card
                    className={`hover:bg-muted/50 transition-colors cursor-pointer ${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`font-medium ${!notification.is_read ? '' : 'text-muted-foreground'}`}
                            >
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <Badge className="bg-blue-500/20 text-blue-500 flex-shrink-0">
                                New
                              </Badge>
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

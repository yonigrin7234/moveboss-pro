import Link from 'next/link';
import { redirect } from 'next/navigation';
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

import {
  getCompaniesForUser,
  getCompaniesCountForUser,
  type Company,
} from '@/data/companies';
import { getComplianceAlertCounts } from '@/data/compliance-alerts';
import { ComplianceStatusWidget } from '@/components/compliance-status-widget';
import { getDriversForUser, getDriverStatsForUser, type Driver } from '@/data/drivers';
import { getRecentActivities, type ActivityType, type ActivityLogEntry } from '@/data/activity-log';
import { getCurrentUser } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const activityIcons: Record<ActivityType, { icon: any; color: string }> = {
  trip_started: { icon: Flag, color: 'text-blue-500' },
  trip_completed: { icon: CheckCircle, color: 'text-emerald-500' },
  load_accepted: { icon: CircleDot, color: 'text-green-500' },
  loading_started: { icon: Package, color: 'text-purple-500' },
  loading_finished: { icon: Package, color: 'text-purple-600' },
  delivery_started: { icon: Truck, color: 'text-blue-500' },
  delivery_completed: { icon: MapPin, color: 'text-green-600' },
  expense_added: { icon: Receipt, color: 'text-yellow-500' },
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

const recentTrips = [
  {
    id: 'TRP-1042',
    company: 'Zenith Freight',
    status: 'En Route',
    driver: 'Marta Jenkins',
    date: 'Nov 20, 2025',
  },
  {
    id: 'TRP-1037',
    company: 'Blue Mountain Foods',
    status: 'Completed',
    driver: 'Andre Gomez',
    date: 'Nov 18, 2025',
  },
  {
    id: 'TRP-1031',
    company: 'AeroParts Inc.',
    status: 'Planned',
    driver: 'Alana Pierce',
    date: 'Nov 22, 2025',
  },
  {
    id: 'TRP-1025',
    company: 'Summit Goods',
    status: 'Delayed',
    driver: 'Liam Ford',
    date: 'Nov 17, 2025',
  },
];

const statusStyles: Record<string, string> = {
  'En Route': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Planned: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Delayed: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let companies: Company[] = [];
  let totalCompanies = 0;
  let drivers: Driver[] = [];
  let driverStats = { totalDrivers: 0, activeDrivers: 0, suspendedDrivers: 0 };
  let recentActivities: ActivityLogEntry[] = [];
  let complianceCounts = { warning: 0, urgent: 0, critical: 0, expired: 0 };
  let error: string | null = null;

  try {
    [companies, totalCompanies, drivers, driverStats, recentActivities, complianceCounts] = await Promise.all([
      getCompaniesForUser(user.id).then((cs) => cs.slice(0, 5)),
      getCompaniesCountForUser(user.id),
      getDriversForUser(user.id).then((ds) => ds.slice(0, 5)),
      getDriverStatsForUser(user.id),
      getRecentActivities(user.id, { limit: 5 }),
      getComplianceAlertCounts(user.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load companies';
  }

  const statCards = [
    {
      label: 'Companies',
      value: totalCompanies || 0,
      description: 'Accounts across your network',
    },
    {
      label: 'Active Trips',
      value: 4,
      description: 'Trips in progress today',
    },
    {
      label: 'Available Drivers',
      value: driverStats.activeDrivers || 0,
      description: 'Ready for dispatch',
    },
    {
      label: 'Open Capacity',
      value: '38k',
      description: 'Cubic ft. available',
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.email ?? 'fleet owner'}
        </p>
        <p className="text-xs text-muted-foreground">
          Track performance, assets, and partner data from a single view.
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">
            Error loading companies: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Status Widget */}
      <ComplianceStatusWidget counts={complianceCounts} href="/dashboard/compliance/alerts" />

      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="lg:flex-[3]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Recent Companies</CardTitle>
              <p className="text-sm text-muted-foreground">
                Last five accounts you touched
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/companies">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {companies.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No companies yet. Add partners to unlock reporting.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>DOT</TableHead>
                      <TableHead>MC</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/companies/${company.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {company.name}
                          </Link>
                        </TableCell>
                        <TableCell>{company.dot_number ?? '—'}</TableCell>
                        <TableCell>{company.mc_number ?? '—'}</TableCell>
                        <TableCell>
                          {new Date(company.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:flex-[2]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Driver roster</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recent drivers ready for dispatch
              </p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/drivers">View drivers</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No drivers yet. Add one to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Pay mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/drivers/${driver.id}`}
                            className="text-foreground hover:text-primary"
                          >
                            {driver.first_name} {driver.last_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.phone}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {driver.pay_mode?.replaceAll('_', ' ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Widget */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Recent Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Live updates from your drivers
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/activity">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Activity will appear here as your drivers work</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const config = activityIcons[activity.activity_type] || activityIcons.load_accepted;
                const Icon = config.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(activity.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

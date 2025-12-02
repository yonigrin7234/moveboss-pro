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
  Building2,
  Users,
  Boxes,
  DollarSign,
  Clipboard,
} from 'lucide-react';

import {
  getCompaniesForUser,
  getCompaniesCountForUser,
  type Company,
} from '@/data/companies';
import { getComplianceAlertCounts } from '@/data/compliance-alerts';
import { getVerificationStateForUser } from '@/data/verification';
import { getOnboardingState } from '@/data/onboarding';
import { ComplianceStatusWidget } from '@/components/compliance-status-widget';
import { VerificationStatusWidget } from '@/components/verification-status-widget';
import { SetupChecklist } from '@/components/setup-checklist';
import { getDriversForUser, getDriverStatsForUser, type Driver } from '@/data/drivers';
import { getRecentActivities, type ActivityType, type ActivityLogEntry } from '@/data/activity-log';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
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
import { QuickActions } from '@/components/dashboard/QuickActions';
import { StatRow } from '@/components/dashboard/StatRow';
import {
  TodaysFocus,
  getCarrierFocusItems,
  getBrokerFocusItems,
  type FocusItem,
} from '@/components/dashboard/TodaysFocus';
import { getDashboardMode, type DashboardMode } from '@/lib/dashboardMode';

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
  'En Route': 'bg-warning/10 text-warning-foreground border border-warning/20',
  Completed: 'bg-success/10 text-success border border-success/20',
  Planned: 'bg-info/10 text-info border border-info/20',
  Delayed: 'bg-destructive/10 text-destructive border border-destructive/20',
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
  let verificationState = await getVerificationStateForUser(user.id);
  let onboardingState = await getOnboardingState(user.id);
  let error: string | null = null;

  // Fetch company to determine dashboard mode
  const supabase = await createClient();
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, is_carrier, is_broker')
    .eq('owner_id', user.id)
    .eq('is_workspace_company', true)
    .single();

  // Debug logging
  console.log('[Dashboard] Company query result:', {
    company,
    companyError,
    user_id: user.id,
  });

  if (companyError) {
    console.error('[Dashboard] Error fetching company:', companyError);
  }

  const mode: DashboardMode = getDashboardMode(company || {});

  console.log('[Dashboard] Computed mode:', {
    mode,
    is_carrier: company?.is_carrier,
    is_broker: company?.is_broker,
  });

  try {
    const promises: Promise<any>[] = [
      getCompaniesForUser(user.id).then((cs) => cs.slice(0, 5)),
      getCompaniesCountForUser(user.id),
      getRecentActivities(user.id, { limit: 5 }),
    ];

    // Only fetch driver data if carrier or hybrid mode
    if (mode !== 'broker') {
      promises.push(
        getDriversForUser(user.id).then((ds) => ds.slice(0, 5)),
        getDriverStatsForUser(user.id),
        getComplianceAlertCounts(user.id)
      );
    }

    const results = await Promise.all(promises);

    companies = results[0];
    totalCompanies = results[1];
    recentActivities = results[2];

    if (mode !== 'broker') {
      drivers = results[3];
      driverStats = results[4];
      complianceCounts = results[5];
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load dashboard data';
  }

  // Prepare data for StatRow component
  const statData = {
    companiesCount: totalCompanies,
    activeTrips: 4, // TODO: Replace with real data
    availableDrivers: driverStats.activeDrivers,
    openCapacity: '38k', // TODO: Replace with real data
    activeCarriers: totalCompanies, // TODO: Replace with real data
    postedLoads: 12, // TODO: Replace with real data
    pendingRequests: 3, // TODO: Replace with real data
    outstandingBalance: '$24.5k', // TODO: Replace with real data
  };

  // Generate Today's Focus items based on mode
  let focusItems: FocusItem[] = [];
  if (mode === 'carrier' || mode === 'hybrid') {
    focusItems = getCarrierFocusItems({
      unassignedLoads: 2, // TODO: Replace with real data
      activeTrips: 4,
      pendingSettlements: 1,
      expiringDocs: 3,
      outstandingBalance: 12500,
    });
  }
  if (mode === 'broker' || mode === 'hybrid') {
    const brokerItems = getBrokerFocusItems({
      loadsNeedingCarriers: 5, // TODO: Replace with real data
      pendingRequests: 3,
      activeDeliveries: 8,
      unpaidInvoices: 18000,
      expiringQuotes: 2,
    });
    focusItems = [...focusItems, ...brokerItems];
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-6 space-y-4 pt-4">
      <div className="space-y-1 pb-2">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground/90">
          {mode === 'broker'
            ? 'Manage loads, carriers, and marketplace activity from a single view.'
            : mode === 'hybrid'
            ? 'Manage your fleet and marketplace loads from a single view.'
            : 'Track performance, assets, and partner data from a single view.'}
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error loading dashboard: {error}
          </CardContent>
        </Card>
      )}

      {/* Setup Checklist - shows at top for new users */}
      <SetupChecklist userRole={onboardingState?.role || 'carrier'} />

      {/* Quick Actions */}
      <QuickActions mode={mode} />

      {/* Stat Cards - Role Aware */}
      <StatRow mode={mode} data={statData} />

      {/* Status Widgets - Conditional */}
      <div className="grid gap-4 md:grid-cols-2 pt-3 border-t border-border/30">
        {verificationState && (
          <VerificationStatusWidget state={verificationState} />
        )}
        {mode !== 'broker' && (
          <ComplianceStatusWidget counts={complianceCounts} href="/dashboard/compliance/alerts" />
        )}
      </div>

      {/* Today's Focus Widget */}
      {focusItems.length > 0 && (
        <TodaysFocus mode={mode} items={focusItems} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Companies Widget */}
        <Card className="lg:col-span-2 h-full rounded-lg">
          <CardHeader className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-3 px-4">
            <div>
              <CardTitle className="text-base tracking-tight">
                {mode === 'broker' ? 'Recent Carriers' : 'Recent Companies'}
              </CardTitle>
              <p className="text-[11.5px] text-muted-foreground">
                {mode === 'broker'
                  ? 'Carriers handling your loads'
                  : 'Last five accounts you touched'}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="text-[11px] h-7">
              <Link href="/dashboard/companies">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {companies.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
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
                      <TableRow
                        key={company.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                      >
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

        {/* Driver Roster Widget - Only show if has fleet */}
        {mode !== 'broker' && (
          <Card className="h-full rounded-lg">
            <CardHeader className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-3 px-4">
              <div>
                <CardTitle className="text-base tracking-tight">Driver roster</CardTitle>
                <p className="text-[11.5px] text-muted-foreground">
                  Recent drivers ready for dispatch
                </p>
              </div>
              <Button asChild size="sm" variant="ghost" className="text-[11px] h-7">
                <Link href="/dashboard/drivers">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No drivers yet. Add one to see them here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => (
                        <TableRow
                          key={driver.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <Link
                              href={`/dashboard/drivers/${driver.id}`}
                              className="text-foreground hover:text-primary"
                            >
                              {driver.first_name} {driver.last_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-[10px]">
                              {driver.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity Widget */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-3 px-4">
          <div>
            <CardTitle className="text-base tracking-tight flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Recent Activity
            </CardTitle>
            <p className="text-[11.5px] text-muted-foreground">
              {mode !== 'broker'
                ? 'Live updates from your drivers'
                : 'Live updates from your carriers'}
            </p>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-[11px] h-7">
            <Link href="/dashboard/activity">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {recentActivities.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-[11px]">
                {mode !== 'broker'
                  ? 'Activity will appear here as your drivers work'
                  : 'Activity will appear here as carriers move your loads'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((activity) => {
                const config = activityIcons[activity.activity_type] || activityIcons.load_accepted;
                const Icon = config.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate">{activity.title}</p>
                      {activity.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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

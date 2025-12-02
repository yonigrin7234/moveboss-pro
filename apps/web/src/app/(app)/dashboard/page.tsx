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
  BadgeCheck,
  AlertTriangle,
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
    <div className="max-w-7xl w-full mx-auto px-6 space-y-6 pt-4">
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

      {/* Status Insight Bar - Merged FMCSA + Compliance */}
      {(verificationState || mode !== 'broker') && (
        <Card className="rounded-xl border-l-4 border-l-primary/30 shadow-sm bg-gradient-to-r from-accent/20 to-transparent">
          <CardContent className="py-3 px-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* FMCSA Verification */}
              {verificationState && (
                <div className="flex items-center gap-3">
                  {verificationState.status === 'verified' ? (
                    <>
                      <div className="p-2 rounded-lg bg-success/10 ring-1 ring-success/20">
                        <BadgeCheck className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-success">FMCSA Verified</p>
                        {verificationState.fmcsa?.legalName && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {verificationState.fmcsa.legalName}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-lg bg-muted">
                        <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Get Verified</p>
                        <p className="text-[11px] text-muted-foreground">
                          {verificationState.completedCount}/{verificationState.requirements.length} steps
                        </p>
                      </div>
                      <Link
                        href="/dashboard/settings/company-profile"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Start →
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Compliance Status */}
              {mode !== 'broker' && (
                <div className="flex items-center gap-3">
                  {complianceCounts.warning + complianceCounts.urgent + complianceCounts.critical + complianceCounts.expired === 0 ? (
                    <>
                      <div className="p-2 rounded-lg bg-success/10 ring-1 ring-success/20">
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-success">All Compliant</p>
                        <p className="text-[11px] text-muted-foreground">No issues</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-lg bg-destructive/10 ring-1 ring-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Compliance Alerts</p>
                        <div className="flex gap-1.5 mt-0.5">
                          {complianceCounts.expired > 0 && (
                            <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
                              {complianceCounts.expired} Expired
                            </Badge>
                          )}
                          {complianceCounts.critical > 0 && (
                            <Badge variant="pill-destructive" className="text-[9px] h-4 px-1.5">
                              {complianceCounts.critical} Critical
                            </Badge>
                          )}
                          {complianceCounts.urgent > 0 && (
                            <Badge variant="pill-warning" className="text-[9px] h-4 px-1.5">
                              {complianceCounts.urgent} Urgent
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link
                        href="/dashboard/compliance/alerts"
                        className="text-[11px] text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Focus Widget */}
      {focusItems.length > 0 && (
        <TodaysFocus mode={mode} items={focusItems} />
      )}

      {/* Combined Companies + Drivers Widget */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Companies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    {mode === 'broker' ? 'Recent Carriers' : 'Recent Companies'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {mode === 'broker' ? 'Handling your loads' : 'Last five accounts'}
                  </p>
                </div>
                <Link href="/dashboard/companies" className="text-[11px] text-primary hover:underline">
                  View all
                </Link>
              </div>
              {companies.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-muted-foreground">
                  No companies yet
                </div>
              ) : (
                <div className="space-y-2">
                  {companies.map((company) => (
                    <Link
                      key={company.id}
                      href={`/dashboard/companies/${company.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                          {company.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          DOT: {company.dot_number ?? '—'} • MC: {company.mc_number ?? '—'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Driver Roster - Only show if has fleet */}
            {mode !== 'broker' && (
              <div className="lg:border-l lg:pl-6 border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Driver Roster</h3>
                    <p className="text-[10px] text-muted-foreground">Ready for dispatch</p>
                  </div>
                  <Link href="/dashboard/drivers" className="text-[11px] text-primary hover:underline">
                    View all
                  </Link>
                </div>
                {drivers.length === 0 ? (
                  <div className="py-4 text-center text-[11px] text-muted-foreground">
                    No drivers yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drivers.map((driver) => (
                      <Link
                        key={driver.id}
                        href={`/dashboard/drivers/${driver.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors group"
                      >
                        <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                          {driver.first_name} {driver.last_name}
                        </p>
                        <Badge variant="secondary" className="capitalize text-[9px] h-4">
                          {driver.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Compact Footer */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <h3 className="text-sm font-semibold tracking-tight">Recent Activity</h3>
            </div>
            <Link href="/dashboard/activity" className="text-[11px] text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="py-6 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-[11px] text-muted-foreground">
                {mode !== 'broker' ? 'Activity from drivers will appear here' : 'Activity from carriers will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivities.map((activity) => {
                const config = activityIcons[activity.activity_type] || activityIcons.load_accepted;
                const Icon = config.icon;
                return (
                  <div key={activity.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors">
                    <div className={`${config.color}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{activity.title}</p>
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

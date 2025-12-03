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
    .select('id, name, is_carrier, is_broker')
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
    <div className="max-w-7xl w-full mx-auto px-6 space-y-5 pt-4">
      {/* Premium Hero Header - Compressed */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent/10 to-transparent border border-border/40 p-5">
        <div className="absolute top-3 left-3">
          <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
              Dashboard
            </span>
          </div>
        </div>

        <div className="mt-5">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {company?.name || 'Welcome back'}
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            {mode === 'broker'
              ? 'Broker Operations Center'
              : mode === 'hybrid'
              ? 'Hybrid Fleet & Brokerage Command'
              : 'Carrier Fleet Management'}
          </p>
        </div>

        {/* Operational Snapshot - Compressed */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50">
            <Truck className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {statData.activeTrips}
            </span>
            <span className="text-[10px] text-muted-foreground">Active</span>
          </div>

          {mode !== 'broker' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {statData.availableDrivers}
              </span>
              <span className="text-[10px] text-muted-foreground">Drivers</span>
            </div>
          )}

          {(mode === 'broker' || mode === 'hybrid') && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50">
              <Package className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {statData.postedLoads}
              </span>
              <span className="text-[10px] text-muted-foreground">Posted</span>
            </div>
          )}

          {mode === 'hybrid' && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-card border border-border/50">
              <Boxes className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {statData.openCapacity}
              </span>
              <span className="text-[10px] text-muted-foreground">Capacity</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            Error loading dashboard: {error}
          </CardContent>
        </Card>
      )}

      {/* Setup Checklist - shows at top for new users */}
      <SetupChecklist userRole={onboardingState?.role || 'carrier'} />

      {/* Fleet + Marketplace Health - MOVED UP */}
      <StatRow mode={mode} data={statData} />

      {/* Quick Actions - Compressed */}
      <QuickActions mode={mode} />

      {/* Premium Status Alert Bar - Compressed */}
      {(verificationState || mode !== 'broker') && (
        <div className="relative h-12 rounded-xl border-l-4 border-l-primary shadow-md bg-gradient-to-r from-accent/10 to-transparent border border-border/30 overflow-hidden">
          <div className="h-full px-4 flex items-center gap-4">
            {/* FMCSA Verification Status */}
            {verificationState && (
              <div className="flex items-center gap-2.5">
                {verificationState.status === 'verified' ? (
                  <>
                    <div className="relative">
                      <BadgeCheck className="h-4 w-4 text-success" />
                      {/* Animated pulse ring */}
                      <span className="absolute inset-0 rounded-full bg-success/30 animate-ping" />
                    </div>
                    <span className="text-xs font-semibold text-success">FMCSA Verified</span>
                    {verificationState.fmcsa?.legalName && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {verificationState.fmcsa.legalName}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4 text-muted-foreground opacity-50" />
                    <span className="text-xs font-medium text-foreground">Get Verified</span>
                    <span className="text-xs text-muted-foreground">
                      {verificationState.completedCount}/{verificationState.requirements.length}
                    </span>
                    <Link
                      href="/dashboard/settings/company-profile"
                      className="text-xs text-primary hover:underline ml-1"
                    >
                      Start →
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Vertical divider */}
            {verificationState && mode !== 'broker' && (
              <div className="h-8 w-px bg-border/40" />
            )}

            {/* Compliance Status */}
            {mode !== 'broker' && (
              <div className="flex items-center gap-2.5">
                {complianceCounts.warning + complianceCounts.urgent + complianceCounts.critical + complianceCounts.expired === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-success">All Compliant</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-medium text-foreground">Compliance Alerts</span>
                    <div className="flex gap-1.5">
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
                    <Link
                      href="/dashboard/compliance/alerts"
                      className="text-xs text-primary hover:underline ml-1"
                    >
                      View →
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Focus Widget */}
      {focusItems.length > 0 && (
        <TodaysFocus mode={mode} items={focusItems} />
      )}

      {/* Live Ops Panel - 3-Column Grid */}
      <Card className="rounded-2xl shadow-sm border-border/30 bg-card">
        <CardHeader className="py-2.5 px-5 border-b border-border/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            <CardTitle className="text-sm font-semibold tracking-tight">Live Operations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Column 1: Recent Companies */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {mode === 'broker' ? 'Recent Carriers' : 'Recent Companies'}
                </h3>
                <Link href="/dashboard/companies" className="text-[10px] text-primary hover:underline">
                  View all →
                </Link>
              </div>
              {companies.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-muted-foreground">
                  No companies yet
                </div>
              ) : (
                <div className="space-y-1.5">
                  {companies.slice(0, 3).map((company) => (
                    <Link
                      key={company.id}
                      href={`/dashboard/companies/${company.id}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                          {company.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          DOT: {company.dot_number ?? '—'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Driver Roster (for carriers/hybrid) or divider for broker */}
            {mode !== 'broker' ? (
              <div className="lg:border-l lg:pl-6 border-border/20">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Driver Roster
                  </h3>
                  <Link href="/dashboard/drivers" className="text-[10px] text-primary hover:underline">
                    View all →
                  </Link>
                </div>
                {drivers.length === 0 ? (
                  <div className="py-4 text-center text-[11px] text-muted-foreground">
                    No drivers yet
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {drivers.slice(0, 3).map((driver) => (
                      <Link
                        key={driver.id}
                        href={`/dashboard/drivers/${driver.id}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <Users className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                            {driver.first_name} {driver.last_name}
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize text-[9px] h-4">
                          {driver.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="lg:border-l lg:pl-6 border-border/20">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Marketplace Stats
                  </h3>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 p-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{statData.postedLoads} Posted Loads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{statData.activeCarriers} Active Carriers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{statData.outstandingBalance} Outstanding</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Column 3: Recent Activity */}
            <div className="lg:border-l lg:pl-6 border-border/20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                  </span>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent Activity
                  </h3>
                </div>
                <Link href="/dashboard/activity" className="text-[10px] text-primary hover:underline">
                  View all →
                </Link>
              </div>
              {recentActivities.length === 0 ? (
                <div className="py-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground opacity-20" />
                  <p className="text-[10px] text-muted-foreground">
                    {mode !== 'broker' ? 'Activity from drivers will appear here' : 'Activity from carriers will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentActivities.slice(0, 3).map((activity) => {
                    const config = activityIcons[activity.activity_type] || activityIcons.load_accepted;
                    const Icon = config.icon;
                    return (
                      <div key={activity.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className={`${config.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{activity.title}</p>
                          <span className="text-[9px] text-muted-foreground/70">
                            {timeAgo(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

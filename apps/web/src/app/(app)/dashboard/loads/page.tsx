import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import {
  getLoadsForUser,
  getLoadStatsForUser,
  type Load,
  type LoadFilters,
  type LoadStatus,
} from '@/data/loads';
import { getCompaniesForUser, type Company } from '@/data/companies';
import { getTripsForLoadAssignment, addLoadToTrip, addTripLoadInputSchema, type Trip } from '@/data/trips';
import { countByUrgencyLevel } from '@/lib/rfd-urgency';
import { LoadListFilters } from './load-list-filters';
import { LoadsTableWithSharing } from './loads-table-with-sharing';
import { ClickableStatCard } from './clickable-stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, Truck, CheckCircle, AlertCircle, CalendarClock, HelpCircle } from 'lucide-react';

interface LoadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    companyId?: string;
    rfdUrgency?: string;
  }>;
}

const LOAD_STATUSES: readonly LoadStatus[] = ['pending', 'assigned', 'in_transit', 'delivered', 'canceled'] as const;
const isLoadStatus = (value: string | undefined): value is LoadStatus =>
  value !== undefined && (LOAD_STATUSES as readonly string[]).includes(value);

const RFD_URGENCY_LEVELS = ['critical', 'urgent', 'approaching', 'normal', 'tbd'] as const;
type RFDUrgencyFilter = typeof RFD_URGENCY_LEVELS[number];
const isRFDUrgency = (value: string | undefined): value is RFDUrgencyFilter =>
  value !== undefined && (RFD_URGENCY_LEVELS as readonly string[]).includes(value);

export default async function LoadsPage({ searchParams }: LoadsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;

  const filters: LoadFilters = {
    search: params.search,
    status: isLoadStatus(params.status) ? params.status : 'all',
    companyId: params.companyId,
    rfdUrgency: isRFDUrgency(params.rfdUrgency) ? params.rfdUrgency : undefined,
  };

  let loads: Load[] = [];
  let allLoads: Load[] = []; // For computing RFD stats (unfiltered)
  let companies: Company[] = [];
  let trips: Trip[] = [];
  let stats = { totalLoads: 0, pending: 0, inTransit: 0, delivered: 0 };
  let publicBoardUrl: string | null = null;
  let publicBoardSlug: string | null = null;
  let userCompanyId: string | null = null;
  let error: string | null = null;

  // Server action to assign loads to a trip
  async function assignLoadsToTripAction(
    tripId: string,
    loadIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Add each load to the trip
      for (const loadId of loadIds) {
        // Parse through schema to apply defaults (sequence_index, role)
        const input = addTripLoadInputSchema.parse({ load_id: loadId });
        await addLoadToTrip(tripId, input, currentUser.id);
      }
      return { success: true };
    } catch (err) {
      console.error('Error assigning loads to trip:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to assign loads',
      };
    }
  }

  try {
    const supabase = await createClient();

    // Get user's company membership to fetch public board settings
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id, companies(public_board_slug, public_board_enabled)')
      .eq('user_id', user.id)
      .single();

    if (membership) {
      userCompanyId = membership.company_id;
      const companyData = membership.companies as unknown as { public_board_slug: string | null; public_board_enabled: boolean } | null;
      if (companyData?.public_board_enabled && companyData?.public_board_slug) {
        publicBoardSlug = companyData.public_board_slug;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.com';
        publicBoardUrl = `${baseUrl}/board/${publicBoardSlug}`;
      }
    }

    const [loadsResult, allLoadsResult, companiesResult, statsResult, tripsResult] = await Promise.all([
      getLoadsForUser(user.id, filters),
      getLoadsForUser(user.id), // Unfiltered for RFD stats
      getCompaniesForUser(user.id),
      getLoadStatsForUser(user.id),
      getTripsForLoadAssignment(user.id),
    ]);
    loads = loadsResult;
    allLoads = allLoadsResult;
    companies = companiesResult;
    stats = statsResult;
    trips = tripsResult;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load loads';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Loads</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your loads and assignments</p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/loads/new">Add Load</Link>
        </Button>
      </div>

      {/* Stats Cards - Status Based */}
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-4 animate-pulse"><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /></div>}>
        <div className="grid gap-4 md:grid-cols-4">
          <ClickableStatCard
            label="Total Loads"
            value={stats.totalLoads}
            icon={Package}
            iconClassName="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            filterType="status"
            filterValue="all"
          />
          <ClickableStatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            iconClassName="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
            filterType="status"
            filterValue="pending"
          />
          <ClickableStatCard
            label="In Transit"
            value={stats.inTransit}
            icon={Truck}
            iconClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            filterType="status"
            filterValue="in_transit"
          />
          <ClickableStatCard
            label="Delivered"
            value={stats.delivered}
            icon={CheckCircle}
            iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            filterType="status"
            filterValue="delivered"
          />
        </div>
      </Suspense>

      {/* RFD Urgency Stats Cards */}
      {(() => {
        const rfdCounts = countByUrgencyLevel(allLoads.map(l => ({
          rfd_date: l.rfd_date ?? null,
          rfd_date_tbd: l.rfd_date_tbd ?? null,
          trip_id: l.trip_id ?? null,
        })));

        return (
          <Suspense fallback={<div className="grid gap-4 md:grid-cols-4 animate-pulse"><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /><div className="h-24 bg-muted rounded-lg" /></div>}>
            <div className="grid gap-4 md:grid-cols-4">
              <ClickableStatCard
                label="Critical RFD"
                value={rfdCounts.critical}
                icon={AlertCircle}
                iconClassName="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                filterType="rfdUrgency"
                filterValue="critical"
              />
              <ClickableStatCard
                label="Urgent RFD"
                value={rfdCounts.urgent}
                icon={Clock}
                iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                filterType="rfdUrgency"
                filterValue="urgent"
              />
              <ClickableStatCard
                label="Approaching"
                value={rfdCounts.approaching}
                icon={CalendarClock}
                iconClassName="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                filterType="rfdUrgency"
                filterValue="approaching"
              />
              <ClickableStatCard
                label="RFD TBD"
                value={rfdCounts.tbd}
                icon={HelpCircle}
                iconClassName="bg-muted text-muted-foreground"
                filterType="rfdUrgency"
                filterValue="tbd"
              />
            </div>
          </Suspense>
        );
      })()}

      {/* Filters */}
      <LoadListFilters initialFilters={filters} companies={companies} />

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Table with Sharing Features */}
      <LoadsTableWithSharing
        loads={loads}
        publicBoardUrl={publicBoardUrl}
        publicBoardSlug={publicBoardSlug}
        userCompanyId={userCompanyId}
        trips={trips}
        onAssignToTrip={assignLoadsToTripAction}
      />
    </div>
  );
}

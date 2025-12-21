import { redirect } from 'next/navigation';
import Link from 'next/link';
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
import { countByUrgencyLevel, type RFDUrgencyLevel } from '@/lib/rfd-urgency';
import { LoadListFilters } from './load-list-filters';
import { LoadsTableWithSharing } from './loads-table-with-sharing';
import { ClickableStatCard } from './clickable-stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LoadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    companyId?: string;
    rfdUrgency?: string;
  }>;
}

const RFD_URGENCY_LEVELS: readonly RFDUrgencyLevel[] = ['critical', 'urgent', 'approaching', 'normal', 'tbd'] as const;
const isRfdUrgencyLevel = (value: string | undefined): value is RFDUrgencyLevel =>
  value !== undefined && (RFD_URGENCY_LEVELS as readonly string[]).includes(value);

const LOAD_STATUSES: readonly LoadStatus[] = ['pending', 'assigned', 'in_transit', 'delivered', 'canceled'] as const;
const isLoadStatus = (value: string | undefined): value is LoadStatus =>
  value !== undefined && (LOAD_STATUSES as readonly string[]).includes(value);

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
    rfdUrgency: isRfdUrgencyLevel(params.rfdUrgency) ? params.rfdUrgency : undefined,
  };

  // Helper to build filter URLs
  const buildFilterUrl = (filterType: 'status' | 'rfdUrgency', value: string) => {
    const urlParams = new URLSearchParams();
    if (params.search) urlParams.set('search', params.search);
    if (params.companyId) urlParams.set('companyId', params.companyId);

    if (filterType === 'status') {
      // Toggle status filter
      const isCurrentlyActive = filters.status === value;
      urlParams.set('status', isCurrentlyActive ? 'all' : value);
      // Clear rfdUrgency when selecting status
    } else {
      // Toggle rfdUrgency filter
      const isCurrentlyActive = filters.rfdUrgency === value;
      urlParams.set('status', 'all'); // Reset status when filtering by urgency
      if (!isCurrentlyActive) {
        urlParams.set('rfdUrgency', value);
      }
    }

    return `/dashboard/loads?${urlParams.toString()}`;
  };

  let loads: Load[] = [];
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

    const [loadsResult, companiesResult, statsResult, tripsResult] = await Promise.all([
      getLoadsForUser(user.id, filters),
      getCompaniesForUser(user.id),
      getLoadStatsForUser(user.id),
      getTripsForLoadAssignment(user.id),
    ]);
    loads = loadsResult;
    companies = companiesResult;
    stats = statsResult;
    trips = tripsResult;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load loads';
  }

  // Compute RFD urgency counts from loads
  const rfdCounts = countByUrgencyLevel(loads.map(l => ({
    rfd_date: l.rfd_date ?? null,
    rfd_date_tbd: l.rfd_date_tbd ?? null,
    trip_id: l.trip_id ?? null,
  })));

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <ClickableStatCard
          label="Total Loads"
          value={stats.totalLoads}
          iconName="package"
          iconClassName="bg-muted text-foreground"
          href="/dashboard/loads?status=all"
          isActive={filters.status === 'all' && !filters.rfdUrgency}
        />
        <ClickableStatCard
          label="Pending"
          value={stats.pending}
          iconName="clock"
          iconClassName="bg-yellow-500/10 text-yellow-600"
          href={buildFilterUrl('status', 'pending')}
          isActive={filters.status === 'pending'}
        />
        <ClickableStatCard
          label="In Transit"
          value={stats.inTransit}
          iconName="truck"
          iconClassName="bg-blue-500/10 text-blue-600"
          href={buildFilterUrl('status', 'in_transit')}
          isActive={filters.status === 'in_transit'}
        />
        <ClickableStatCard
          label="Delivered"
          value={stats.delivered}
          iconName="checkCircle"
          iconClassName="bg-emerald-500/10 text-emerald-600"
          href={buildFilterUrl('status', 'delivered')}
          isActive={filters.status === 'delivered'}
        />
      </div>

      {/* RFD Urgency Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <ClickableStatCard
          label="Critical RFD"
          value={rfdCounts.critical}
          iconName="alertCircle"
          iconClassName="bg-rose-500/10 text-rose-600"
          href={buildFilterUrl('rfdUrgency', 'critical')}
          isActive={filters.rfdUrgency === 'critical'}
        />
        <ClickableStatCard
          label="Urgent RFD"
          value={rfdCounts.urgent}
          iconName="clock"
          iconClassName="bg-amber-500/10 text-amber-600"
          href={buildFilterUrl('rfdUrgency', 'urgent')}
          isActive={filters.rfdUrgency === 'urgent'}
        />
        <ClickableStatCard
          label="Approaching"
          value={rfdCounts.approaching}
          iconName="calendarClock"
          iconClassName="bg-yellow-500/10 text-yellow-600"
          href={buildFilterUrl('rfdUrgency', 'approaching')}
          isActive={filters.rfdUrgency === 'approaching'}
        />
        <ClickableStatCard
          label="RFD TBD"
          value={rfdCounts.tbd}
          iconName="helpCircle"
          iconClassName="bg-muted text-muted-foreground"
          href={buildFilterUrl('rfdUrgency', 'tbd')}
          isActive={filters.rfdUrgency === 'tbd'}
        />
      </div>

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

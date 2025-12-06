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
import { LoadListFilters } from './load-list-filters';
import { LoadsTableWithSharing } from './loads-table-with-sharing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoadsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    companyId?: string;
  }>;
}

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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveboss.pro';
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalLoads}</div>
            <p className="text-xs text-muted-foreground mt-1">All loads in your system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
          </CardContent>
        </Card>
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

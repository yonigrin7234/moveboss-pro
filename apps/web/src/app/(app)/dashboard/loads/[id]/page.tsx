import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getLoadById, updateLoad } from '@/data/loads';
import { getCompaniesForUser, getWorkspaceCompanyForUser } from '@/data/companies';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { getTripsForLoadAssignment, addLoadToTrip } from '@/data/trips';
import { getPendingDisputeForLoad } from '@/data/balance-disputes';
import { normalizeOwnLoad } from '@/lib/load-detail-model';
import { type MarketplacePostingData } from './load-actions';
import { LoadDetailClient } from './LoadDetailClient';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { logAuditEvent, createMarketplacePostingMetadata, getAuditLogsForEntity } from '@/lib/audit';

interface LoadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoadDetailPage({ params }: LoadDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const load = await getLoadById(id, user.id);

  if (!load) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Load Not Found</h1>
          <p className="text-muted-foreground">
            {"The load doesn't exist or you don't have permission."}
          </p>
        </div>
        <Link
          href="/dashboard/loads"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Back to Loads
        </Link>
      </div>
    );
  }

  // Fetch related entities for dropdowns
  const [companies, drivers, trucks, trailers, trips, workspaceCompany, auditLogs, pendingDispute] = await Promise.all([
    getCompaniesForUser(user.id),
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
    getTripsForLoadAssignment(user.id),
    getWorkspaceCompanyForUser(user.id),
    getAuditLogsForEntity('load', id, { limit: 50 }),
    getPendingDisputeForLoad(id),
  ]);

  // Only brokers/moving companies can post to marketplace
  // AND only for loads belonging to the user's own company (not external company loads)
  const isOwnCompanyLoad = load.company_id === workspaceCompany?.id;
  const canPostToMarketplace = workspaceCompany?.is_broker === true && isOwnCompanyLoad;

  // Filter out trips that already have this load assigned
  const availableTrips = trips.filter((trip) => trip.id !== load.trip_id);

  // Normalize load data for shared components (messaging)
  const model = workspaceCompany
    ? normalizeOwnLoad(
        load as unknown as Record<string, unknown>,
        { id: user.id },
        { id: workspaceCompany.id, name: workspaceCompany.name }
      )
    : null;

  async function updateLoadAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'load_number',
      'service_type',
      'company_id',
      'assigned_driver_id',
      'assigned_truck_id',
      'assigned_trailer_id',
      'pickup_date',
      'pickup_window_start',
      'pickup_window_end',
      'pickup_address_line1',
      'pickup_address_line2',
      'pickup_city',
      'pickup_state',
      'pickup_postal_code',
      'pickup_country',
      'delivery_date',
      'delivery_window_start',
      'delivery_window_end',
      'delivery_address_line1',
      'delivery_address_line2',
      'delivery_city',
      'delivery_state',
      'delivery_postal_code',
      'delivery_country',
      'cubic_feet_estimate',
      'weight_lbs_estimate',
      'pieces_count',
      'description',
      'linehaul_rate',
      'packing_rate',
      'materials_rate',
      'accessorials_rate',
      'total_rate',
      'status',
      'notes',
      // Contract accessorials
      'contract_accessorials_stairs',
      'contract_accessorials_shuttle',
      'contract_accessorials_long_carry',
      'contract_accessorials_packing',
      'contract_accessorials_bulky',
      'contract_accessorials_other',
      // Dispatch contact
      'dispatch_contact_name',
      'dispatch_contact_phone',
      'internal_reference',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    try {
      const { updateLoadInputSchema } = await import('@/data/loads');
      const validated = updateLoadInputSchema.parse(cleanedData);
      await updateLoad(id, validated, user.id);
      redirect(`/dashboard/loads/${id}`);
    } catch (error) {
      // Allow Next.js redirects to bubble through
      if (error && typeof error === 'object' && 'digest' in error && `${(error as any).digest}`.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const errors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
        return { errors };
      }
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update load' } };
    }
  }

  async function postToMarketplaceAction(data: MarketplacePostingData): Promise<{ success: boolean; error?: string }> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      const supabase = await createClient();

      // Get user's workspace company for posted_by_company_id and broker check
      const { data: workspaceCompanyData } = await supabase
        .from('companies')
        .select('id, is_broker')
        .eq('owner_id', currentUser.id)
        .eq('is_workspace_company', true)
        .maybeSingle();

      // Only brokers/moving companies can post to marketplace
      if (!workspaceCompanyData?.is_broker) {
        return { success: false, error: 'Only brokers and moving companies can post to marketplace' };
      }

      // Update the load with posting status and marketplace-specific fields
      const { error } = await supabase
        .from('loads')
        .update({
          posting_status: 'posted',
          posted_at: new Date().toISOString(),
          posting_type: 'load',
          posted_by_company_id: workspaceCompanyData?.id || null,
          // Marketplace visibility - required for load to appear on load board
          is_marketplace_visible: true,
          posted_to_marketplace_at: new Date().toISOString(),
          load_status: 'pending',
          // Rate and size info - use correct DB column names
          cubic_feet_estimate: data.cubic_feet,
          rate_per_cuft: data.rate_per_cuft,
          linehaul_amount: data.linehaul_amount,
          company_rate: data.linehaul_amount,
          company_rate_type: 'flat',
          is_open_to_counter: data.is_open_to_counter,
          truck_requirement: data.truck_requirement,
        })
        .eq('id', id)
        .eq('owner_id', currentUser.id);

      if (error) throw error;

      // AUDIT LOGGING: Log marketplace posting
      logAuditEvent(supabase, {
        entityType: 'load',
        entityId: id,
        action: 'posted_to_marketplace',
        performedByUserId: currentUser.id,
        performedByCompanyId: workspaceCompanyData?.id,
        previousValue: { posting_status: 'draft' },
        newValue: { posting_status: 'posted' },
        metadata: createMarketplacePostingMetadata({
          cubicFeet: data.cubic_feet,
          ratePerCuft: data.rate_per_cuft,
          linehaulAmount: data.linehaul_amount,
          truckRequirement: data.truck_requirement,
          isOpenToCounter: data.is_open_to_counter,
        }),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post to marketplace',
      };
    }
  }

  async function assignToTripAction(tripId: string): Promise<{ success: boolean; error?: string }> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      await addLoadToTrip(
        tripId,
        {
          load_id: id,
          sequence_index: 0,
          role: 'primary',
        },
        currentUser.id
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign to trip',
      };
    }
  }

  const initialFormData = {
    load_number: load.load_number ?? undefined,
    service_type: load.service_type,
    company_id: load.company_id,
    assigned_driver_id: load.assigned_driver_id ?? undefined,
    assigned_truck_id: load.assigned_truck_id ?? undefined,
    assigned_trailer_id: load.assigned_trailer_id ?? undefined,
    pickup_date: load.pickup_date ?? undefined,
    pickup_window_start: load.pickup_window_start ?? undefined,
    pickup_window_end: load.pickup_window_end ?? undefined,
    pickup_address_line1: load.pickup_address_line1 ?? undefined,
    pickup_address_line2: load.pickup_address_line2 ?? undefined,
    pickup_city: load.pickup_city ?? undefined,
    pickup_state: load.pickup_state ?? undefined,
    pickup_postal_code: load.pickup_postal_code ?? undefined,
    pickup_country: load.pickup_country,
    delivery_date: load.delivery_date ?? undefined,
    delivery_window_start: load.delivery_window_start ?? undefined,
    delivery_window_end: load.delivery_window_end ?? undefined,
    delivery_address_line1: load.delivery_address_line1 ?? undefined,
    delivery_address_line2: load.delivery_address_line2 ?? undefined,
    delivery_city: load.delivery_city ?? undefined,
    delivery_state: load.delivery_state ?? undefined,
    delivery_postal_code: load.delivery_postal_code ?? undefined,
    delivery_country: load.delivery_country,
    cubic_feet_estimate: load.cubic_feet_estimate ?? undefined,
    weight_lbs_estimate: load.weight_lbs_estimate ?? undefined,
    pieces_count: load.pieces_count ?? undefined,
    description: load.description ?? undefined,
    linehaul_rate: load.linehaul_rate ?? undefined,
    packing_rate: load.packing_rate ?? undefined,
    materials_rate: load.materials_rate ?? undefined,
    accessorials_rate: load.accessorials_rate ?? undefined,
    total_rate: load.total_rate ?? undefined,
    status: load.status,
    notes: load.notes ?? undefined,
    // Contract accessorials
    contract_accessorials_stairs: load.contract_accessorials_stairs ?? undefined,
    contract_accessorials_shuttle: load.contract_accessorials_shuttle ?? undefined,
    contract_accessorials_long_carry: load.contract_accessorials_long_carry ?? undefined,
    contract_accessorials_packing: load.contract_accessorials_packing ?? undefined,
    contract_accessorials_bulky: load.contract_accessorials_bulky ?? undefined,
    contract_accessorials_other: load.contract_accessorials_other ?? undefined,
    // Dispatch contact
    dispatch_contact_name: load.dispatch_contact_name ?? undefined,
    dispatch_contact_phone: load.dispatch_contact_phone ?? undefined,
    // Internal reference
    internal_reference: load.internal_reference ?? undefined,
  };

  // If no workspace company, show error (user account not properly set up)
  if (!model) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configuration Required</h1>
          <p className="text-muted-foreground">
            Your account is missing a workspace company. Please contact support.
          </p>
        </div>
        <Link
          href="/dashboard/loads"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Back to Loads
        </Link>
      </div>
    );
  }

  return (
    <LoadDetailClient
      load={load}
      model={model}
      companies={companies}
      drivers={drivers}
      trucks={trucks}
      trailers={trailers}
      trips={availableTrips.map((t) => ({
        id: t.id,
        trip_number: t.trip_number,
        origin_city: t.origin_city,
        destination_city: t.destination_city,
        driver: t.driver as { first_name?: string; last_name?: string } | null,
      }))}
      auditLogs={auditLogs}
      canPostToMarketplace={canPostToMarketplace}
      isOwnCompanyLoad={isOwnCompanyLoad}
      initialFormData={initialFormData}
      pendingDispute={pendingDispute}
      onUpdate={updateLoadAction}
      onPostToMarketplace={postToMarketplaceAction}
      onAssignToTrip={assignToTripAction}
    />
  );
}

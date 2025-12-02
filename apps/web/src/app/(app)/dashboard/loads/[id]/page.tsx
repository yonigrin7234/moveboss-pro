import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getLoadById, updateLoad, type Load } from '@/data/loads';
import { getCompaniesForUser } from '@/data/companies';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { getTripsForLoadAssignment, addLoadToTrip } from '@/data/trips';
import { LoadForm } from '@/components/loads/LoadForm';
import { LoadPhotos } from '@/components/loads/LoadPhotos';
import { LoadActions, type MarketplacePostingData } from './load-actions';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

function formatStatus(status: Load['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'assigned':
      return 'Assigned';
    case 'in_transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

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
  const [companies, drivers, trucks, trailers, trips] = await Promise.all([
    getCompaniesForUser(user.id),
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
    getTripsForLoadAssignment(user.id),
  ]);

  // Filter out trips that already have this load assigned
  const availableTrips = trips.filter((trip) => trip.id !== load.trip_id);

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

      // Get user's workspace company for posted_by_company_id
      const { data: workspaceCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', currentUser.id)
        .eq('is_workspace_company', true)
        .maybeSingle();

      // Update the load with posting status and marketplace-specific fields
      const { error } = await supabase
        .from('loads')
        .update({
          posting_status: 'posted',
          posted_at: new Date().toISOString(),
          posting_type: 'load',
          posted_by_company_id: workspaceCompany?.id || null,
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

  const initialData = {
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

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {load.load_number || 'New Load'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {load.service_type && (
              <span>{load.service_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
            )}
            {load.internal_reference && (
              <span className="text-xs font-medium text-muted-foreground/80 px-2 py-0.5 bg-muted rounded">
                Ref: {load.internal_reference}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard/loads"
            className="px-4 py-2 bg-card text-foreground border border-border rounded-md hover:bg-muted"
          >
            Back to Loads
          </Link>
        </div>
      </div>

      {/* Status Badge and Actions */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              load.status === 'delivered'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : load.status === 'canceled'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : load.status === 'in_transit'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : load.status === 'assigned'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {formatStatus(load.status)}
          </span>
        </div>

        {/* Load Actions: Post to Marketplace, Assign to Trip */}
        <LoadActions
          loadId={id}
          postingStatus={load.posting_status ?? null}
          initialCubicFeet={load.cubic_feet_estimate ?? load.cubic_feet ?? null}
          trips={availableTrips.map((t) => ({
            id: t.id,
            trip_number: t.trip_number,
            origin_city: t.origin_city,
            destination_city: t.destination_city,
            driver: t.driver as { first_name?: string; last_name?: string } | null,
          }))}
          onPostToMarketplace={postToMarketplaceAction}
          onAssignToTrip={assignToTripAction}
        />
      </div>

      {/* Trip Assignment Info */}
      {load.trip_id && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This load is assigned to a trip.{' '}
            <Link href={`/dashboard/trips/${load.trip_id}`} className="font-medium underline hover:no-underline">
              View trip details
            </Link>
          </p>
        </div>
      )}

      {/* Edit Form */}
      <LoadForm
        initialData={initialData}
        companies={companies}
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
        onSubmit={updateLoadAction}
        submitLabel="Save changes"
        cancelHref={`/dashboard/loads/${id}`}
      />

      {/* Driver-Uploaded Photos */}
      <LoadPhotos load={load} />
    </div>
  );
}

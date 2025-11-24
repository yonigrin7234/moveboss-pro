import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getLoadById, updateLoad, deleteLoad, type Load } from '@/data/loads';
import { getCompaniesForUser } from '@/data/companies';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { LoadForm } from '@/components/loads/LoadForm';
import { DeleteLoadButton } from './delete-load-button';
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
  const [companies, drivers, trucks, trailers] = await Promise.all([
    getCompaniesForUser(user.id),
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
  ]);

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

  async function deleteLoadAction() {
    'use server';
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    await deleteLoad(id, user.id);
    redirect('/dashboard/loads');
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
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Job {load.job_number}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {load.load_number || 'Internal ref pending'}
          </h1>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard/loads"
            className="px-4 py-2 bg-card text-foreground border border-border rounded-md hover:bg-muted"
          >
            Back to Loads
          </Link>
          <DeleteLoadButton deleteAction={deleteLoadAction} />
        </div>
      </div>

      {/* Badge */}
      <div className="flex gap-2 mb-6">
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
    </div>
  );
}

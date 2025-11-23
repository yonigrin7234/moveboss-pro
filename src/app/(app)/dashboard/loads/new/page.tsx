import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createLoad, newLoadInputSchema } from '@/data/loads';
import { getCompaniesForUser } from '@/data/companies';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { LoadCreateForm } from '@/components/loads/LoadCreateForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

export default async function NewLoadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch related entities for dropdowns
  const [companies, drivers, trucks, trailers] = await Promise.all([
    getCompaniesForUser(user.id),
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
  ]);

  async function createLoadAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'load_type',
      'load_number',
      'reference_number',
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
      'pickup_contact_name',
      'pickup_contact_phone',
      'dropoff_address_line1',
      'dropoff_address_line2',
      'dropoff_city',
      'dropoff_state',
      'dropoff_postal_code',
      'loading_contact_name',
      'loading_contact_phone',
      'loading_contact_email',
      'loading_address_line1',
      'loading_address_line2',
      'loading_city',
      'loading_state',
      'loading_postal_code',
      'cubic_feet',
      'rate_per_cuft',
      'packing_rate',
      'materials_rate',
      'accessorials_rate',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    try {
      const validated = newLoadInputSchema.parse(cleanedData);
      const created = await createLoad(validated, user.id);
      redirect(`/dashboard/loads/${created.id}`);
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to create load' } };
    }
  }

  return (
    <CreationPageShell
      title="Add Load"
      subtitle="Create a load with assignment, timing, and revenue in a guided flow built for fast dispatch."
      pill="Operations"
      meta={[
        {
          label: 'Companies ready',
          value: companies.length ? `${companies.length} selectable` : 'Add a company first',
        },
        {
          label: 'Assignments ready',
          value: `${drivers.length} drivers · ${trucks.length} trucks · ${trailers.length} trailers`,
        },
      ]}
    >
      <LoadCreateForm
        companies={companies}
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
        onSubmit={createLoadAction}
      />
    </CreationPageShell>
  );
}

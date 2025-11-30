import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createLoad, newLoadInputSchema } from '@/data/loads';
import { getCompaniesForUser } from '@/data/companies';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { getTripsForLoadAssignment, addLoadToTrip } from '@/data/trips';
import { getStorageLocations, createStorageLocation, type StorageLocation } from '@/data/storage-locations';
import { LoadCreateForm } from '@/components/loads/LoadCreateForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

export default async function NewLoadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch related entities for dropdowns
  const [companies, drivers, trucks, trailers, trips, storageLocations] = await Promise.all([
    getCompaniesForUser(user.id),
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
    getTripsForLoadAssignment(user.id),
    getStorageLocations(user.id),
  ]);

  async function createLoadAction(
    prevState: { errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean; loadId?: string; tripId?: string } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'load_type',
      'load_source',
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
      'balance_due',
      'customer_name',
      'customer_phone',
      'delivery_address_full',
      'notes',
      'storage_location_id',
      'storage_unit',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    // Get optional trip assignment fields
    const tripId = formData.get('trip_id') as string | null;
    const loadOrder = formData.get('load_order') as string | null;

    try {
      const validated = newLoadInputSchema.parse(cleanedData);
      const created = await createLoad(validated, user.id);

      // If a trip was selected, attach the load to the trip
      if (tripId && created.id) {
        try {
          await addLoadToTrip(
            tripId,
            {
              load_id: created.id,
              sequence_index: loadOrder ? parseInt(loadOrder, 10) - 1 : 0, // Convert 1-based to 0-based
              role: 'primary',
            },
            user.id
          );
          return { success: true, loadId: created.id, tripId };
        } catch (tripError) {
          // Load was created but trip attachment failed - show warning
          console.error('Failed to attach load to trip:', tripError);
          return {
            success: true,
            loadId: created.id,
            errors: { _form: 'Load created but could not attach to trip. You can add it manually.' },
          };
        }
      }

      return { success: true, loadId: created.id };
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

  async function createStorageLocationAction(
    data: Partial<StorageLocation>
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    return createStorageLocation(user.id, data);
  }

  return (
    <CreationPageShell
      title="Add Load"
      subtitle="Create a load with assignment, timing, and revenue in a guided flow built for fast dispatch."
      pill="Operations"
    >
      <LoadCreateForm
        companies={companies}
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
        trips={trips}
        storageLocations={storageLocations}
        onCreateStorageLocation={createStorageLocationAction}
        onSubmit={createLoadAction}
      />
    </CreationPageShell>
  );
}

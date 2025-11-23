import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createTruck, newTruckInputSchema } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
import { TruckForm } from '@/components/fleet/TruckForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

export default async function NewTruckPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch drivers for assignment dropdown
  const drivers = await getDriversForUser(user.id);

  async function createTruckAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'unit_number',
      'plate_number',
      'plate_state',
      'vin',
      'make',
      'model',
      'year',
      'current_odometer',
      'registration_expiry',
      'inspection_expiry',
      'assigned_driver_id',
      'status',
      'vehicle_type',
      'cubic_capacity',
      'is_rental_unit',
      'rental_company',
      'rental_company_other',
      'rental_truck_number',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields, {
      booleanFields: ['is_rental_unit'],
    });
    const cleanedData = cleanFormValues(rawData);

    // Handle empty assigned_driver_id
    if (cleanedData.assigned_driver_id === '') {
      cleanedData.assigned_driver_id = null;
    }
    // Handle empty vehicle_type and cubic_capacity
    if (cleanedData.vehicle_type === '') {
      cleanedData.vehicle_type = null;
    }
    // Tractors don't have cubic capacity
    if (cleanedData.vehicle_type === 'tractor') {
      cleanedData.cubic_capacity = null;
    }
    if (cleanedData.cubic_capacity === '' || cleanedData.cubic_capacity === null) {
      cleanedData.cubic_capacity = null;
    }
    // Handle rental fields
    if (!cleanedData.is_rental_unit) {
      cleanedData.rental_company = null;
      cleanedData.rental_company_other = null;
      cleanedData.rental_truck_number = null;
    } else {
      // Clear rental_company_other if not 'other'
      if (cleanedData.rental_company !== 'other') {
        cleanedData.rental_company_other = null;
      }
      // Handle empty rental fields
      if (cleanedData.rental_company === '') {
        cleanedData.rental_company = null;
      }
      if (cleanedData.rental_truck_number === '') {
        cleanedData.rental_truck_number = null;
      }
    }

    try {
      const validated = newTruckInputSchema.parse(cleanedData);
      await createTruck(validated, user.id);
      redirect('/dashboard/fleet');
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to create truck' } };
    }
  }

  return (
    <CreationPageShell
      title="Add Truck"
      subtitle="Onboard a truck with registration, assignment, and rental details so dispatch can use it immediately."
      pill="Fleet"
      meta={[
        { label: 'Time to complete', value: '~2 minutes' },
        { label: 'Compliance', value: 'Plate, VIN, expirations' },
        { label: 'Rental ready', value: 'Ryder / Penske / Other' },
      ]}
      checklist={[
        { label: 'Vehicle & registration', detail: 'Unit number, plates, VIN, make/model/year' },
        { label: 'Status & assignment', detail: 'Active / in shop + driver assignment' },
        { label: 'Capacity & type', detail: 'Vehicle type with auto capacity suggestion' },
        { label: 'Rental config', detail: 'Rental company + unit number when applicable' },
      ]}
    >
      <TruckForm drivers={drivers} onSubmit={createTruckAction} />
    </CreationPageShell>
  );
}

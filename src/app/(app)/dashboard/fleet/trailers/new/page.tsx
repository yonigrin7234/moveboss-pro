import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createTrailer, newTrailerInputSchema } from '@/data/fleet';
import { getDriversForUser } from '@/data/drivers';
import { TrailerForm } from '@/components/fleet/TrailerForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

export default async function NewTrailerPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch drivers for assignment dropdown
  const drivers = await getDriversForUser(user.id);

  async function createTrailerAction(
    prevState: { errors?: Record<string, string>; success?: boolean; trailerId?: string } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean; trailerId?: string } | null> {
    'use server';
    const user = await getCurrentUser();
    if (!user) return { errors: { _form: 'Not authenticated' } };

    const fields = [
      'unit_number',
      'type',
      'plate_number',
      'plate_state',
      'vin',
      'make',
      'model',
      'year',
      'capacity_cuft',
      'side_doors_count',
      'registration_expiry',
      'inspection_expiry',
      'assigned_driver_id',
      'status',
      'notes',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    try {
      const validated = newTrailerInputSchema.parse(cleanedData);
      const created = await createTrailer(validated, user.id);
      return { success: true, trailerId: created.id };
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to create trailer' } };
    }
  }

  return (
    <CreationPageShell
      title="Add Trailer"
      subtitle="Capture trailer identity, specs, compliance, and assignment so the fleet view stays accurate."
      pill="Fleet"
    >
      <TrailerForm drivers={drivers} onSubmit={createTrailerAction} />
    </CreationPageShell>
  );
}

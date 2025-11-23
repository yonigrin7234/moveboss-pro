import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getDriversForUser } from '@/data/drivers';
import { getTrucksForUser, getTrailersForUser } from '@/data/fleet';
import { createTrip, newTripInputSchema } from '@/data/trips';
import { TripForm } from '@/components/trips/TripForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';

export default async function NewTripPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [drivers, trucks, trailers] = await Promise.all([
    getDriversForUser(user.id),
    getTrucksForUser(user.id),
    getTrailersForUser(user.id),
  ]);

  async function createTripAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
    'use server';

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { errors: { _form: 'Not authenticated' } };
    }

    const rawData: Record<string, string> = {};
    const fields = [
      'trip_number',
      'status',
      'driver_id',
      'truck_id',
      'trailer_id',
      'origin_city',
      'origin_state',
      'origin_postal_code',
      'destination_city',
      'destination_state',
      'destination_postal_code',
      'start_date',
      'end_date',
      'total_miles',
      'notes',
    ];

    fields.forEach((field) => {
      const value = formData.get(field);
      if (typeof value === 'string' && value.trim() !== '') {
        rawData[field] = value;
      }
    });

    const cleanedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawData)) {
      const trimmed = value.trim();
      if (trimmed) {
        cleanedData[key] = trimmed;
      }
    }

    try {
      const validated = newTripInputSchema.parse(cleanedData);
      const trip = await createTrip(validated, currentUser.id);
      redirect(`/dashboard/trips/${trip.id}`);
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

      return {
        errors: {
          _form: error instanceof Error ? error.message : 'Failed to create trip',
        },
      };
    }

    return null;
  }

  return (
    <CreationPageShell
      title="Create Trip"
      subtitle="Bundle one or more loads, assign equipment, and track trip-level performance in a single view."
      pill="Operations"
      meta={[
        { label: 'Time to complete', value: '~2 minutes' },
        { label: 'Scope', value: 'Bundle loads + timing' },
        { label: 'Assignment', value: 'Driver, truck, trailer' },
      ]}
      checklist={[
        { label: 'Identity & status', detail: 'Trip number, status, ownership' },
        { label: 'Routing', detail: 'Origin and destination with ZIPs' },
        { label: 'Dates', detail: 'Start/end dates and total miles' },
        { label: 'Notes', detail: 'Context for dispatch and finance' },
      ]}
    >
      <TripForm
        onSubmit={createTripAction}
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
        submitLabel="Create trip"
        cancelHref="/dashboard/trips"
      />
    </CreationPageShell>
  );
}

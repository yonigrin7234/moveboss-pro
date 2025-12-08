import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCarrierMarketplaceLoadDetail, assignLoadToTrip, updateLoadOperationalStatus } from '@/data/marketplace';
import { getTripsForLoadAssignment } from '@/data/trips';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { normalizeMarketplaceLoad } from '@/lib/load-detail-model';
import { LoadDetailShell } from '@/components/load-detail';
import { TripAssignmentForm } from '@/components/trip-assignment-form';
import { StatusUpdateCard } from './status-update-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketplaceLoadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [load, availableTrips, workspaceCompany] = await Promise.all([
    getCarrierMarketplaceLoadDetail(id, user.id),
    getTripsForLoadAssignment(user.id),
    getWorkspaceCompanyForUser(user.id),
  ]);

  if (!load) {
    notFound();
  }

  if (!workspaceCompany) {
    redirect('/onboarding/workspace');
  }

  // Normalize the load data for the shared UI
  const model = normalizeMarketplaceLoad(
    load as unknown as Record<string, unknown>,
    { id: user.id },
    { id: workspaceCompany.id, name: workspaceCompany.name }
  );

  // Server action to assign load to trip
  async function assignToTripAction(loadId: string, tripId: string): Promise<{ success: boolean; error?: string }> {
    'use server';

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!tripId) {
      return { success: false, error: 'No trip selected' };
    }

    const result = await assignLoadToTrip(loadId, tripId, 1);

    if (result.success) {
      revalidatePath(`/dashboard/marketplace-loads/${loadId}`);
      revalidatePath('/dashboard/marketplace-loads');
      revalidatePath(`/dashboard/trips/${tripId}`);
    }

    return result;
  }

  // Server action to update status
  async function updateStatusAction(formData: FormData) {
    'use server';

    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const newStatus = formData.get('status') as string;
    if (!newStatus) return;

    const result = await updateLoadOperationalStatus(id, user.id, newStatus);

    if (result.success) {
      revalidatePath(`/dashboard/marketplace-loads/${id}`);
      revalidatePath('/dashboard/marketplace-loads');
    }
  }

  // Prepare trip data for the form
  const tripOptions = availableTrips.map((trip) => ({
    id: trip.id,
    trip_number: trip.trip_number,
    driver: Array.isArray(trip.driver) ? trip.driver[0] : trip.driver,
  }));

  return (
    <LoadDetailShell
      model={model}
      backHref="/dashboard/marketplace-loads"
      backLabel="Back to Marketplace Loads"
      tripAssignmentSlot={
        !model.trip && (
          <TripAssignmentForm
            loadId={id}
            availableTrips={tripOptions}
            assignToTrip={assignToTripAction}
          />
        )
      }
      statusUpdateSlot={
        <StatusUpdateCard
          currentStatus={load.operational_status}
          lastStatusUpdate={load.last_status_update}
          sourceCompanyName={load.source_company_name}
          updateStatusAction={updateStatusAction}
        />
      }
    />
  );
}

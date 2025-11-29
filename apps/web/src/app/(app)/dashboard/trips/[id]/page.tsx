import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase-server';
import {
  getTripById,
  updateTrip,
  updateTripInputSchema,
  addLoadToTrip,
  addTripLoadInputSchema,
  removeLoadFromTrip,
  reorderTripLoads,
  createTripExpense,
  newTripExpenseInputSchema,
  deleteTripExpense,
  deleteTrip,
  updateTripDriverSharing,
  getLoadTripAssignments,
  type LoadTripAssignment,
} from '@/data/trips';
import { getLoadsForUser } from '@/data/loads';
import { getDriversForUser } from '@/data/drivers';
import { createTripSettlement, recalculateTripSettlement } from '@/data/settlements';
import { updateLoad, updateLoadInputSchema } from '@/data/loads';
import { getSettlementSnapshot } from '@/data/settlements';
import { TripDetailClient } from './TripDetailClient';

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

function cleanFormValues(formData: FormData | null | undefined, fields: string[]) {
  const cleaned: Record<string, string> = {};
  if (!formData) return cleaned;
  fields.forEach((field) => {
    const value = formData.get(field);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        cleaned[field] = trimmed;
      }
    }
  });
  return cleaned;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const trip = await getTripById(id, user.id);

  if (!trip) {
    return (
      <div className="p-4">
        <h1 className="text-3xl font-bold text-foreground mb-4">Trip Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This trip either does not exist or you no longer have access to it.
        </p>
        <Link
          href="/dashboard/trips"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Trips
        </Link>
      </div>
    );
  }

  const [loads, drivers, loadTripAssignmentsMap] = await Promise.all([
    getLoadsForUser(user.id),
    getDriversForUser(user.id),
    getLoadTripAssignments(user.id),
  ]);
  const settlementSnapshot = await getSettlementSnapshot(id, user.id);

  // Get load IDs already on this trip
  const loadIdsOnThisTrip = new Set(trip.loads.map((tl) => tl.load_id));

  // Convert Map to serializable object for client
  const loadTripAssignments: Record<string, LoadTripAssignment> = {};
  loadTripAssignmentsMap.forEach((value, key) => {
    loadTripAssignments[key] = value;
  });

  // Filter loads: exclude canceled and those already on this trip
  // Keep loads on other trips (they'll show trip info in dropdown)
  const availableLoads = loads.filter(
    (load) => load.status !== 'canceled' && !loadIdsOnThisTrip.has(load.id)
  );
  const activeDrivers = drivers.filter((d) => d.status === 'active');

  // Server Actions
  async function updateTripStatusAction(formData: FormData): Promise<void> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const tripId = formData.get('trip_id');
    if (typeof tripId !== 'string' || !tripId) {
      throw new Error('Missing trip id');
    }

    const payload = cleanFormValues(formData, [
      'status',
      'odometer_start',
      'odometer_start_photo_url',
      'odometer_end',
      'odometer_end_photo_url',
    ]);

    try {
      const validated = updateTripInputSchema.parse(payload);
      await updateTrip(tripId, validated, currentUser.id);
      revalidatePath(`/dashboard/trips/${tripId}`);
      revalidatePath('/dashboard/trips');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update trip status');
    }
  }

  async function addTripLoadAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const payload = {
      load_id: formData.get('load_id'),
      role: formData.get('role'),
      sequence_index: formData.get('sequence_index'),
    };

    try {
      const validated = addTripLoadInputSchema.parse(payload);
      await addLoadToTrip(id, validated, currentUser.id);
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to add load' } };
    }
  }

  async function removeTripLoadAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const loadId = formData.get('load_id');
    if (typeof loadId !== 'string' || !loadId) {
      throw new Error('Missing load id');
    }

    await removeLoadFromTrip(id, loadId, currentUser.id);
    revalidatePath(`/dashboard/trips/${id}`);
    revalidatePath('/dashboard/trips');
  }

  async function updateLoadAction(formData: FormData): Promise<void> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const loadId = formData.get('load_id');
    if (typeof loadId !== 'string' || !loadId) {
      throw new Error('Missing load id');
    }

    const entries: Record<string, any> = {};
    formData.forEach((val, key) => {
      if (key === 'load_id') return;
      entries[key] = val;
    });

    try {
      const validated = updateLoadInputSchema.parse(entries);
      await updateLoad(loadId, validated, currentUser.id);
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update load');
    }
  }

  async function createExpenseAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const payload = {
      trip_id: id,
      category: formData.get('category'),
      amount: formData.get('amount'),
      description: formData.get('description'),
      incurred_at: formData.get('incurred_at'),
      expense_type: formData.get('expense_type'),
      paid_by: formData.get('paid_by'),
      receipt_photo_url: formData.get('receipt_photo_url'),
      notes: formData.get('notes'),
    };

    try {
      const validated = newTripExpenseInputSchema.parse(payload);
      await createTripExpense(validated, currentUser.id);
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to add expense' } };
    }
  }

  async function deleteExpenseAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const expenseId = formData.get('expense_id');
    if (typeof expenseId !== 'string' || !expenseId) {
      throw new Error('Missing expense id');
    }

    await deleteTripExpense(expenseId, currentUser.id);
    revalidatePath(`/dashboard/trips/${id}`);
    revalidatePath('/dashboard/trips');
  }

  async function settleTripAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean; settlementId?: string } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const tripId = formData.get('trip_id');
    if (typeof tripId !== 'string' || !tripId) {
      return { errors: { _form: 'Missing trip id' } };
    }

    try {
      const settlement = await createTripSettlement(tripId, currentUser.id);
      revalidatePath(`/dashboard/trips/${tripId}`);
      revalidatePath('/dashboard/trips');
      return { success: true, settlementId: settlement.id };
    } catch (error) {
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to settle trip' } };
    }
  }

  async function deleteTripAction() {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    await deleteTrip(id, currentUser.id);
    revalidatePath('/dashboard/trips');
  }

  async function updateDriverSharingAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const shareValue = formData.get('share_driver_with_companies');
    const shareWithCompanies = shareValue === 'true';

    try {
      await updateTripDriverSharing(id, shareWithCompanies, currentUser.id);
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
    } catch (error) {
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update driver sharing' } };
    }
  }

  async function recalculateSettlementAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const tripId = formData.get('trip_id');
    if (typeof tripId !== 'string' || !tripId) {
      return { errors: { _form: 'Missing trip id' } };
    }

    try {
      await recalculateTripSettlement(tripId, currentUser.id);
      revalidatePath(`/dashboard/trips/${tripId}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
    } catch (error) {
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to recalculate settlement' } };
    }
  }

  async function reorderLoadsAction(
    items: { load_id: string; sequence_index: number }[]
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    try {
      await reorderTripLoads(id, items, currentUser.id);
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
    } catch (error) {
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to reorder loads' } };
    }
  }

  async function reassignDriverAction(
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean } | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const driverId = formData.get('driver_id');
    // Empty string or 'unassigned' means unassign driver
    const isUnassigning = !driverId || driverId === 'unassigned';

    try {
      if (isUnassigning) {
        // To unassign, we need to set driver_id to null directly in the database
        // The updateTrip function expects undefined to trigger the clear logic
        await updateTrip(id, { driver_id: undefined } as any, currentUser.id);
      } else {
        await updateTrip(id, { driver_id: driverId as string }, currentUser.id);
      }
      revalidatePath(`/dashboard/trips/${id}`);
      revalidatePath('/dashboard/trips');
      return { success: true };
    } catch (error) {
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to reassign driver' } };
    }
  }

  return (
    <TripDetailClient
      trip={trip}
      availableLoads={availableLoads}
      availableDrivers={activeDrivers}
      loadTripAssignments={loadTripAssignments}
      settlementSnapshot={settlementSnapshot}
      actions={{
        updateTripStatus: updateTripStatusAction,
        addTripLoad: addTripLoadAction,
        removeTripLoad: removeTripLoadAction,
        updateLoad: updateLoadAction,
        createExpense: createExpenseAction,
        deleteExpense: deleteExpenseAction,
        settleTrip: settleTripAction,
        deleteTrip: deleteTripAction,
        recalculateSettlement: recalculateSettlementAction,
        updateDriverSharing: updateDriverSharingAction,
        reorderLoads: reorderLoadsAction,
        reassignDriver: reassignDriverAction,
      }}
    />
  );
}

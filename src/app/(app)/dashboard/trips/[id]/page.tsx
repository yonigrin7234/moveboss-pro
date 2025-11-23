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
  createTripExpense,
  newTripExpenseInputSchema,
  updateTripExpense,
  updateTripExpenseInputSchema,
  deleteTripExpense,
  deleteTrip,
  type TripStatus,
} from '@/data/trips';
import { getLoadsForUser } from '@/data/loads';
import { TripOverviewCard, type TripOverviewFormState } from '@/components/trips/TripOverviewCard';
import { TripLoadsCard, type TripLoadFormState } from '@/components/trips/TripLoadsCard';
import { TripExpensesCard, type TripExpenseFormState } from '@/components/trips/TripExpensesCard';
import { DeleteTripButton } from './delete-trip-button';

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusBadgeClasses: Record<TripStatus, string> = {
  planned: 'bg-muted text-foreground',
  en_route: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-destructive',
};

function formatStatus(status: TripStatus) {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'en_route':
      return 'En Route';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function cleanFormValues(formData: FormData, fields: string[]) {
  const cleaned: Record<string, string> = {};
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
      <div>
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

  const loads = await getLoadsForUser(user.id);

  async function updateOverviewAction(
    prevState: TripOverviewFormState | null,
    formData: FormData
  ): Promise<TripOverviewFormState | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const cleaned = cleanFormValues(formData, ['status', 'start_date', 'end_date', 'total_miles', 'notes']);

    try {
      const payload = updateTripInputSchema.parse(cleaned);
      await updateTrip(id, payload, currentUser.id);
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update trip' } };
    }
  }

  async function addTripLoadAction(
    prevState: TripLoadFormState | null,
    formData: FormData
  ): Promise<TripLoadFormState | null> {
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

  async function createTripExpenseAction(
    prevState: TripExpenseFormState | null,
    formData: FormData
  ): Promise<TripExpenseFormState | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const payload = {
      trip_id: id,
      category: formData.get('category'),
      amount: formData.get('amount'),
      description: formData.get('description'),
      incurred_at: formData.get('incurred_at'),
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

  async function updateTripExpenseAction(
    prevState: TripExpenseFormState | null,
    formData: FormData
  ): Promise<TripExpenseFormState | null> {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return { errors: { _form: 'Not authenticated' } };

    const expenseId = formData.get('expense_id');
    if (typeof expenseId !== 'string' || !expenseId) {
      return { errors: { _form: 'Missing expense id' } };
    }

    const payload = {
      category: formData.get('category'),
      amount: formData.get('amount'),
      description: formData.get('description'),
      incurred_at: formData.get('incurred_at'),
    };

    try {
      const validated = updateTripExpenseInputSchema.parse(payload);
      await updateTripExpense(expenseId, validated, currentUser.id);
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update expense' } };
    }
  }

  async function deleteTripExpenseAction(formData: FormData) {
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

  async function deleteTripAction() {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    await deleteTrip(id, currentUser.id);
    revalidatePath('/dashboard/trips');
  }

  const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : undefined;
  const truckNumber = trip.truck?.unit_number || undefined;
  const trailerNumber = trip.trailer?.unit_number || undefined;
  const availableLoads = loads.filter((load) => load.status !== 'canceled');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{trip.trip_number}</h1>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusBadgeClasses[trip.status]}`}
            >
              {formatStatus(trip.status)}
            </span>
          </div>
          <p className="text-muted-foreground mt-2">
            Driver:{' '}
            <span className="font-medium text-foreground">{driverName || 'Unassigned'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/trips"
            className="px-4 py-2 bg-card text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            Back to Trips
          </Link>
          <DeleteTripButton deleteAction={deleteTripAction} />
        </div>
      </div>

      <TripOverviewCard
        trip={trip}
        driverName={driverName}
        truckNumber={truckNumber}
        trailerNumber={trailerNumber}
        onSubmit={updateOverviewAction}
      />

      <TripLoadsCard
        tripId={trip.id}
        loads={trip.loads}
        availableLoads={availableLoads}
        onAdd={addTripLoadAction}
        onRemove={removeTripLoadAction}
      />

      <TripExpensesCard
        tripId={trip.id}
        expenses={trip.expenses}
        summary={{
          driver_pay_total: trip.driver_pay_total,
          fuel_total: trip.fuel_total,
          tolls_total: trip.tolls_total,
          other_expenses_total: trip.other_expenses_total,
        }}
        onCreate={createTripExpenseAction}
        onUpdate={updateTripExpenseAction}
        onDelete={deleteTripExpenseAction}
      />
    </div>
  );
}



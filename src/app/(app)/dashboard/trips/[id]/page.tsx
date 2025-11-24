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
import { CloseTripButton } from './CloseTripButton';
import { createTripSettlement } from '@/data/settlements';
import { updateLoad, updateLoadInputSchema } from '@/data/loads';
import { getSettlementSnapshot } from '@/data/settlements';
import { PhotoField } from '@/components/ui/photo-field';
// Simple wrapper for use as a <form action={...}> handler.
// Must match (formData: FormData) => void | Promise<void>
async function updateTripStatusSimple(formData: FormData): Promise<void> {
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
    // Errors are handled by throwing - Next.js will show them
    throw error instanceof Error ? error : new Error('Failed to update trip status');
  }
}

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusBadgeClasses: Record<TripStatus, string> = {
  planned: 'bg-muted text-foreground',
  active: 'bg-blue-100 text-blue-800',
  en_route: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  settled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-destructive',
};

function formatStatus(status: TripStatus) {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'active':
      return 'Active';
    case 'en_route':
      return 'En Route';
    case 'completed':
      return 'Completed';
    case 'settled':
      return 'Settled';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
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
  const settlementSnapshot = await getSettlementSnapshot(id, user.id);

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
      expense_type: formData.get('expense_type'),
      paid_by: formData.get('paid_by'),
      receipt_photo_url: formData.get('receipt_photo_url'),
      notes: formData.get('notes'),
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
      // Errors are handled by throwing - Next.js will show them
      throw error instanceof Error ? error : new Error('Failed to update load');
    }
  }

  async function settleTripAction(
    prevState: { errors?: Record<string, string>; success?: boolean; settlementId?: string } | null,
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

  const tripDriver = Array.isArray(trip.driver) ? trip.driver[0] : trip.driver;
  const tripTruck = Array.isArray(trip.truck) ? trip.truck[0] : trip.truck;
  const tripTrailer = Array.isArray(trip.trailer) ? trip.trailer[0] : trip.trailer;

  const driverName = tripDriver ? `${tripDriver.first_name} ${tripDriver.last_name}` : undefined;
  const truckNumber = tripTruck?.unit_number || undefined;
  const trailerNumber = tripTrailer?.unit_number || undefined;
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
          <CloseTripButton tripId={trip.id} action={settleTripAction} />
          <DeleteTripButton deleteAction={deleteTripAction} />
        </div>
      </div>

      {/* Trip Status & Odometer */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold">Trip Status & Odometer</h3>
          <form action={updateTripStatusSimple} className="space-y-3">
            <input type="hidden" name="trip_id" value={trip.id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Status</label>
                <select name="status" defaultValue={trip.status} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                  {(['planned','active','en_route','completed','settled','cancelled'] as const).map((s) => (
                    <option key={s} value={s}>{formatStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block mb-1">Odometer Start</label>
                <input
                  type="number"
                  step="0.1"
                  name="odometer_start"
                  defaultValue={trip.odometer_start || ''}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
                <PhotoField
                  name="odometer_start_photo_url"
                  label="Start photo"
                  defaultValue={trip.odometer_start_photo_url || ''}
                  description="Upload or snap the starting odometer."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block mb-1">Odometer End</label>
                <input
                  type="number"
                  step="0.1"
                  name="odometer_end"
                  defaultValue={trip.odometer_end || ''}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
                <PhotoField
                  name="odometer_end_photo_url"
                  label="End photo"
                  defaultValue={trip.odometer_end_photo_url || ''}
                  description="Upload or snap the ending odometer."
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
            >
              Update Status / Odometer
            </button>
          </form>
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

      {/* Load Editors */}
      <div className="space-y-4">
        {trip.loads.map((tl) => {
          const load = tl.load as any;
          const company = Array.isArray(load?.company) ? load.company[0] : load?.company;
          return (
            <div key={tl.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Load</p>
                  <h4 className="text-lg font-semibold">{load?.load_number || tl.load_id}</h4>
                  <p className="text-sm text-muted-foreground">{company?.name || 'Company n/a'}</p>
                </div>
              </div>
              <form action={updateLoadAction} className="space-y-3">
                <input type="hidden" name="load_id" value={tl.load_id} />
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Actual CUFT Loaded</label>
                    <input name="actual_cuft_loaded" type="number" step="0.01" defaultValue={load?.actual_cuft_loaded || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Contract Rate / CUFT</label>
                    <input name="contract_rate_per_cuft" type="number" step="0.01" defaultValue={load?.contract_rate_per_cuft || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Balance Due on Delivery</label>
                    <input name="balance_due_on_delivery" type="number" step="0.01" defaultValue={load?.balance_due_on_delivery || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Collected on Delivery</label>
                    <input name="amount_collected_on_delivery" type="number" step="0.01" defaultValue={load?.amount_collected_on_delivery || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Paid Direct to Company</label>
                    <input name="amount_paid_directly_to_company" type="number" step="0.01" defaultValue={load?.amount_paid_directly_to_company || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Load Status</label>
                    <select name="load_status" defaultValue={load?.load_status || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                      <option value="">Select</option>
                      <option value="pending">Pending</option>
                      <option value="loaded">Loaded</option>
                      <option value="delivered">Delivered</option>
                      <option value="storage_completed">Storage Completed</option>
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    ['contract_accessorials_shuttle', 'Contract Shuttle'],
                    ['contract_accessorials_stairs', 'Contract Stairs'],
                    ['contract_accessorials_long_carry', 'Contract Long Carry'],
                    ['contract_accessorials_bulky', 'Contract Bulky'],
                    ['contract_accessorials_other', 'Contract Other'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground block mb-1">{label}</label>
                      <input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    ['extra_shuttle', 'Extra Shuttle'],
                    ['extra_stairs', 'Extra Stairs'],
                    ['extra_long_carry', 'Extra Long Carry'],
                    ['extra_packing', 'Extra Packing'],
                    ['extra_bulky', 'Extra Bulky'],
                    ['extra_other', 'Extra Other'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground block mb-1">{label} (collected by driver)</label>
                      <input name={key} type="number" step="0.01" defaultValue={load?.[key] || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" name="storage_drop" defaultChecked={load?.storage_drop} className="h-4 w-4" />
                      Storage drop
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" name="company_approved_exception_delivery" defaultChecked={load?.company_approved_exception_delivery} className="h-4 w-4" />
                      Company approved exception
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground block mb-1">Storage Move-In Fee</label>
                    <input name="storage_move_in_fee" type="number" step="0.01" defaultValue={load?.storage_move_in_fee || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                    <label className="text-sm text-muted-foreground block mb-1 mt-2">Storage Daily Fee</label>
                    <input name="storage_daily_fee" type="number" step="0.01" defaultValue={load?.storage_daily_fee || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                    <label className="text-sm text-muted-foreground block mb-1 mt-2">Storage Days Billed</label>
                    <input name="storage_days_billed" type="number" step="1" defaultValue={load?.storage_days_billed || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Storage Location</label>
                    <input name="storage_location_name" defaultValue={load?.storage_location_name || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" />
                    <input name="storage_location_address" defaultValue={load?.storage_location_address || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm mt-2" />
                    <input name="storage_unit_number" defaultValue={load?.storage_unit_number || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm mt-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground block mb-1">Storage Notes</label>
                    <textarea name="storage_notes" defaultValue={load?.storage_notes || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm" rows={3} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <PhotoField
                      name="load_report_photo_url"
                      label="Load report photo"
                      defaultValue={load?.load_report_photo_url || ''}
                      description="Upload contract/load report"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Payment Method</label>
                    <select name="payment_method" defaultValue={load?.payment_method || ''} className="w-full border border-border rounded-md px-3 py-2 text-sm">
                      <option value="">Select</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="certified_check">Certified check</option>
                      <option value="customer_paid_directly_to_company">Customer paid company</option>
                    </select>
                    <input name="payment_method_notes" defaultValue={load?.payment_method_notes || ''} placeholder="Payment notes" className="w-full border border-border rounded-md px-3 py-2 text-sm mt-2" />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Save Load
                </button>
              </form>
            </div>
          );
        })}
      </div>

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

      {/* Settlement Summary */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settlement</p>
            <h3 className="text-xl font-semibold">Trip Settlement Summary</h3>
          </div>
          <CloseTripButton tripId={trip.id} action={settleTripAction} />
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <p className="text-lg font-semibold">{settlementSnapshot.settlements[0]?.status || '—'}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs uppercase text-muted-foreground">Revenue</p>
            <p className="text-lg font-semibold">
              ${settlementSnapshot.settlements[0]?.total_revenue?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs uppercase text-muted-foreground">Driver Pay</p>
            <p className="text-lg font-semibold">
              ${settlementSnapshot.settlements[0]?.total_driver_pay?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs uppercase text-muted-foreground">Profit</p>
            <p className="text-lg font-semibold">
              ${settlementSnapshot.settlements[0]?.total_profit?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Receivables</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementSnapshot.receivables.length === 0 && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={3}>No receivables yet.</td>
                    </tr>
                  )}
                  {settlementSnapshot.receivables.map((r: any) => {
                    const company = Array.isArray(r.company) ? r.company[0] : r.company;
                    return (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{company?.name || r.company_id}</td>
                      <td className="px-3 py-2">${r.amount?.toFixed(2)}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Payables</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Payee</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementSnapshot.payables.length === 0 && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={4}>No payables yet.</td>
                    </tr>
                  )}
                  {settlementSnapshot.payables.map((p: any) => {
                    const driver = Array.isArray(p.driver) ? p.driver[0] : p.driver;
                    return (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        {driver ? `${driver.first_name} ${driver.last_name}` : p.driver_id || '—'}
                      </td>
                      <td className="px-3 py-2">{p.payee_type}</td>
                      <td className="px-3 py-2">${p.amount?.toFixed(2)}</td>
                      <td className="px-3 py-2 capitalize">{p.status}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

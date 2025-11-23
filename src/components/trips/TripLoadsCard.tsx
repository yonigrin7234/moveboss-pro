'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { TripLoad, TripLoadRole } from '@/data/trips';
import type { Load } from '@/data/loads';

export type TripLoadFormState = {
  errors?: Record<string, string>;
  success?: boolean;
};

interface TripLoadsCardProps {
  tripId: string;
  loads: TripLoad[];
  availableLoads: Load[];
  onAdd: (
    prevState: TripLoadFormState | null,
    formData: FormData
  ) => Promise<TripLoadFormState | null>;
  onRemove: (formData: FormData) => Promise<void>;
}

const roleOptions: { value: TripLoadRole; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'backhaul', label: 'Backhaul' },
  { value: 'partial', label: 'Partial' },
];

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TripLoadsCard({ tripId, loads, availableLoads, onAdd, onRemove }: TripLoadsCardProps) {
  const [state, formAction, pending] = useActionState(onAdd, null);
  const assignedLoadIds = new Set(loads.map((load) => load.load_id));
  const selectableLoads = availableLoads.filter((load) => !assignedLoadIds.has(load.id));

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Loads</h2>
          <p className="text-sm text-muted-foreground">
            Attach one or more loads to build the trip manifest.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{loads.length} attached</span>
      </div>

      {loads.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-2">No loads attached yet.</p>
          <p className="text-sm text-muted-foreground">Use the form below to attach loads to this trip.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Load
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pickup
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {loads.map((tripLoad) => (
                <tr key={tripLoad.id}>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{tripLoad.sequence_index}</td>
                  <td className="px-4 py-3">
                    {tripLoad.load ? (
                      <div>
                        <Link
                          href={`/dashboard/loads/${tripLoad.load.id}`}
                          className="text-sm font-semibold text-primary hover:text-primary/80"
                        >
                          {tripLoad.load.load_number || tripLoad.load.job_number}
                        </Link>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          {tripLoad.load.status.replace('_', ' ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Load removed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {tripLoad.load?.company?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>{tripLoad.load?.pickup_city || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(tripLoad.load?.pickup_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>{tripLoad.load?.delivery_city || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(tripLoad.load?.delivery_date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-foreground">{tripLoad.role}</td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={onRemove}
                      onSubmit={(event) => {
                        if (!confirm('Remove this load from the trip?')) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="trip_id" value={tripId} />
                      <input type="hidden" name="load_id" value={tripLoad.load_id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:text-destructive font-medium"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">Attach Load</h3>
        {state?.errors?._form && (
          <div className="bg-destructive/10 border-destructive rounded-lg p-3 text-sm text-destructive mb-4">
            {state.errors._form}
          </div>
        )}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
            Load added to trip.
          </div>
        )}
        <form action={formAction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="hidden" name="trip_id" value={tripId} />
          <div className="md:col-span-2">
            <label htmlFor="trip_load_select" className="block text-sm font-medium text-foreground mb-1">
              Load
            </label>
            <select
              id="trip_load_select"
              name="load_id"
              defaultValue=""
              disabled={selectableLoads.length === 0}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm disabled:bg-muted"
            >
              <option value="">Select load</option>
              {selectableLoads.map((load) => (
                <option key={load.id} value={load.id}>
                  {(load.load_number || load.job_number)} • {load.company?.name || 'No customer'}
                </option>
              ))}
            </select>
            {state?.errors?.load_id && (
              <p className="text-xs text-red-600 mt-1">{state.errors.load_id}</p>
            )}
          </div>
          <div>
            <label htmlFor="trip_load_role" className="block text-sm font-medium text-foreground mb-1">
              Role
            </label>
            <select
              id="trip_load_role"
              name="role"
              defaultValue="primary"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state?.errors?.role && (
              <p className="text-xs text-red-600 mt-1">{state.errors.role}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="trip_load_sequence"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Sequence
            </label>
            <input
              id="trip_load_sequence"
              type="number"
              min="0"
              name="sequence_index"
              defaultValue="0"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.sequence_index && (
              <p className="text-xs text-red-600 mt-1">{state.errors.sequence_index}</p>
            )}
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={pending || selectableLoads.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Adding...' : 'Add Load'}
            </button>
          </div>
        </form>
        {selectableLoads.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            All available loads are already attached. Create a new load to add more.
          </p>
        )}
      </div>
    </div>
  );
}


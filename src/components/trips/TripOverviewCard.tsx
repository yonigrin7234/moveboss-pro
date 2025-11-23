'use client';

import { useActionState } from 'react';
import type { TripStatus } from '@/data/trips';

export type TripOverviewFormState = {
  errors?: Record<string, string>;
  success?: boolean;
};

interface TripOverviewCardProps {
  trip: {
    status: TripStatus;
    origin_city: string | null;
    origin_state: string | null;
    origin_postal_code: string | null;
    destination_city: string | null;
    destination_state: string | null;
    destination_postal_code: string | null;
    start_date: string | null;
    end_date: string | null;
    total_miles: number | null;
    notes: string | null;
    revenue_total: number;
    driver_pay_total: number;
    fuel_total: number;
    tolls_total: number;
    other_expenses_total: number;
    profit_total: number;
  };
  driverName?: string;
  truckNumber?: string;
  trailerNumber?: string;
  onSubmit: (
    prevState: TripOverviewFormState | null,
    formData: FormData
  ) => Promise<TripOverviewFormState | null>;
}

const statusOptions: { value: TripStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'en_route', label: 'En Route' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatLocation(city: string | null, state: string | null, postal: string | null) {
  const parts = [city, state, postal].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TripOverviewCard({
  trip,
  driverName,
  truckNumber,
  trailerNumber,
  onSubmit,
}: TripOverviewCardProps) {
  const [state, formAction, pending] = useActionState(onSubmit, null);

  const expensesTotal =
    (trip.driver_pay_total || 0) +
    (trip.fuel_total || 0) +
    (trip.tolls_total || 0) +
    (trip.other_expenses_total || 0);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
              Route
            </h3>
            <p className="text-foreground text-lg font-medium">
              {formatLocation(trip.origin_city, trip.origin_state, trip.origin_postal_code)}
            </p>
            <p className="text-muted-foreground text-sm">↓</p>
            <p className="text-foreground text-lg font-medium">
              {formatLocation(
                trip.destination_city,
                trip.destination_state,
                trip.destination_postal_code
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Start</div>
              <div className="text-foreground font-medium">{formatDate(trip.start_date)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">End</div>
              <div className="text-foreground font-medium">{formatDate(trip.end_date)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Miles</div>
              <div className="text-foreground font-medium">
                {typeof trip.total_miles === 'number' ? trip.total_miles.toFixed(1) : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Assignment</div>
              <div className="text-foreground font-medium">
                {driverName || 'Unassigned'}
              </div>
              <div className="text-xs text-muted-foreground">
                {truckNumber ? `Truck ${truckNumber}` : 'No truck'}
                {' • '}
                {trailerNumber ? `Trailer ${trailerNumber}` : 'No trailer'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Revenue</div>
            <div className="text-2xl font-semibold text-foreground">
              {currencyFormatter.format(trip.revenue_total || 0)}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Expenses</div>
            <div className="text-2xl font-semibold text-foreground">
              {currencyFormatter.format(expensesTotal)}
            </div>
          </div>
          <div className="bg-gray-900 text-white rounded-lg p-4 col-span-2">
            <div className="text-xs uppercase tracking-wide opacity-80">Profit</div>
            <div className="text-3xl font-semibold">
              {currencyFormatter.format(trip.profit_total || 0)}
            </div>
          </div>
        </div>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        {state?.errors?._form && (
          <div className="bg-destructive/10 border-destructive rounded-lg p-3 text-sm text-destructive">
            {state.errors._form}
          </div>
        )}
        {state?.success && !state.errors && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            Trip details updated.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="trip_status" className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              id="trip_status"
              name="status"
              defaultValue={trip.status}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {state?.errors?.status && (
              <p className="text-xs text-red-600 mt-1">{state.errors.status}</p>
            )}
          </div>
          <div>
            <label htmlFor="trip_start_date" className="block text-sm font-medium text-foreground mb-1">
              Start Date
            </label>
            <input
              id="trip_start_date"
              type="date"
              name="start_date"
              defaultValue={trip.start_date || ''}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.start_date && (
              <p className="text-xs text-red-600 mt-1">{state.errors.start_date}</p>
            )}
          </div>
          <div>
            <label htmlFor="trip_end_date" className="block text-sm font-medium text-foreground mb-1">
              End Date
            </label>
            <input
              id="trip_end_date"
              type="date"
              name="end_date"
              defaultValue={trip.end_date || ''}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.end_date && (
              <p className="text-xs text-red-600 mt-1">{state.errors.end_date}</p>
            )}
          </div>
          <div>
            <label htmlFor="trip_total_miles" className="block text-sm font-medium text-foreground mb-1">
              Total Miles
            </label>
            <input
              id="trip_total_miles"
              type="number"
              step="0.1"
              min="0"
              name="total_miles"
              defaultValue={trip.total_miles ?? ''}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
            {state?.errors?.total_miles && (
              <p className="text-xs text-red-600 mt-1">{state.errors.total_miles}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="trip_notes" className="block text-sm font-medium text-foreground mb-1">
            Notes
          </label>
          <textarea
            id="trip_notes"
            name="notes"
            rows={4}
            defaultValue={trip.notes || ''}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
          />
          {state?.errors?.notes && (
            <p className="text-xs text-red-600 mt-1">{state.errors.notes}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Saving...' : 'Save overview'}
          </button>
        </div>
      </form>
    </div>
  );
}



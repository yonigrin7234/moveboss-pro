'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TripFilters } from '@/data/trips';
import type { Driver } from '@/data/drivers';
import { DatePicker } from '@/components/ui/date-picker';

type TripStatusValue = NonNullable<TripFilters['status']>;

interface TripListFiltersProps {
  initialFilters: TripFilters;
  drivers: Driver[];
}

export function TripListFilters({ initialFilters, drivers }: TripListFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search || '');
  const [status, setStatus] = useState<TripStatusValue>(initialFilters.status ?? 'all');
  const [driverId, setDriverId] = useState(initialFilters.driverId || '');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (driverId) params.set('driverId', driverId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const queryString = params.toString();
      router.push(queryString ? `/dashboard/trips?${queryString}` : '/dashboard/trips');
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, status, driverId, dateFrom, dateTo, router]);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="trip-search" className="block text-sm font-medium text-foreground mb-1">
            Search
          </label>
          <input
            id="trip-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Trip #, city, state..."
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
          />
        </div>
        <div>
          <label htmlFor="trip-status" className="block text-sm font-medium text-foreground mb-1">
            Status
          </label>
          <select
            id="trip-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TripStatusValue)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
          >
            <option value="all">All</option>
            <option value="planned">Planned</option>
            <option value="en_route">En Route</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label htmlFor="trip-driver" className="block text-sm font-medium text-foreground mb-1">
            Driver
          </label>
          <select
            id="trip-driver"
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
          >
            <option value="">All drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.first_name} {driver.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="trip-date-from" className="block text-sm font-medium text-foreground mb-1">
              From
            </label>
            <DatePicker
              name="trip-date-from"
              placeholder="Start date"
              defaultValue={dateFrom}
              onChange={(value) => setDateFrom(value)}
            />
          </div>
          <div>
            <label htmlFor="trip-date-to" className="block text-sm font-medium text-foreground mb-1">
              To
            </label>
            <DatePicker
              name="trip-date-to"
              placeholder="End date"
              defaultValue={dateTo}
              onChange={(value) => setDateTo(value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



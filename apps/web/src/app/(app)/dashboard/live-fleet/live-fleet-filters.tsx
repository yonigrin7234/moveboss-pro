'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LiveFleetFiltersProps {
  initialFilters: {
    availableOnly: boolean;
    minCapacity?: number;
  };
}

export function LiveFleetFilters({ initialFilters }: LiveFleetFiltersProps) {
  const router = useRouter();
  const [availableOnly, setAvailableOnly] = useState(initialFilters.availableOnly || false);
  const [minCapacity, setMinCapacity] = useState(
    initialFilters.minCapacity !== undefined ? String(initialFilters.minCapacity) : ''
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (availableOnly) params.set('availableOnly', '1');
      if (minCapacity) params.set('minCapacity', minCapacity);
      const query = params.toString();
      router.push(query ? `/dashboard/live-fleet?${query}` : '/dashboard/live-fleet');
    }, 200);

    return () => clearTimeout(timeout);
  }, [availableOnly, minCapacity, router]);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
      <label className="inline-flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 text-black border-border rounded"
          checked={availableOnly}
          onChange={(event) => setAvailableOnly(event.target.checked)}
        />
        Available only
      </label>
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="minCapacity" className="text-foreground">
          Min available cubic
        </label>
        <input
          id="minCapacity"
          type="number"
          min="0"
          value={minCapacity}
          onChange={(event) => setMinCapacity(event.target.value)}
          placeholder="0"
          className="w-32 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
        />
      </div>
    </div>
  );
}



'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { type LoadFilters, type LoadStatus } from '@/data/loads';
import { type Company } from '@/data/companies';

interface LoadListFiltersProps {
  initialFilters: LoadFilters;
  companies?: Company[];
}

export function LoadListFilters({ initialFilters, companies = [] }: LoadListFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search || '');
  const [status, setStatus] = useState<string>(initialFilters.status || 'all');
  const [companyId, setCompanyId] = useState(initialFilters.companyId || '');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    if (companyId) params.set('companyId', companyId);

    const timeoutId = setTimeout(() => {
      router.push(`/dashboard/loads?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, companyId, router]);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Load number, reference, company name..."
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div>
          <label htmlFor="companyId" className="block text-sm font-medium text-foreground mb-1">
            Company
          </label>
          <select
            id="companyId"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

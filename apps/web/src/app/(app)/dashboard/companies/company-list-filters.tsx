'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { type CompanyFilters } from '@/data/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompanyListFiltersProps {
  initialFilters: CompanyFilters;
}

export function CompanyListFilters({ initialFilters }: CompanyListFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search || '');
  const [type, setType] = useState<string>(initialFilters.type || 'all');
  const [role, setRole] = useState<string>(initialFilters.role || 'all');
  const [status, setStatus] = useState<string>(initialFilters.status || 'all');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type && type !== 'all') params.set('type', type);
    if (role && role !== 'all') params.set('role', role);
    if (status && status !== 'all') params.set('status', status);

    const timeoutId = setTimeout(() => {
      const query = params.toString();
      router.push(query ? `/dashboard/companies?${query}` : '/dashboard/companies');
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, type, role, status, router]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-foreground">
              Search
            </Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, DOT, MC..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type" className="text-foreground">
              Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="carrier">Carrier</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
                <SelectItem value="carrier_broker">Carrier + Broker</SelectItem>
                <SelectItem value="shipper">Shipper</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-foreground">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="takes_loads_from">Takes Loads From</SelectItem>
                <SelectItem value="gives_loads_to">Gives Loads To</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status" className="text-foreground">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


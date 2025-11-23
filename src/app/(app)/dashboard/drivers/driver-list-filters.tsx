'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { type DriverFilters } from '@/data/drivers';
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

interface DriverListFiltersProps {
  initialFilters: DriverFilters;
}

export function DriverListFilters({ initialFilters }: DriverListFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialFilters.search || '');
  const [status, setStatus] = useState<string>(initialFilters.status || 'all');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    const timeoutId = setTimeout(() => {
      router.push(`/dashboard/drivers?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, status, router]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, email..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


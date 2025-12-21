'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type FilterType = 'status' | 'rfdUrgency';

interface ClickableStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName?: string;
  filterType: FilterType;
  filterValue: string;
}

export function ClickableStatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  filterType,
  filterValue,
}: ClickableStatCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if this card's filter is currently active
  const currentStatus = searchParams.get('status') || 'all';
  const currentRfdUrgency = searchParams.get('rfdUrgency') || '';

  const isActive = filterType === 'status'
    ? currentStatus === filterValue
    : currentRfdUrgency === filterValue;

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (filterType === 'status') {
      // Clear rfdUrgency when selecting a status filter
      params.delete('rfdUrgency');

      if (isActive) {
        // If already active, reset to 'all'
        params.set('status', 'all');
      } else {
        params.set('status', filterValue);
      }
    } else if (filterType === 'rfdUrgency') {
      // Clear status filter when selecting an RFD urgency filter
      params.set('status', 'all');

      if (isActive) {
        // If already active, clear the filter
        params.delete('rfdUrgency');
      } else {
        params.set('rfdUrgency', filterValue);
      }
    }

    router.push(`/dashboard/loads?${params.toString()}`);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        isActive && 'ring-2 ring-primary border-primary bg-primary/5'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

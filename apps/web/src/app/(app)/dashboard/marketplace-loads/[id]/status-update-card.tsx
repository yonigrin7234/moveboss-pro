'use client';

import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned_to_driver', label: 'Assigned to Driver' },
  { value: 'en_route_to_pickup', label: 'En Route to Pickup' },
  { value: 'at_pickup', label: 'At Pickup' },
  { value: 'loading', label: 'Loading' },
  { value: 'loaded', label: 'Loaded' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'at_delivery', label: 'At Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
];

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { className: string; label: string }> = {
    unassigned: { className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', label: 'Unassigned' },
    assigned_to_driver: { className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400', label: 'Assigned to Driver' },
    en_route_to_pickup: { className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400', label: 'En Route to Pickup' },
    at_pickup: { className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400', label: 'At Pickup' },
    loading: { className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400', label: 'Loading' },
    loaded: { className: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400', label: 'Loaded' },
    in_transit: { className: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400', label: 'In Transit' },
    at_delivery: { className: 'bg-green-500/20 text-green-600 dark:text-green-400', label: 'At Delivery' },
    delivered: { className: 'bg-green-500/20 text-green-600 dark:text-green-400', label: 'Delivered' },
    completed: { className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400', label: 'Completed' },
  };

  const config = statusConfig[status] || { className: '', label: status };
  return <Badge className={`${config.className} border-0`}>{config.label}</Badge>;
}

interface StatusUpdateCardProps {
  currentStatus: string;
  lastStatusUpdate?: string | null;
  sourceCompanyName: string;
  updateStatusAction: (formData: FormData) => Promise<void>;
}

export function StatusUpdateCard({
  currentStatus,
  lastStatusUpdate,
  sourceCompanyName,
  updateStatusAction,
}: StatusUpdateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Update Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateStatusAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="mb-3">
              {getStatusBadge(currentStatus)}
              {lastStatusUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(lastStatusUpdate).toLocaleString()}
                </p>
              )}
            </div>
            <Label>Change Status</Label>
            <Select name="status" defaultValue={currentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="outline" className="w-full">
            Update Status
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Status updates are shared with {sourceCompanyName}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

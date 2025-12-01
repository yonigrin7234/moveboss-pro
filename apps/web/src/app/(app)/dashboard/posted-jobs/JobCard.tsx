'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketplaceActions } from '@/components/marketplace/marketplace-actions';
import {
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
} from 'lucide-react';

export interface PostedJob {
  id: string;
  job_number: string;
  load_type: string;
  posting_type: string;
  posting_status: string;
  posted_at: string;
  pickup_date_start: string | null;
  pickup_date_end: string | null;
  pickup_date: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  current_storage_location: string | null;
  loading_city: string | null;
  loading_state: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  balance_due: number | null;
  linehaul_amount: number | null;
  assigned_carrier: { id: string; name: string } | null;
  truck_requirement: 'any' | 'semi_only' | 'box_truck_only' | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'posted':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case 'assigned':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Assigned
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Truck className="mr-1 h-3 w-3" />
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          <AlertCircle className="mr-1 h-3 w-3" />
          {status}
        </Badge>
      );
  }
}

function getTypeBadge(postingType: string, loadType: string) {
  if (postingType === 'pickup') {
    return (
      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
        <Upload className="mr-1 h-3 w-3" />
        Pickup
      </Badge>
    );
  }
  if (loadType === 'rfd') {
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
        <Package className="mr-1 h-3 w-3" />
        RFD
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600">
      <Truck className="mr-1 h-3 w-3" />
      Live Load
    </Badge>
  );
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRoute(job: PostedJob) {
  // For RFD loads, use storage location as origin
  if (job.load_type === 'rfd') {
    const origin = job.loading_city && job.loading_state
      ? `${job.loading_city}, ${job.loading_state}`
      : job.current_storage_location || 'Storage';
    const dest = job.dropoff_city && job.dropoff_state
      ? `${job.dropoff_city}, ${job.dropoff_state}`
      : job.delivery_city && job.delivery_state
        ? `${job.delivery_city}, ${job.delivery_state}`
        : '-';
    return `${origin} → ${dest}`;
  }

  // For pickups and live loads
  const origin = job.pickup_city && job.pickup_state
    ? `${job.pickup_city}, ${job.pickup_state}`
    : '-';
  const dest = job.dropoff_city && job.dropoff_state
    ? `${job.dropoff_city}, ${job.dropoff_state}`
    : job.delivery_city && job.delivery_state
      ? `${job.delivery_city}, ${job.delivery_state}`
      : '-';
  return `${origin} → ${dest}`;
}

export function JobCard({ job, requestCount }: { job: PostedJob; requestCount: number }) {
  const price = job.posting_type === 'pickup' ? job.balance_due : job.linehaul_amount;
  const priceLabel = job.posting_type === 'pickup' ? 'Balance Due' : 'Linehaul';
  const dateDisplay = job.pickup_date_start && job.pickup_date_end
    ? `${formatDate(job.pickup_date_start)} - ${formatDate(job.pickup_date_end)}`
    : formatDate(job.pickup_date);

  return (
    <Link href={`/dashboard/posted-jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">{job.job_number}</span>
                {getTypeBadge(job.posting_type, job.load_type)}
                {getStatusBadge(job.posting_status)}
                {requestCount > 0 && job.posting_status === 'posted' && (
                  <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
                    {requestCount} request{requestCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {job.truck_requirement === 'semi_only' && (
                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-0">
                    Semi Only
                  </Badge>
                )}
                {job.truck_requirement === 'box_truck_only' && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0">
                    Box Truck Only
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {getRoute(job)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {dateDisplay}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {job.cubic_feet ?? '-'} CUFT
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(price)} {priceLabel}
                </span>
              </div>
              {job.assigned_carrier && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Assigned to: </span>
                  <span className="font-medium">{job.assigned_carrier.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
              <MarketplaceActions
                loadId={job.id}
                postingStatus={job.posting_status}
                isOwner
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

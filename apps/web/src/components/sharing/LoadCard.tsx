'use client';

import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Package,
  ArrowRight,
  ExternalLink,
  Truck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRouteLocations,
  formatDate,
  type LoadLocationFields,
  type PickupDateFields,
} from '@/lib/sharing';

export interface LoadCardData extends LoadLocationFields, PickupDateFields {
  id: string;
  load_number: string;
  pickup_postal_code?: string | null;
  delivery_postal_code?: string | null;
  delivery_date?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  total_rate: number | null;
  service_type: string | null;
  description: string | null;
}

interface LoadCardProps {
  load: LoadCardData;
  showRates: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  hhg_local: 'Local Move',
  hhg_long_distance: 'Long Distance',
  commercial: 'Commercial',
  labor_only: 'Labor Only',
  packing_only: 'Packing Only',
  storage: 'Storage',
  junk_removal: 'Junk Removal',
  delivery: 'Delivery',
};

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Call';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getServiceTypeLabel(serviceType: string | null): string {
  if (!serviceType) return '';
  return SERVICE_TYPE_LABELS[serviceType] || serviceType.replace(/_/g, ' ');
}

function getServiceTypeColor(serviceType: string | null): string {
  switch (serviceType) {
    case 'hhg_long_distance':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'hhg_local':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'commercial':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'labor_only':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function LoadCard({ load, showRates, variant = 'default', className }: LoadCardProps) {
  const { origin, destination } = getRouteLocations(load);
  const pickupDate = formatDate(load.pickup_window_start || load.pickup_date);
  const deliveryDate = formatDate(load.delivery_window_start || load.delivery_date);
  const serviceLabel = getServiceTypeLabel(load.service_type);

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className={cn(
        'group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200',
        className
      )}
    >
      {/* Header with service type and load number */}
      <div className="flex items-center justify-between mb-3">
        {serviceLabel && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            getServiceTypeColor(load.service_type)
          )}>
            {serviceLabel}
          </span>
        )}
        <span className="text-xs text-slate-400 font-mono">
          #{load.load_number}
        </span>
      </div>

      {/* Route */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{origin}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
            {destination}
          </span>
        </div>
      </div>

      {/* Key details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
        {/* Pickup date */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{pickupDate}</span>
        </div>

        {/* Delivery date if different from pickup */}
        {deliveryDate && deliveryDate !== pickupDate && (
          <div className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            <span>{deliveryDate}</span>
          </div>
        )}

        {/* Cubic feet */}
        {load.cubic_feet && (
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span>{load.cubic_feet.toLocaleString()} CF</span>
          </div>
        )}
      </div>

      {/* Rate */}
      {showRates && load.total_rate ? (
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(load.total_rate)}
          </span>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View & Claim <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Contact for rate
          </span>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View & Claim <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      )}
    </Link>
  );
}

export default LoadCard;

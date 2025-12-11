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
  Zap,
  Box,
  CheckCircle2,
  CalendarCheck,
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
  // New fields
  load_type?: string | null;
  load_subtype?: string | null;
  truck_requirement?: string | null;
  rfd_date?: string | null;
  company_verified?: boolean;
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

const LOAD_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  live_load: {
    label: 'Live Load',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Zap,
  },
  rfd: {
    label: 'RFD',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Box,
  },
  pickup: {
    label: 'Pickup',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Package,
  },
};

const TRUCK_REQUIREMENT_LABELS: Record<string, string> = {
  semi_only: 'Semi Only',
  box_truck_only: 'Box Truck Only',
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

function formatLocationWithZip(city: string | null | undefined, state: string | null | undefined, zip: string | null | undefined): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  const cityState = parts.join(', ');
  if (zip && cityState) return `${cityState} ${zip}`;
  if (zip) return zip;
  return cityState || 'TBD';
}

function isReadyNow(load: LoadCardData): boolean {
  // If it's a live load, it's ready now
  if (load.load_type === 'live_load' || load.load_subtype === 'live') {
    return true;
  }

  // For RFD loads, check if rfd_date is today or in the past
  if (load.rfd_date) {
    const rfdDate = new Date(load.rfd_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rfdDate <= today;
  }

  // For pickup type loads, check pickup_date
  if (load.load_type === 'pickup') {
    const pickupDate = load.pickup_window_start || load.pickup_date;
    if (pickupDate) {
      const date = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    }
  }

  return false;
}

export function LoadCard({ load, showRates, variant = 'default', className }: LoadCardProps) {
  const originWithZip = formatLocationWithZip(load.pickup_city, load.pickup_state, load.pickup_postal_code);
  const destWithZip = formatLocationWithZip(load.delivery_city, load.delivery_state, load.delivery_postal_code);
  const pickupDate = formatDate(load.pickup_window_start || load.pickup_date);
  const deliveryDate = formatDate(load.delivery_window_start || load.delivery_date);
  const serviceLabel = getServiceTypeLabel(load.service_type);

  // Determine load type display
  const loadTypeConfig = load.load_type ? LOAD_TYPE_CONFIG[load.load_type] :
                         load.load_subtype === 'live' ? LOAD_TYPE_CONFIG['live_load'] :
                         load.load_subtype === 'rfd' ? LOAD_TYPE_CONFIG['rfd'] : null;

  const truckLabel = load.truck_requirement ? TRUCK_REQUIREMENT_LABELS[load.truck_requirement] : null;
  const readyNow = isReadyNow(load);

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className={cn(
        'group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200',
        className
      )}
    >
      {/* Header badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Load type badge */}
        {loadTypeConfig && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1',
            loadTypeConfig.color
          )}>
            <loadTypeConfig.icon className="h-3 w-3" />
            {loadTypeConfig.label}
          </span>
        )}

        {/* Service type badge */}
        {serviceLabel && !loadTypeConfig && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            getServiceTypeColor(load.service_type)
          )}>
            {serviceLabel}
          </span>
        )}

        {/* Ready now indicator */}
        {readyNow && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ready Now
          </span>
        )}

        {/* Truck requirement badge */}
        {truckLabel && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {truckLabel}
          </span>
        )}

        {/* Company verified badge */}
        {load.company_verified && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        )}

        {/* Load number */}
        <span className="text-xs text-slate-400 font-mono ml-auto">
          #{load.load_number}
        </span>
      </div>

      {/* Route with ZIP codes */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{originWithZip}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
            {destWithZip}
          </span>
        </div>
      </div>

      {/* Key details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
        {/* Pickup date */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-400">Pick:</span>
          <span>{pickupDate}</span>
        </div>

        {/* Delivery date if different from pickup */}
        {deliveryDate && deliveryDate !== pickupDate && (
          <div className="flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Del:</span>
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
          <div>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(load.total_rate)}
            </span>
            {load.rate_per_cuft && (
              <span className="ml-2 text-xs text-slate-400">
                ({formatCurrency(load.rate_per_cuft)}/CF)
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View & Claim <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {showRates ? 'Rate not set' : 'Contact for rate'}
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

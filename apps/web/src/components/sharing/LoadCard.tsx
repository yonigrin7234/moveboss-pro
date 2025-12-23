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
  // Load type fields
  load_type?: string | null;
  load_subtype?: string | null;
  truck_requirement?: string | null;
  rfd_date?: string | null;
  company_verified?: boolean;
  // Marketplace fields
  is_open_to_counter?: boolean;
  available_date?: string | null;
  posting_type?: string | null;
  pickup_date_start?: string | null;
  pickup_date_end?: string | null;
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

  // For RFD loads with no rfd_date, it's ready now
  if ((load.load_type === 'rfd' || load.load_subtype === 'rfd') && !load.rfd_date) {
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
  if (load.load_type === 'pickup' || load.posting_type === 'pickup') {
    const pickupDate = load.pickup_window_start || load.pickup_date || load.pickup_date_start;
    if (pickupDate) {
      const date = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    }
  }

  return false;
}

// Format date display based on load type - matches marketplace logic
function formatDateDisplay(load: LoadCardData): string {
  // For pickups, show date range
  if (load.posting_type === 'pickup' || load.load_type === 'pickup') {
    const start = load.pickup_date_start || load.pickup_window_start || load.pickup_date;
    const end = load.pickup_date_end || load.pickup_window_end;

    if (start && end && start !== end) {
      const startStr = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr}-${endStr}`;
    }
    if (start) {
      return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  }

  // For RFD loads, show ready date
  if (load.load_type === 'rfd' || load.load_subtype === 'rfd') {
    if (!load.rfd_date) return 'Ready Now';
    const rfdDate = new Date(load.rfd_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (rfdDate <= today) return 'Ready Now';
    return `Ready ${rfdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  // For live loads, show available date
  if (load.load_type === 'live_load' || load.load_subtype === 'live') {
    if (load.available_date) {
      return new Date(load.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return 'Available Now';
  }

  // Default: show pickup date if available
  const pickupDate = load.pickup_window_start || load.pickup_date;
  if (pickupDate) {
    return new Date(pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return '';
}

export function LoadCard({ load, showRates, variant = 'default', className }: LoadCardProps) {
  const originWithZip = formatLocationWithZip(load.pickup_city, load.pickup_state, load.pickup_postal_code);
  const destWithZip = formatLocationWithZip(load.delivery_city, load.delivery_state, load.delivery_postal_code);
  const serviceLabel = getServiceTypeLabel(load.service_type);

  // Use smart date display based on load type (matches marketplace)
  const dateDisplay = formatDateDisplay(load);
  const readyNow = isReadyNow(load);

  // Determine load type display
  const loadTypeConfig = load.load_type ? LOAD_TYPE_CONFIG[load.load_type] :
                         load.load_subtype === 'live' ? LOAD_TYPE_CONFIG['live_load'] :
                         load.load_subtype === 'rfd' ? LOAD_TYPE_CONFIG['rfd'] : null;

  const truckLabel = load.truck_requirement ? TRUCK_REQUIREMENT_LABELS[load.truck_requirement] : null;

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className={cn(
        'group block bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all duration-200',
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

        {/* Ready now indicator - only show if date doesn't already say "Ready Now" */}
        {readyNow && !dateDisplay.includes('Ready') && !dateDisplay.includes('Available') && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ready Now
          </span>
        )}

        {/* Open to offers badge */}
        {load.is_open_to_counter && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            Open to offers
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
        {/* Smart date display based on load type */}
        {dateDisplay && (
          <div className="flex items-center gap-1.5">
            {dateDisplay.includes('Ready') || dateDisplay.includes('Available') ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{dateDisplay}</span>
          </div>
        )}

        {/* Cubic feet */}
        {load.cubic_feet && (
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span>{load.cubic_feet.toLocaleString()} CF</span>
            {showRates && load.rate_per_cuft && (
              <span className="text-slate-400">@ ${load.rate_per_cuft.toFixed(2)}/CF</span>
            )}
          </div>
        )}
      </div>

      {/* Rate - matches marketplace: "Linehaul" label */}
      {showRates && load.total_rate ? (
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-xs text-slate-400">Linehaul</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(load.total_rate)}
            </p>
          </div>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View & Claim <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-xs text-slate-400">Linehaul</p>
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">
              {showRates ? 'Make an offer' : 'Contact for rate'}
            </p>
          </div>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View & Claim <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      )}
    </Link>
  );
}

export default LoadCard;

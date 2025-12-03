'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Package,
  ArrowRight,
  Truck,
  ExternalLink,
  Clock,
  AlertCircle,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Load {
  id: string;
  load_number: string;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_date: string | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_date: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  total_rate: number | null;
  service_type: string | null;
  description: string | null;
}

interface Company {
  name: string;
  slug: string | null;
  logo_url: string | null;
  show_rates: boolean;
}

interface SharePageClientProps {
  company: Company | null;
  loads: Load[];
  expiresAt: string | null;
  totalLoads: number;
  availableLoads: number;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Call';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatExpiryTime(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return 'Expires soon';
}

function LoadCard({ load, showRates }: { load: Load; showRates: boolean }) {
  const origin = load.pickup_city && load.pickup_state
    ? `${load.pickup_city}, ${load.pickup_state}`
    : load.pickup_city || load.pickup_state || 'TBD';

  const dest = load.delivery_city && load.delivery_state
    ? `${load.delivery_city}, ${load.delivery_state}`
    : load.delivery_city || load.delivery_state || 'TBD';

  const pickupDate = formatDate(load.pickup_window_start || load.pickup_date);

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      {/* Route */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>{origin}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
            {dest}
          </span>
        </div>
      </div>

      {/* Key details row */}
      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300 mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{pickupDate}</span>
        </div>
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

export function SharePageClient({
  company,
  loads,
  expiresAt,
  totalLoads,
  availableLoads,
}: SharePageClientProps) {
  const unavailableCount = totalLoads - availableLoads;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              <Image
                src={company.logo_url}
                alt={company.name}
                width={56}
                height={56}
                className="rounded-xl object-contain bg-slate-100 dark:bg-slate-800"
              />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                <Truck className="h-7 w-7 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {company?.name || 'Shared Loads'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {availableLoads} {availableLoads === 1 ? 'load' : 'loads'} available
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Expiration Badge */}
        {expiresAt && (
          <div className="inline-flex items-center gap-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-4 py-2 mb-6">
            <Clock className="h-4 w-4" />
            <span>{formatExpiryTime(expiresAt)}</span>
          </div>
        )}

        {/* Unavailable Notice */}
        {unavailableCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {unavailableCount} {unavailableCount === 1 ? 'load' : 'loads'} no longer available
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                Some loads have been claimed since this link was shared.
              </p>
            </div>
          </div>
        )}

        {/* Loads Grid */}
        {loads.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {loads.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                showRates={company?.show_rates ?? true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl mb-8">
            <Box className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No loads available
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              All loads in this share have been claimed or removed.
            </p>
          </div>
        )}

        {/* View Full Board CTA */}
        {company?.slug && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Looking for more loads?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Browse all available loads from {company.name}
            </p>
            <Link href={`/board/${company.slug}`}>
              <Button variant="outline" className="border-slate-200 dark:border-slate-700">
                View Full Load Board
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              Powered by <span className="font-medium text-slate-600 dark:text-slate-300">MoveBoss Pro</span>
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/login"
                className="text-slate-500 hover:text-primary transition-colors"
              >
                Carrier Login
              </Link>
              <a
                href="https://moveboss.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-primary transition-colors"
              >
                Get MoveBoss
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

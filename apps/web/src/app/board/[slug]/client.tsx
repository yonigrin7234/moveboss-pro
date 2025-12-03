'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  Calendar,
  Package,
  ArrowRight,
  Search,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Truck,
  ExternalLink,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getRouteLocations,
  formatDate,
  type LoadLocationFields,
  type PickupDateFields,
} from '@/lib/sharing';

interface Load extends LoadLocationFields, PickupDateFields {
  id: string;
  load_number: string;
  pickup_postal_code?: string | null;
  delivery_postal_code?: string | null;
  cubic_feet: number | null;
  rate_per_cuft: number | null;
  total_rate: number | null;
  service_type: string | null;
  description: string | null;
}

interface Company {
  name: string;
  slug: string;
  logo_url: string | null;
  custom_message: string | null;
  require_auth_to_claim: boolean;
  show_rates: boolean;
  contact: {
    email: string | null;
    phone: string | null;
  } | null;
}

interface PublicBoardClientProps {
  company: Company;
  initialLoads: Load[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
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

function LoadCard({ load, showRates }: { load: Load; showRates: boolean }) {
  const { origin, destination } = getRouteLocations(load);
  const pickupDate = formatDate(load.pickup_window_start || load.pickup_date);

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      {/* Route - Main focus */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>{origin}</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
            {destination}
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

      {/* Rate - prominent if shown */}
      {showRates && load.total_rate ? (
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(load.total_rate)}
          </span>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View details <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Contact for rate
          </span>
          <span className="text-xs text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1">
            View details <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      )}
    </Link>
  );
}

export function PublicBoardClient({ company, initialLoads, pagination }: PublicBoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [dest, setDest] = useState(searchParams.get('dest') || '');

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (dest) params.set('dest', dest);
    router.push(`/board/${company.slug}${params.toString() ? `?${params.toString()}` : ''}`);
  }, [origin, dest, company.slug, router]);

  const goToPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/board/${company.slug}?${params.toString()}`);
  }, [company.slug, router, searchParams]);

  const hasFilters = origin || dest;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Company branding */}
            <div className="flex items-center gap-4">
              {company.logo_url ? (
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
                  {company.name}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Available Loads
                </p>
              </div>
            </div>

            {/* Contact info */}
            {company.contact && (
              <div className="hidden sm:flex items-center gap-4">
                {company.contact.phone && (
                  <a
                    href={`tel:${company.contact.phone}`}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="hidden md:inline">{company.contact.phone}</span>
                  </a>
                )}
                {company.contact.email && (
                  <a
                    href={`mailto:${company.contact.email}`}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="hidden md:inline">{company.contact.email}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Custom Message */}
        {company.custom_message && (
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-700 dark:text-slate-300">{company.custom_message}</p>
          </div>
        )}

        {/* Search Bar - Clean horizontal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400 ml-2" />
              <Input
                placeholder="Origin city"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent"
              />
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-slate-400 ml-2" />
              <Input
                placeholder="Destination city"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent"
              />
            </div>
            <Button onClick={handleSearch} size="sm" className="px-4">
              <Search className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{pagination.total}</span>
            {' '}{pagination.total === 1 ? 'load' : 'loads'} available
            {hasFilters && (
              <button
                onClick={() => {
                  setOrigin('');
                  setDest('');
                  router.push(`/board/${company.slug}`);
                }}
                className="ml-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>

        {/* Loads Grid - 2 columns desktop, 1 mobile */}
        {initialLoads.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {initialLoads.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                showRates={company.show_rates}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Box className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No loads available
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {hasFilters
                ? 'Try adjusting your search filters to find more loads'
                : 'Check back soon for new load opportunities'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
              className="border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-500 dark:text-slate-400 px-4">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => goToPage(pagination.page + 1)}
              className="border-slate-200 dark:border-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer - Clean & minimal */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
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

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  ArrowRight,
  Search,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Truck,
  Box,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { LoadCard, type LoadCardData } from '@/components/sharing/LoadCard';

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
  initialLoads: LoadCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
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
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Company branding */}
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  width={56}
                  height={56}
                  className="rounded-2xl object-contain bg-slate-800 border border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center">
                  <Truck className="h-7 w-7 text-sky-400" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {company.name}
                </h1>
                <p className="text-sm text-slate-400">
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
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-sky-400 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="hidden md:inline">{company.contact.phone}</span>
                  </a>
                )}
                {company.contact.email && (
                  <a
                    href={`mailto:${company.contact.email}`}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-sky-400 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Custom Message */}
        {company.custom_message && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-300">{company.custom_message}</p>
          </div>
        )}

        {/* Search Bar - Clean horizontal */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400 ml-2" />
              <Input
                placeholder="Origin city"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent text-white placeholder:text-slate-500"
              />
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex-1 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-slate-400 ml-2" />
              <Input
                placeholder="Destination city"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 px-2 bg-transparent text-white placeholder:text-slate-500"
              />
            </div>
            <Button onClick={handleSearch} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white border-0 px-4">
              <Search className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-white">{pagination.total}</span>
            {' '}{pagination.total === 1 ? 'load' : 'loads'} available
            {hasFilters && (
              <button
                onClick={() => {
                  setOrigin('');
                  setDest('');
                  router.push(`/board/${company.slug}`);
                }}
                className="ml-2 text-sky-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>

        {/* Loads Grid - responsive columns */}
        {initialLoads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {initialLoads.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                showRates={company.show_rates}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-2xl">
            <Box className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No loads available
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
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
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400 px-4">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => goToPage(pagination.page + 1)}
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* MoveBoss Logo */}
            <div className="flex items-center gap-2">
              <Logo size={32} className="text-sky-400" />
              <span className="text-lg font-semibold text-white">MoveBoss Pro</span>
            </div>
            <p className="text-xs text-slate-500">
              The modern platform for moving companies
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/login"
                className="text-slate-400 hover:text-sky-400 transition-colors"
              >
                Carrier Login
              </Link>
              <a
                href="https://moveboss.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-sky-400 transition-colors"
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

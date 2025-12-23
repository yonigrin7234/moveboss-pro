'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Truck,
  Clock,
  AlertCircle,
  Box,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadCard, type LoadCardData } from '@/components/sharing/LoadCard';

interface Company {
  name: string;
  slug: string | null;
  logo_url: string | null;
  show_rates: boolean;
}

interface SharePageClientProps {
  company: Company | null;
  loads: LoadCardData[];
  expiresAt: string | null;
  totalLoads: number;
  availableLoads: number;
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

export function SharePageClient({
  company,
  loads,
  expiresAt,
  totalLoads,
  availableLoads,
}: SharePageClientProps) {
  const unavailableCount = totalLoads - availableLoads;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header with gradient accent */}
      <header className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-lg mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center text-center gap-4">
            {company?.logo_url ? (
              <div className="relative">
                <div className="absolute inset-0 bg-sky-500/20 rounded-2xl blur-xl" />
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  width={72}
                  height={72}
                  className="relative rounded-2xl object-contain bg-slate-800/50 backdrop-blur border border-slate-700/50"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-sky-500/30 rounded-2xl blur-xl" />
                <div className="relative w-[72px] h-[72px] bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <Truck className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {company?.name || 'Shared Loads'}
              </h1>
              <p className="text-sm text-slate-400">
                {availableLoads} {availableLoads === 1 ? 'load' : 'loads'} available
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        {/* Expiration Badge */}
        {expiresAt && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 text-sm bg-slate-800/50 backdrop-blur border border-slate-700/50 text-slate-300 rounded-full px-4 py-2">
              <Clock className="h-4 w-4 text-sky-400" />
              <span>{formatExpiryTime(expiresAt)}</span>
            </div>
          </div>
        )}

        {/* Unavailable Notice */}
        {unavailableCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-200">
                {unavailableCount} {unavailableCount === 1 ? 'load' : 'loads'} no longer available
              </p>
              <p className="text-amber-300/70 mt-0.5">
                Some loads have been claimed since this link was shared.
              </p>
            </div>
          </div>
        )}

        {/* Loads Grid */}
        {loads.length > 0 ? (
          <div className="space-y-4 mb-8">
            {loads.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                showRates={company?.show_rates ?? true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl mb-8">
            <Box className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No loads available
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              All loads in this share have been claimed or removed.
            </p>
          </div>
        )}

        {/* View Full Board CTA */}
        {company?.slug && (
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-emerald-500/5" />
            <div className="relative">
              <h3 className="font-semibold text-white mb-2">
                Looking for more loads?
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Browse all available loads from {company.name}
              </p>
              <Link href={`/board/${company.slug}`}>
                <Button className="bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-lg shadow-sky-500/25">
                  View Full Load Board
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* MoveBoss Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                <Truck className="h-4 w-4 text-white" />
              </div>
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

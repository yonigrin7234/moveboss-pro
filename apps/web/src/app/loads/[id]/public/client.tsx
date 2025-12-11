'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Package,
  ArrowRight,
  Truck,
  ExternalLink,
  Phone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatDateRangeDisplay,
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
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  delivery_date?: string | null;
  // Load type fields
  load_type?: string | null;
  load_subtype?: string | null;
  rfd_date?: string | null;
  is_open_to_counter?: boolean;
}

interface RelatedLoad extends LoadLocationFields {
  id: string;
  load_number: string;
  pickup_date: string | null;
  cubic_feet: number | null;
  total_rate: number | null;
}

interface Company {
  name: string;
  slug: string | null;
  logo_url: string | null;
  require_auth_to_claim: boolean;
  show_rates: boolean;
  contact: {
    email: string | null;
    phone: string | null;
  } | null;
}

interface PublicLoadClientProps {
  load: Load;
  company: Company;
  relatedLoads: RelatedLoad[];
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

function formatServiceType(type: string | null): string {
  if (!type) return 'Moving';
  const types: Record<string, string> = {
    hhg_local: 'Local Move',
    hhg_long_distance: 'Long Distance',
    commercial: 'Commercial',
    storage_in: 'Storage In',
    storage_out: 'Storage Out',
    freight: 'Freight',
    other: 'Other',
  };
  return types[type] || type;
}

function RelatedLoadCard({ load, showRates }: { load: RelatedLoad; showRates: boolean }) {
  const origin = load.pickup_city && load.pickup_state
    ? `${load.pickup_city}, ${load.pickup_state}`
    : load.pickup_city || 'Origin';
  const destination = load.delivery_city && load.delivery_state
    ? `${load.delivery_city}, ${load.delivery_state}`
    : load.delivery_city || 'Destination';

  return (
    <Link
      href={`/loads/${load.id}/public`}
      className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
          <span className="truncate max-w-[90px]">{origin}</span>
          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
          <span className="truncate max-w-[90px] font-medium">{destination}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        {load.cubic_feet && <span>{load.cubic_feet} CF</span>}
        {showRates && load.total_rate && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {formatCurrency(load.total_rate)}
          </span>
        )}
      </div>
    </Link>
  );
}

export function PublicLoadClient({ load, company, relatedLoads }: PublicLoadClientProps) {
  const [showClaimOptions, setShowClaimOptions] = useState(false);

  // Format locations with ZIP codes
  const origin = formatLocationWithZip(load.pickup_city, load.pickup_state, load.pickup_postal_code);
  const destination = formatLocationWithZip(load.delivery_city, load.delivery_state, load.delivery_postal_code);

  const pickupDate = formatDateRangeDisplay(
    load.pickup_window_start || load.pickup_date,
    load.pickup_window_end
  );

  const deliveryDate = formatDateRangeDisplay(
    load.delivery_window_start || load.delivery_date,
    load.delivery_window_end
  );

  const handleClaimClick = async () => {
    setShowClaimOptions(true);
    try {
      await fetch(`/api/sharing/load/${load.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_click' }),
      });
    } catch {
      // Ignore tracking errors
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <Image
                src={company.logo_url}
                alt={company.name}
                width={48}
                height={48}
                className="rounded-xl object-contain bg-slate-100 dark:bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{company.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Load #{load.load_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-6">
          {/* Route Section */}
          <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Origin</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{origin}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Destination</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{destination}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-5">
            {/* Service Type */}
            <div className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-3 py-1 rounded-full">
              {formatServiceType(load.service_type)}
            </div>

            {/* Info Grid - Smart display based on load type */}
            <div className="grid grid-cols-2 gap-4">
              {/* First date box - changes based on load type */}
              {(load.load_type === 'rfd' || load.load_subtype === 'rfd') ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Ready</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {load.rfd_date
                      ? formatDateRangeDisplay(load.rfd_date, null)
                      : 'Now'}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Pickup</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{pickupDate}</p>
                </div>
              )}
              {/* Delivery date - only show for non-RFD loads (RFD delivery is TBD until claimed) */}
              {!(load.load_type === 'rfd' || load.load_subtype === 'rfd') && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Delivery</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">{deliveryDate}</p>
                </div>
              )}
            </div>

            {/* Size and Rate */}
            <div className="grid grid-cols-2 gap-4">
              {load.cubic_feet && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                    <Package className="h-4 w-4" />
                    <span>Size</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {load.cubic_feet.toLocaleString()} CF
                    {company.show_rates && load.rate_per_cuft && (
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                        @ ${load.rate_per_cuft.toFixed(2)}/cf
                      </span>
                    )}
                  </p>
                </div>
              )}
              {company.show_rates && (() => {
                // Calculate linehaul: use total_rate, or calculate from rate_per_cuft * cubic_feet
                const calculatedLinehaul = load.total_rate
                  ? load.total_rate
                  : (load.rate_per_cuft && load.cubic_feet)
                    ? load.rate_per_cuft * load.cubic_feet
                    : null;
                const hasRate = calculatedLinehaul !== null;

                return (
                  <div className={hasRate ? "bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4" : "bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"}>
                    <p className={`text-sm mb-1 ${hasRate ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>Linehaul</p>
                    {hasRate ? (
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(calculatedLinehaul)}
                      </p>
                    ) : load.is_open_to_counter ? (
                      <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                        Open to offers
                      </p>
                    ) : (
                      <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                        Make an offer
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Description */}
            {load.description && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Details</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {load.description}
                </p>
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/30">
            {showClaimOptions ? (
              <div className="text-center">
                <p className="font-semibold text-slate-900 dark:text-white mb-4">
                  Ready to claim this load?
                </p>
                {company.require_auth_to_claim ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Sign in to your carrier account to claim
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link href="/login">
                        <Button size="lg">Sign In</Button>
                      </Link>
                      <Link href="/signup">
                        <Button variant="outline" size="lg">Create Account</Button>
                      </Link>
                    </div>
                  </div>
                ) : company.contact ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Contact {company.name} directly
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      {company.contact.phone && (
                        <a href={`tel:${company.contact.phone}`}>
                          <Button size="lg" className="w-full sm:w-auto">
                            <Phone className="h-4 w-4 mr-2" />
                            {company.contact.phone}
                          </Button>
                        </a>
                      )}
                      {company.contact.email && (
                        <a href={`mailto:${company.contact.email}?subject=Load Inquiry: ${load.load_number}&body=Hi, I'm interested in load ${load.load_number} (${origin} to ${destination}).`}>
                          <Button variant="outline" size="lg" className="w-full sm:w-auto">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Contact the carrier to claim this load
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={handleClaimClick}
              >
                Claim This Load
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Related Loads */}
        {relatedLoads.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                More from {company.name}
              </h2>
              {company.slug && (
                <Link
                  href={`/board/${company.slug}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedLoads.slice(0, 4).map((rl) => (
                <RelatedLoadCard
                  key={rl.id}
                  load={rl}
                  showRates={company.show_rates}
                />
              ))}
            </div>
          </div>
        )}

        {/* Full Board CTA */}
        {company.slug && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Browse All Loads
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              See all available loads from {company.name}
            </p>
            <Link href={`/board/${company.slug}`}>
              <Button variant="outline" className="border-slate-200 dark:border-slate-700">
                View Load Board
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
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
                href="https://moveboss.com"
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

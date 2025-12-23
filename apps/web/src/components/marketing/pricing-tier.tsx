import Link from 'next/link';
import { ReactNode } from 'react';

interface PricingTierProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function PricingTier({
  name,
  price,
  period = '/month',
  description,
  features,
  highlighted,
  badge,
  ctaText = 'Get started',
  ctaHref = '/signup',
}: PricingTierProps) {
  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl border ${
        highlighted
          ? 'bg-gradient-to-b from-sky-500/[0.08] to-transparent border-sky-500/30'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-sky-500 text-white rounded-full">
          {badge}
        </span>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
        <p className="text-sm text-white/50">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{price}</span>
          {period && <span className="text-sm text-white/40">{period}</span>}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-sm text-white/60">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={ctaHref}
        className={`w-full py-3 px-4 text-sm font-medium text-center rounded-lg transition-colors ${
          highlighted
            ? 'bg-sky-500 hover:bg-sky-400 text-white'
            : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

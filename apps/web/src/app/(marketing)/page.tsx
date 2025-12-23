import Link from 'next/link';
import { FeaturePill } from '@/components/marketing/feature-pill';
import { HeroRouteLines } from '@/components/marketing/hero-route-lines';
import { FeatureShowcase } from '@/components/marketing/feature-showcase';
import styles from '@/components/marketing/marketing.module.css';

export const metadata = {
  title: 'MoveBoss Pro - Run your entire moving operation from one place',
  description:
    'The complete platform for carriers, moving companies, and owner-operators to manage loads, drivers, finances, and compliance.',
};

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className={`relative min-h-[90vh] flex items-center overflow-hidden ${styles.heroBackground}`}>
        {/* Route Lines Animation */}
        <HeroRouteLines />

        {/* Gradient overlay at bottom */}
        <div className={`absolute inset-x-0 bottom-0 h-32 ${styles.heroFade}`} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            {/* Status Row */}
            <div className="flex gap-6 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[13px] text-white/45">Live FMCSA Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[13px] text-white/45">DOT Authority Verified</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-semibold leading-[1.1] tracking-tight mb-6 text-white">
              Run your entire{' '}
              <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">
                moving operation
              </span>{' '}
              from one place.
            </h1>

            <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-2xl">
              The complete platform for carriers, moving companies, and owner-operators to manage
              loads, drivers, finances, and compliance — all in one system.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                href="/signup"
                className="px-6 py-3 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/features"
                className="px-6 py-3 text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg border border-white/[0.08] transition-colors"
              >
                See all features
              </Link>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2">
              <FeaturePill icon="grid">Load Board</FeaturePill>
              <FeaturePill icon="bolt">Trip Management</FeaturePill>
              <FeaturePill icon="globe">Fleet Tracking</FeaturePill>
              <FeaturePill icon="dollar">Financial Brain</FeaturePill>
              <FeaturePill icon="shield">Compliance</FeaturePill>
              <FeaturePill icon="users">Driver Portal</FeaturePill>
              <FeaturePill icon="whatsapp">WhatsApp</FeaturePill>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FeatureShowcase />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Ready to streamline your operation?
          </h2>
          <p className="text-white/50 mb-8">
            Join carriers and moving companies who manage their entire business from MoveBoss.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg border border-white/[0.08] transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

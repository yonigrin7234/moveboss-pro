import Link from 'next/link';
import { HeroRouteLines } from '@/components/marketing/hero-route-lines';
import styles from '@/components/marketing/marketing.module.css';

export const metadata = {
  title: 'MoveBoss Pro - Know if your trip made money before the driver gets home',
  description:
    'Real-time trip profitability, automatic driver settlements, and compliance alerts. Built for carriers who are tired of spreadsheets.',
};

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className={`relative min-h-[85vh] flex items-center overflow-hidden ${styles.heroBackground}`}>
        <HeroRouteLines />
        <div className={`absolute inset-x-0 bottom-0 h-40 ${styles.heroFade}`} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            {/* Badge - speaks to who this is for */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
              <span className="text-[13px] text-white/60">Built for carriers and moving companies</span>
            </div>

            {/* Headline - THE pain point */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight mb-6 text-white">
              Stop guessing if your trips{' '}
              <span className="text-white/40">actually</span>{' '}
              make money.
            </h1>

            {/* Subhead - the solution */}
            <p className="text-lg md:text-xl text-white/50 leading-relaxed mb-10 max-w-2xl">
              MoveBoss calculates driver pay, tracks every expense, and shows your real profit — before the trip ends.
              No more spreadsheets. No more surprises.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-16">
              <Link
                href="/signup"
                className="px-6 py-3.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
              >
                Start free trial
              </Link>
              <Link
                href="#how-it-works"
                className="px-6 py-3.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                See how it works
              </Link>
            </div>

            {/* Social Proof - specific, not vague */}
            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>Used by 50+ carriers</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>$2M+ in settlements processed</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <p className="text-white/40 text-sm font-medium mb-4">The problem</p>
          <h2 className="text-2xl md:text-3xl font-medium text-white/80 leading-relaxed mb-16">
            You quote a trip at $4,200. Driver takes 45% plus fuel. Toll receipts get lost.
            Three weeks later you realize you made $180. <span className="text-white">Sound familiar?</span>
          </h2>

          {/* Pain points grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <PainPoint
              title="Spreadsheet settlements"
              description="Hours spent every week calculating driver pay. Disputes about mileage. Mistakes that cost you money."
            />
            <PainPoint
              title="No real-time visibility"
              description="You don't know if a trip was profitable until the driver settles. By then it's too late to fix anything."
            />
            <PainPoint
              title="Compliance surprises"
              description="Driver license expired last week. Insurance lapsed. You find out when DOT pulls you over."
            />
            <PainPoint
              title="Payment chaos"
              description="Customer says they paid. Driver says they didn't. No receipts. No proof. No resolution."
            />
          </div>
        </div>
      </section>

      {/* Feature 1: Real-time Profitability */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sky-400 text-sm font-medium mb-4">Real-time profitability</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                Know your profit before the trip ends
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                As loads get picked up and expenses get logged, your dashboard updates in real-time.
                Revenue minus driver pay minus fuel minus tolls equals your actual profit. No guessing.
              </p>
              <ul className="space-y-4">
                <FeatureItem>Automatic driver pay calculation (per-mile, per-CUFT, percentage, flat rate)</FeatureItem>
                <FeatureItem>Expense tracking with receipt photos</FeatureItem>
                <FeatureItem>Settlement created instantly when trip completes</FeatureItem>
              </ul>
            </div>
            <div className="relative">
              <ProfitabilityPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Driver Settlements */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2">
              <p className="text-emerald-400 text-sm font-medium mb-4">Automatic settlements</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                Five pay modes. Zero spreadsheets.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Per-mile. Per-cubic-foot. Percentage of revenue. Flat daily rate. Or any combination.
                MoveBoss calculates it automatically based on actual odometer readings and load data.
              </p>
              <ul className="space-y-4">
                <FeatureItem>Driver sees their earnings in real-time on the mobile app</FeatureItem>
                <FeatureItem>Rate snapshots prevent disputes about mid-trip changes</FeatureItem>
                <FeatureItem>Full audit trail for every calculation</FeatureItem>
              </ul>
            </div>
            <div className="lg:order-1">
              <SettlementPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Compliance */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-400 text-sm font-medium mb-4">Compliance alerts</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                Know before it expires
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Driver licenses, medical cards, insurance certificates, DOT inspections — all tracked in one place.
                Get alerts 30 days before anything expires. Block expired drivers from getting assigned.
              </p>
              <ul className="space-y-4">
                <FeatureItem>FMCSA integration for carrier verification</FeatureItem>
                <FeatureItem>Document storage with expiration tracking</FeatureItem>
                <FeatureItem>Configurable alert thresholds</FeatureItem>
              </ul>
            </div>
            <div>
              <CompliancePreview />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Driver Mobile App */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2">
              <p className="text-purple-400 text-sm font-medium mb-4">Driver mobile app</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                Drivers see what they earn. In real-time.
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                No more "how much am I making on this trip?" questions. Drivers see their earnings update
                as they complete loads. They collect payments, capture photos, and log expenses — all from their phone.
              </p>
              <ul className="space-y-4">
                <FeatureItem>Payment collection with Zelle, cash, and check support</FeatureItem>
                <FeatureItem>Delivery photos and damage documentation</FeatureItem>
                <FeatureItem>Odometer tracking with photo proof</FeatureItem>
              </ul>
            </div>
            <div className="lg:order-1 flex justify-center">
              <MobilePreview />
            </div>
          </div>
        </div>
      </section>

      {/* More Features - Brief */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <p className="text-white/40 text-sm font-medium mb-4 text-center">Also included</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-16">
            Everything else you need
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <SmallFeature
              title="Load Board"
              description="Post loads, browse available pickups, counter-offer rates. Smart matching suggests profitable loads."
            />
            <SmallFeature
              title="WhatsApp Sharing"
              description="Share formatted load details to WhatsApp groups. One click to reach your entire network."
            />
            <SmallFeature
              title="Receivables Tracking"
              description="See who owes you money, how long it's been outstanding, and warnings before accepting new work."
            />
            <SmallFeature
              title="Storage Management"
              description="Track items across warehouses. Payment reminders. Customer alerts for overdue units."
            />
            <SmallFeature
              title="Multi-party Messaging"
              description="Control what drivers see. Keep internal discussions internal. Full audit trail."
            />
            <SmallFeature
              title="Partner Portal"
              description="Give partners their own login. They see their loads, not yours. You control visibility."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
            Stop losing money on trips you think are profitable
          </h2>
          <p className="text-white/50 text-lg mb-10">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 text-base font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Components

function PainPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-white/70">{children}</span>
    </li>
  );
}

function SmallFeature({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-base font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  );
}

// Preview Components

function ProfitabilityPreview() {
  return (
    <div className="rounded-xl bg-[#0c0e14] border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        </div>
        <span className="text-[11px] text-white/30 ml-2">Trip TR-1847 · Live</span>
      </div>
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">Los Angeles → Phoenix → El Paso</p>
            <p className="text-sm font-medium text-white">Marcus Johnson · Truck #104</p>
          </div>
          <span className="px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
            In Progress
          </span>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[11px] text-white/40 mb-1">Total Revenue</p>
            <p className="text-2xl font-semibold text-white">$8,420</p>
            <p className="text-[10px] text-white/30">4 loads · 2,847 miles</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-[11px] text-emerald-400/60 mb-1">Net Profit</p>
            <p className="text-2xl font-semibold text-emerald-400">$2,156</p>
            <p className="text-[10px] text-emerald-400/50">25.6% margin</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Driver pay (45%)</span>
            <span className="text-white/70">-$3,789</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Fuel</span>
            <span className="text-white/70">-$1,847</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Tolls</span>
            <span className="text-white/70">-$428</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Other expenses</span>
            <span className="text-white/70">-$200</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettlementPreview() {
  return (
    <div className="rounded-xl bg-[#0c0e14] border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[11px] text-white/30">Driver Settlement</span>
      </div>
      <div className="p-5 space-y-5">
        {/* Driver Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white">
            MJ
          </div>
          <div>
            <p className="text-sm font-medium text-white">Marcus Johnson</p>
            <p className="text-xs text-white/40">45% of revenue + fuel bonus</p>
          </div>
        </div>

        {/* Pay Mode */}
        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-sky-400">Compensation Mode</span>
            <span className="text-xs text-sky-300 font-medium">Percentage</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/40 text-[10px]">Rate</p>
              <p className="text-white">45%</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px]">Revenue</p>
              <p className="text-white">$8,420</p>
            </div>
          </div>
        </div>

        {/* Calculation */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Base pay (45% × $8,420)</span>
            <span className="text-white">$3,789.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Fuel advances</span>
            <span className="text-red-400">-$800.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Insurance deduction</span>
            <span className="text-red-400">-$125.00</span>
          </div>
          <div className="border-t border-white/[0.06] pt-2 flex justify-between font-medium">
            <span className="text-white">Net to driver</span>
            <span className="text-emerald-400">$2,864.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompliancePreview() {
  return (
    <div className="rounded-xl bg-[#0c0e14] border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-white/30">Compliance Alerts</span>
        <span className="text-[10px] text-red-400">3 require attention</span>
      </div>
      <div className="p-4 space-y-3">
        <ComplianceItem
          status="expired"
          title="Driver License"
          entity="Marcus Johnson"
          detail="Expired Dec 15"
        />
        <ComplianceItem
          status="urgent"
          title="Insurance Certificate"
          entity="Truck #104"
          detail="Expires in 3 days"
        />
        <ComplianceItem
          status="warning"
          title="Medical Card"
          entity="David Chen"
          detail="Expires Jan 15"
        />
        <ComplianceItem
          status="valid"
          title="DOT Inspection"
          entity="Trailer #201"
          detail="Valid until Jun 2025"
        />
      </div>
    </div>
  );
}

function ComplianceItem({ status, title, entity, detail }: { status: 'expired' | 'urgent' | 'warning' | 'valid'; title: string; entity: string; detail: string }) {
  const config = {
    expired: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', text: 'text-red-400' },
    urgent: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500', text: 'text-amber-400' },
    valid: { bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  }[status];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">{title}</p>
        <p className="text-[11px] text-white/40">{entity}</p>
      </div>
      <span className={`text-[11px] ${config.text}`}>{detail}</span>
    </div>
  );
}

function MobilePreview() {
  return (
    <div className="relative">
      <div className="w-[260px] bg-[#0a0c10] rounded-[36px] p-2.5 border border-white/[0.08] shadow-2xl">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

        {/* Screen */}
        <div className="bg-[#0f1117] rounded-[28px] overflow-hidden">
          {/* Status Bar */}
          <div className="h-10 flex items-center justify-between px-6 text-[10px] text-white/40">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2v-7H2v7zm4 0h2v-4H6v4zm4 0h2v-10h-2v10zm4 0h2V8h-2v12zm4 0h2V4h-2v16z" /></svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" /></svg>
              <svg className="w-4 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H4V8h13v8zm3-8v8h2V8h-2z" /></svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-6 space-y-4">
            <div>
              <p className="text-[10px] text-white/40">Current Trip</p>
              <p className="text-sm font-medium text-white">TR-1847</p>
            </div>

            {/* Earnings Card */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400/60 mb-1">Your Earnings</p>
              <p className="text-3xl font-bold text-emerald-400">$2,864</p>
              <p className="text-[10px] text-emerald-400/60 mt-1">Updates as you complete loads</p>
            </div>

            {/* Current Load */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white">Next Delivery</p>
                <span className="px-2 py-0.5 text-[9px] bg-sky-500/20 text-sky-400 rounded-full">Ready</span>
              </div>
              <p className="text-[11px] text-white/50">Phoenix, AZ · Johnson Family</p>
              <p className="text-[11px] text-white/50">$3,200 balance due</p>
            </div>

            {/* Action Button */}
            <button className="w-full py-3 bg-sky-500 text-white text-sm font-medium rounded-xl">
              Start Delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Feature Showcase - Vertical scrollable display of MoveBoss Pro features
 * Each section shows a key feature with an authentic UI preview
 */

export function FeatureShowcase() {
  return (
    <div className="space-y-32">
      {/* Section 1: Command Center Dashboard */}
      <FeatureSection
        badge="Command Center"
        title="Everything at a glance"
        description="Real-time metrics, driver status, and critical alerts — all in one unified dashboard tailored to your role."
        align="left"
      >
        <DashboardPreview />
      </FeatureSection>

      {/* Section 2: WhatsApp Integration */}
      <FeatureSection
        badge="WhatsApp Integration"
        title="Share loads where your network already is"
        description="Generate formatted load details and share directly to WhatsApp groups. One click to reach your entire network."
        align="right"
        highlight
      >
        <WhatsAppPreview />
      </FeatureSection>

      {/* Section 3: Balance & Credit Warnings */}
      <FeatureSection
        badge="Smart Warnings"
        title="Know before you commit"
        description="Automatic balance checks when companies request loads. See who owes you money before accepting new work."
        align="left"
      >
        <BalanceWarningPreview />
      </FeatureSection>

      {/* Section 4: FMCSA Compliance */}
      <FeatureSection
        badge="Compliance Center"
        title="Stay compliant without the headache"
        description="Track every expiration date across your fleet. Color-coded alerts surface issues before they become problems."
        align="right"
      >
        <CompliancePreview />
      </FeatureSection>

      {/* Section 5: Load Board & Marketplace */}
      <FeatureSection
        badge="Marketplace"
        title="Find and post loads in one place"
        description="Browse available loads with FMCSA verification badges and company ratings. Post your own with customizable rates."
        align="left"
      >
        <LoadBoardPreview />
      </FeatureSection>

      {/* Section 6: Financial Brain */}
      <FeatureSection
        badge="Financial Brain"
        title="Know your numbers instantly"
        description="Automatic driver pay calculations, trip profitability tracking, and receivables management. No spreadsheets needed."
        align="right"
      >
        <FinancialPreview />
      </FeatureSection>

      {/* Section 7: Driver Mobile App */}
      <FeatureSection
        badge="Driver Portal"
        title="Your drivers stay connected"
        description="Mobile app with trip details, payment collection, photo capture, and earnings tracking. Everything they need on the road."
        align="left"
      >
        <MobileAppPreview />
      </FeatureSection>

      {/* Section 8: Smart Load Matching */}
      <FeatureSection
        badge="Smart Matching"
        title="AI-powered load suggestions"
        description="Get load recommendations based on driver location, truck capacity, and profitability. Maximize every mile."
        align="right"
      >
        <LoadMatchingPreview />
      </FeatureSection>
    </div>
  );
}

// Feature Section wrapper
function FeatureSection({
  badge,
  title,
  description,
  children,
  align,
  highlight,
}: {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
  align: 'left' | 'right';
  highlight?: boolean;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}>
      <div className={`space-y-4 ${align === 'right' ? 'lg:order-2' : ''}`}>
        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
          highlight
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
        }`}>
          {badge}
        </span>
        <h3 className="text-2xl md:text-3xl font-semibold text-white">{title}</h3>
        <p className="text-white/50 leading-relaxed">{description}</p>
      </div>
      <div className={align === 'right' ? 'lg:order-1' : ''}>
        {children}
      </div>
    </div>
  );
}

// Preview Components
function DashboardPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Dashboard</h4>
            <p className="text-[10px] text-white/40">Monday, December 23</p>
          </div>
          <div className="flex gap-2">
            <QuickActionButton>+ New Load</QuickActionButton>
            <QuickActionButton variant="secondary">Find Load</QuickActionButton>
          </div>
        </div>

        {/* Critical Alert */}
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertIcon className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-300">3 compliance items expiring this week</p>
            <p className="text-[10px] text-red-400/60">Driver licenses and insurance certificates</p>
          </div>
          <button className="text-[10px] text-red-400 hover:text-red-300 font-medium whitespace-nowrap">View Now →</button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Active Loads" value="12" color="emerald" />
          <StatCard label="On Road" value="8/12" color="blue" />
          <StatCard label="Owed to You" value="$47.2K" color="amber" />
          <StatCard label="Today" value="$8,400" color="emerald" change="+23%" />
        </div>

        {/* Drivers Now */}
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white">Drivers Now</span>
            <span className="text-[10px] text-white/40">8 on road</span>
          </div>
          <div className="flex gap-2">
            <DriverChip name="Marcus J" status="delivering" />
            <DriverChip name="David C" status="in_transit" />
            <DriverChip name="James W" status="loading" />
            <DriverChip name="Mike S" status="available" />
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function WhatsAppPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Share Load</h4>
            <p className="text-[10px] text-white/40">LD-2847 · Los Angeles → Phoenix</p>
          </div>
        </div>

        {/* Format selector */}
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg w-fit">
          <button className="px-3 py-1.5 text-[10px] bg-[#25D366]/20 text-[#25D366] rounded flex items-center gap-1.5 font-medium">
            <WhatsAppIcon className="w-3 h-3" />
            WhatsApp
          </button>
          <button className="px-3 py-1.5 text-[10px] text-white/40">Plain Text</button>
          <button className="px-3 py-1.5 text-[10px] text-white/40">Email</button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-xl p-4 border border-white/[0.06]">
          <div className="space-y-1 font-mono text-[11px] text-white/80">
            <p>🚚 <span className="font-bold">Load Available</span></p>
            <p className="text-white/50 text-[10px] mt-2">━━━━━━━━━━━━━━</p>
            <p>📍 Los Angeles, CA → Phoenix, AZ</p>
            <p>📦 2,400 CF · Full truck</p>
            <p>💰 $3,200 linehaul</p>
            <p>📅 Pickup: Dec 24, 2:00 PM</p>
            <p className="text-white/50 text-[10px] mt-2">━━━━━━━━━━━━━━</p>
            <p className="text-sky-400">🔗 moveboss.com/board/abc123</p>
          </div>
        </div>

        {/* WhatsApp Button */}
        <button className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/20">
          <WhatsAppIcon className="w-5 h-5" />
          Share to WhatsApp
        </button>
      </div>
    </PreviewFrame>
  );
}

function BalanceWarningPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white">Request Load from ABC Moving</h4>
          <p className="text-[10px] text-white/40">Chicago, IL → Detroit, MI · 1,200 CF</p>
        </div>

        {/* Balance Warning */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangleIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-amber-200">Open balance with this company</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-amber-400/60">They owe you</p>
                  <p className="text-lg font-bold text-amber-300">$2,450</p>
                </div>
                <div className="h-8 w-px bg-amber-500/20" />
                <div>
                  <p className="text-[10px] text-amber-400/60">Outstanding since</p>
                  <p className="text-sm font-medium text-amber-300">Nov 15, 2024</p>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <div className="w-4 h-4 rounded border border-amber-500/50 bg-amber-500/20 flex items-center justify-center">
                  <CheckIcon className="w-2.5 h-2.5 text-amber-400" />
                </div>
                <span className="text-[11px] text-amber-300">I acknowledge this balance and want to continue</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 bg-white/[0.06] text-white text-xs rounded-lg border border-white/[0.08]">
            Cancel
          </button>
          <button className="flex-1 py-2.5 bg-sky-500 text-white text-xs font-medium rounded-lg">
            Request Anyway
          </button>
        </div>
      </div>
    </PreviewFrame>
  );
}

function CompliancePreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Compliance Center</h4>
          <button className="text-[10px] text-sky-400 font-medium">View All →</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-lg font-bold text-red-400">2</p>
            <p className="text-[9px] text-red-400/70">Expired</p>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <p className="text-lg font-bold text-orange-400">3</p>
            <p className="text-[9px] text-orange-400/70">This Week</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-lg font-bold text-amber-400">5</p>
            <p className="text-[9px] text-amber-400/70">30 Days</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-lg font-bold text-emerald-400">28</p>
            <p className="text-[9px] text-emerald-400/70">Valid</p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <ComplianceItem
            type="Driver License"
            entity="Marcus Johnson"
            status="expired"
            date="Expired Dec 15"
          />
          <ComplianceItem
            type="Insurance Certificate"
            entity="Truck #104"
            status="urgent"
            date="Expires in 3 days"
          />
          <ComplianceItem
            type="Medical Card"
            entity="David Chen"
            status="warning"
            date="Expires Jan 15"
          />
          <ComplianceItem
            type="DOT Inspection"
            entity="Trailer #201"
            status="valid"
            date="Valid until Jun 2025"
          />
        </div>
      </div>
    </PreviewFrame>
  );
}

function LoadBoardPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Load Board</h4>
            <p className="text-[10px] text-white/40">23 loads available</p>
          </div>
          <button className="px-3 py-1.5 bg-sky-500 text-white text-[10px] font-medium rounded-lg">
            + Post Load
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg">
            <button className="px-2 py-1 text-[10px] bg-white/10 text-white rounded">All</button>
            <button className="px-2 py-1 text-[10px] text-white/40">Pickups</button>
            <button className="px-2 py-1 text-[10px] text-white/40">Loads</button>
          </div>
        </div>

        {/* Loads */}
        <div className="space-y-2">
          <LoadBoardItem
            type="PICKUP"
            route="Chicago, IL → Detroit, MI"
            company="ABC Moving Co"
            rating={4.8}
            cuft={1200}
            rate={1800}
            badges={['Ready Now', 'FMCSA Verified']}
          />
          <LoadBoardItem
            type="LOAD"
            route="Miami, FL → Atlanta, GA"
            company="Southern Carriers"
            rating={4.5}
            cuft={2800}
            rate={3400}
            badges={['Expedited']}
          />
          <LoadBoardItem
            type="RFD"
            route="Dallas, TX → Houston, TX"
            company="Texas Movers LLC"
            rating={4.9}
            cuft={1600}
            rate={1200}
            badges={['Ready Now']}
          />
        </div>
      </div>
    </PreviewFrame>
  );
}

function FinancialPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Financial Overview</h4>
          <span className="text-[10px] text-white/40">This Month</span>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400/60">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">$127,450</p>
            <p className="text-[10px] text-emerald-400/60">↑ 18% vs last month</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
            <p className="text-[10px] text-sky-400/60">Net Profit</p>
            <p className="text-2xl font-bold text-sky-400">$42,180</p>
            <p className="text-[10px] text-sky-400/60">33% margin</p>
          </div>
        </div>

        {/* Who Owes You */}
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white">Who Owes You Money</span>
            <span className="text-xs font-bold text-amber-400">$47,250</span>
          </div>
          <div className="space-y-2">
            <ReceivableRow company="ABC Moving" amount={12500} days={15} status="overdue" />
            <ReceivableRow company="Southern Carriers" amount={8200} days={7} status="current" />
            <ReceivableRow company="Fast Freight Inc" amount={6100} days={3} status="current" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-white/[0.06] text-white text-[10px] rounded-lg border border-white/[0.08]">
            Record Payment
          </button>
          <button className="flex-1 py-2 bg-white/[0.06] text-white text-[10px] rounded-lg border border-white/[0.08]">
            Settle Driver
          </button>
        </div>
      </div>
    </PreviewFrame>
  );
}

function MobileAppPreview() {
  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Phone Frame */}
        <div className="w-[280px] bg-[#0f1117] rounded-[40px] p-3 border border-white/10 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />

          {/* Screen */}
          <div className="bg-[#0a0d12] rounded-[32px] overflow-hidden">
            {/* Status Bar */}
            <div className="h-8 bg-[#0f1117] flex items-center justify-between px-6 text-[10px] text-white/50">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </div>
            </div>

            {/* App Content */}
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40">Current Trip</p>
                  <p className="text-sm font-semibold text-white">TR-1847</p>
                </div>
                <span className="px-2 py-1 text-[9px] bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                  En Route
                </span>
              </div>

              {/* Current Load */}
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <PackageIcon className="w-3 h-3 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40">Delivering to</p>
                    <p className="text-xs font-medium text-white">Phoenix, AZ</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/50">2,400 CF</span>
                  <span className="text-emerald-400 font-medium">$3,200</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button className="py-3 bg-sky-500 text-white text-xs font-medium rounded-xl">
                  Start Delivery
                </button>
                <button className="py-3 bg-white/[0.06] text-white text-xs rounded-xl border border-white/[0.08]">
                  View Details
                </button>
              </div>

              {/* Earnings */}
              <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-[10px] text-white/40 mb-1">Your Earnings This Trip</p>
                <p className="text-xl font-bold text-emerald-400">$840</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadMatchingPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Load Suggestions</h4>
            <p className="text-[10px] text-white/40">Based on Marcus J's route</p>
          </div>
          <span className="px-2 py-1 text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
            AI Powered
          </span>
        </div>

        {/* Current Location */}
        <div className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <MapPinIcon className="w-3 h-3 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/40">Currently near</p>
            <p className="text-xs font-medium text-white">Phoenix, AZ</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-white/40">Available capacity</p>
            <p className="text-xs font-medium text-white">800 CF</p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <SuggestionCard
            route="Phoenix → Denver"
            distance={602}
            profit={1840}
            profitPerMile={3.05}
            matchScore={94}
            reason="On your route home"
          />
          <SuggestionCard
            route="Phoenix → Albuquerque"
            distance={465}
            profit={1250}
            profitPerMile={2.69}
            matchScore={87}
            reason="High profit margin"
          />
          <SuggestionCard
            route="Phoenix → Tucson"
            distance={112}
            profit={420}
            profitPerMile={3.75}
            matchScore={82}
            reason="Quick turnaround"
          />
        </div>
      </div>
    </PreviewFrame>
  );
}

// Reusable Components
function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Browser Chrome */}
      <div className="rounded-t-xl bg-[#1a1d24] border border-white/10 border-b-0 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 bg-white/5 rounded text-[10px] text-white/40">
            app.moveboss.com
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="rounded-b-xl bg-[#0f1117] border border-white/10 border-t-0 p-5">
        {children}
      </div>
    </div>
  );
}

function QuickActionButton({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  return (
    <button className={`px-3 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
      variant === 'primary'
        ? 'bg-sky-500 hover:bg-sky-400 text-white'
        : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]'
    }`}>
      {children}
    </button>
  );
}

function StatCard({ label, value, color, change }: { label: string; value: string; color: 'emerald' | 'blue' | 'amber'; change?: string }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`p-2.5 rounded-xl border ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
      <p className="text-[9px] text-white/40 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${colorClasses[color].split(' ')[2]}`}>{value}</p>
      {change && <p className="text-[9px] text-emerald-400">{change}</p>}
    </div>
  );
}

function DriverChip({ name, status }: { name: string; status: 'delivering' | 'in_transit' | 'loading' | 'available' }) {
  const statusConfig = {
    delivering: { color: 'bg-emerald-500', label: 'Delivering' },
    in_transit: { color: 'bg-emerald-500', label: 'En Route' },
    loading: { color: 'bg-blue-500', label: 'Loading' },
    available: { color: 'bg-amber-500', label: 'Available' },
  };
  const config = statusConfig[status];
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-medium text-white">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${config.color} border border-[#0f1117]`} />
      </div>
      <div>
        <p className="text-[10px] font-medium text-white">{name}</p>
        <p className="text-[8px] text-white/40">{config.label}</p>
      </div>
    </div>
  );
}

function ComplianceItem({ type, entity, status, date }: { type: string; entity: string; status: 'expired' | 'urgent' | 'warning' | 'valid'; date: string }) {
  const statusConfig = {
    expired: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
    urgent: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' },
    valid: { bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  };
  const config = statusConfig[status];
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg ${config.bg} border ${config.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-white truncate">{type}</p>
        <p className="text-[10px] text-white/40">{entity}</p>
      </div>
      <span className={`text-[10px] ${config.text}`}>{date}</span>
    </div>
  );
}

function LoadBoardItem({ type, route, company, rating, cuft, rate, badges }: { type: string; route: string; company: string; rating: number; cuft: number; rate: number; badges: string[] }) {
  const typeConfig: Record<string, { bg: string; text: string }> = {
    PICKUP: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    LOAD: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    RFD: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  };
  const config = typeConfig[type] || typeConfig.LOAD;
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${config.bg} ${config.text}`}>{type}</span>
          {badges.map((badge) => (
            <span key={badge} className={`px-1.5 py-0.5 text-[9px] rounded ${
              badge === 'Ready Now' ? 'bg-emerald-500/20 text-emerald-400' :
              badge === 'Expedited' ? 'bg-red-500/20 text-red-400' :
              badge === 'FMCSA Verified' ? 'bg-sky-500/20 text-sky-400' :
              'bg-white/10 text-white/60'
            }`}>{badge}</span>
          ))}
        </div>
      </div>
      <p className="text-xs font-medium text-white mb-1">{route}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/50">{company}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
            <StarIcon className="w-2.5 h-2.5" />{rating}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-emerald-400">${rate.toLocaleString()}</p>
          <p className="text-[9px] text-white/40">{cuft.toLocaleString()} CF</p>
        </div>
      </div>
    </div>
  );
}

function ReceivableRow({ company, amount, days, status }: { company: string; amount: number; days: number; status: 'overdue' | 'current' }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-medium text-white">
          {company.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div>
          <p className="text-[11px] font-medium text-white">{company}</p>
          <p className={`text-[9px] ${status === 'overdue' ? 'text-red-400' : 'text-white/40'}`}>
            {days} days {status === 'overdue' ? 'overdue' : 'outstanding'}
          </p>
        </div>
      </div>
      <span className={`text-xs font-semibold ${status === 'overdue' ? 'text-red-400' : 'text-white'}`}>
        ${amount.toLocaleString()}
      </span>
    </div>
  );
}

function SuggestionCard({ route, distance, profit, profitPerMile, matchScore, reason }: { route: string; distance: number; profit: number; profitPerMile: number; matchScore: number; reason: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-white">{route}</p>
          <p className="text-[10px] text-white/40">{distance} miles</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 rounded-full">
          <span className="text-[10px] font-bold text-sky-400">{matchScore}%</span>
          <span className="text-[9px] text-sky-400/60">match</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-emerald-400/80">{reason}</span>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-400">${profit}</p>
          <p className="text-[9px] text-white/40">${profitPerMile}/mi</p>
        </div>
      </div>
    </div>
  );
}

// Icons
function AlertIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}

function StarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

function MapPinIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}

function PackageIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}

function SignalIcon() {
  return <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2v-7H2v7zm4 0h2v-4H6v4zm4 0h2v-10h-2v10zm4 0h2V8h-2v12zm4 0h2V4h-2v16z" /></svg>;
}

function WifiIcon() {
  return <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6.62-3.21l1.41 1.41C8.4 14.6 10.1 14 12 14s3.6.6 5.21 1.8l1.41-1.41C16.55 12.53 14.36 12 12 12s-4.55.53-6.62 1.79zM2.56 11.22l1.41 1.41C6.37 10.33 9.06 9 12 9s5.63 1.33 8.03 3.63l1.41-1.41C18.53 8.13 15.44 6 12 6S5.47 8.13 2.56 11.22z" /></svg>;
}

function BatteryIcon() {
  return <svg className="w-4 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H4V8h13v8zm3-8v8h2V8h-2z" /></svg>;
}

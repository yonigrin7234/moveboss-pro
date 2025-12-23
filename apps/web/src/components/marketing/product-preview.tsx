'use client';

import { useState } from 'react';

// Mock data
const mockDrivers = [
  { name: 'Marcus Johnson', initials: 'MJ', status: 'delivering', location: 'Atlanta, GA' },
  { name: 'David Chen', initials: 'DC', status: 'in_transit', location: 'Nashville, TN' },
  { name: 'James Wilson', initials: 'JW', status: 'loading', location: 'Dallas, TX' },
  { name: 'Mike Santos', initials: 'MS', status: 'available', location: 'Phoenix, AZ' },
];

const mockLoads = [
  { id: '1', loadNumber: 'LD-2847', urgency: 'today', urgencyLabel: 'TODAY', origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', cubicFeet: 2400, rate: 3200, pickupWindow: '2:00 PM' },
  { id: '2', loadNumber: 'LD-2851', urgency: 'tomorrow', urgencyLabel: 'TOMORROW', origin: 'Seattle, WA', destination: 'Portland, OR', cubicFeet: 1800, rate: 1450, pickupWindow: '9:00 AM' },
  { id: '3', loadNumber: 'LD-2856', urgency: 'this_week', urgencyLabel: 'THU', origin: 'Denver, CO', destination: 'Salt Lake City, UT', cubicFeet: 3200, rate: 2800, pickupWindow: '11:00 AM' },
];

const mockMarketplaceLoads = [
  { id: '1', type: 'PICKUP', loadNumber: 'PU-4521', origin: 'Chicago, IL', destination: 'Detroit, MI', cubicFeet: 1200, rate: 1800, company: 'ABC Moving Co', rating: 4.8, loads: 47, isReady: true, postedAgo: '2h' },
  { id: '2', type: 'LOAD', loadNumber: 'LD-7834', origin: 'Miami, FL', destination: 'Atlanta, GA', cubicFeet: 2800, rate: 3400, company: 'Southern Carriers', rating: 4.5, loads: 123, isReady: false, postedAgo: '45m', expedited: true },
  { id: '3', type: 'LOAD', loadNumber: 'LD-9012', origin: 'Dallas, TX', destination: 'Houston, TX', cubicFeet: 1600, rate: 1200, company: 'Texas Movers LLC', rating: 4.9, loads: 89, isReady: true, postedAgo: '1d' },
];

const statusColors: Record<string, { bg: string; dot: string; label: string }> = {
  delivering: { bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', label: 'Delivering' },
  in_transit: { bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', label: 'In Transit' },
  loading: { bg: 'bg-blue-500/10', dot: 'bg-blue-500', label: 'Loading' },
  available: { bg: 'bg-amber-500/10', dot: 'bg-amber-500', label: 'Available' },
};

const urgencyColors: Record<string, string> = {
  today: 'border-l-red-500 bg-red-500/5',
  tomorrow: 'border-l-amber-500 bg-amber-500/5',
  this_week: 'border-l-blue-500 bg-blue-500/5',
};

type TabType = 'dashboard' | 'loads' | 'map' | 'board' | 'whatsapp';

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'loads', label: 'Loads' },
    { id: 'map', label: 'Trip Map' },
    { id: 'board', label: 'Load Board' },
    { id: 'whatsapp', label: 'Share' },
  ];

  return (
    <div className="relative">
      {/* Browser Chrome */}
      <div className="rounded-t-xl bg-[#1a1d24] border border-white/10 border-b-0 px-4 py-3 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1.5 bg-white/5 rounded-md text-xs text-white/50 flex items-center gap-2">
            <LockIcon />
            <span>app.moveboss.com/dashboard</span>
          </div>
        </div>
      </div>

      {/* App Preview */}
      <div className="rounded-b-xl bg-[#0f1117] border border-white/10 border-t-0 overflow-hidden">
        {/* App Header */}
        <div className="bg-[#0f1117] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="text-white font-semibold text-sm">MoveBoss</span>
          </div>
          <div className="flex items-center gap-1 text-xs overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 min-h-[500px]">
          {activeTab === 'dashboard' && <DashboardPreview />}
          {activeTab === 'loads' && <LoadsPreview />}
          {activeTab === 'map' && <TripMapPreview />}
          {activeTab === 'board' && <LoadBoardPreview />}
          {activeTab === 'whatsapp' && <WhatsAppSharePreview />}
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Dashboard</h2>
        <p className="text-xs text-white/40">Sunday, December 22</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Loads" value="12" accent="emerald" subtitle="3 delivering today" />
        <StatCard label="Drivers on Road" value="8" accent="blue" subtitle="of 12 total" />
        <StatCard label="Owed to You" value="$47,250" accent="amber" subtitle="+12% vs last week" />
        <StatCard label="Collected Today" value="$8,400" accent="emerald" subtitle="4 payments" />
      </div>
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Drivers Now</h3>
          <span className="text-[10px] text-white/40">8 / 12 on road</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mockDrivers.map((driver) => (
            <DriverCard key={driver.name} driver={driver} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadsPreview() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Loads Awaiting Dispatch</h2>
          <p className="text-xs text-white/40">3 loads · $7,450 total</p>
        </div>
        <button className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg transition-colors">
          + New Load
        </button>
      </div>
      <div className="space-y-2">
        {mockLoads.map((load) => (
          <LoadCard key={load.id} load={load} />
        ))}
      </div>
    </div>
  );
}

function TripMapPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Trip TR-1847</h2>
          <p className="text-xs text-white/40">Marcus Johnson · 3 stops</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded">
            En Route
          </span>
        </div>
      </div>

      {/* Map Mockup */}
      <div className="relative rounded-xl bg-[#1a1f2e] border border-white/[0.06] overflow-hidden h-[240px]">
        {/* Fake map background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23334155' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full">
          <path
            d="M 80 180 Q 150 100 250 120 Q 350 140 420 80"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="8 4"
            fill="none"
            opacity="0.8"
          />
        </svg>

        {/* Map markers */}
        <div className="absolute left-[70px] top-[160px] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm shadow-lg">
            🚚
          </div>
          <span className="mt-1 px-2 py-0.5 bg-black/60 rounded text-[9px] text-white">Start</span>
        </div>

        <div className="absolute left-[240px] top-[100px] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm shadow-lg">
            📦
          </div>
          <span className="mt-1 px-2 py-0.5 bg-black/60 rounded text-[9px] text-white">Phoenix</span>
        </div>

        <div className="absolute right-[70px] top-[60px] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm shadow-lg">
            🏁
          </div>
          <span className="mt-1 px-2 py-0.5 bg-black/60 rounded text-[9px] text-white">Denver</span>
        </div>

        {/* Capacity bar */}
        <div className="absolute bottom-3 left-3 right-3 bg-black/60 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/60">Truck Capacity</span>
            <span className="text-[10px] text-white font-medium">2,400 / 3,200 CF (75%)</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '75%' }} />
          </div>
        </div>
      </div>

      {/* Route segments */}
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3">
        <h4 className="text-xs font-medium text-white/60 mb-2">Route Segments</h4>
        <div className="space-y-2">
          <RouteSegment from="Los Angeles, CA" to="Phoenix, AZ" miles={372} status="completed" />
          <RouteSegment from="Phoenix, AZ" to="Denver, CO" miles={602} status="current" />
        </div>
      </div>
    </div>
  );
}

function LoadBoardPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Load Board</h2>
          <p className="text-xs text-white/40">23 loads available</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white/[0.06] text-white text-xs rounded-lg border border-white/[0.08]">
            My Requests
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-lg w-fit">
        <button className="px-3 py-1 text-xs bg-white/10 text-white rounded">All (23)</button>
        <button className="px-3 py-1 text-xs text-white/50">Pickups (8)</button>
        <button className="px-3 py-1 text-xs text-white/50">Loads (15)</button>
      </div>

      {/* Load cards grid */}
      <div className="grid gap-3">
        {mockMarketplaceLoads.map((load) => (
          <MarketplaceLoadCard key={load.id} load={load} />
        ))}
      </div>
    </div>
  );
}

function WhatsAppSharePreview() {
  return (
    <div className="space-y-4">
      {/* Balance Warning */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-amber-300">Open balance with ABC Moving Co</p>
            <p className="text-xs text-amber-400/80">
              They owe you <span className="font-bold">$2,450</span>
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 rounded border border-amber-500/50 bg-amber-500/20 flex items-center justify-center">
                <CheckIcon className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-xs text-amber-300">I acknowledge this balance and want to continue</span>
            </label>
          </div>
        </div>
      </div>

      {/* Share Modal Preview */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white">Share Load LD-2847</h3>
          <p className="text-xs text-white/40">Los Angeles → Phoenix · 2,400 CF</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Format tabs */}
          <div className="flex gap-1 bg-white/[0.03] p-1 rounded-lg w-fit">
            <button className="px-3 py-1 text-xs bg-[#25D366]/20 text-[#25D366] rounded flex items-center gap-1.5">
              <WhatsAppSmallIcon />
              WhatsApp
            </button>
            <button className="px-3 py-1 text-xs text-white/50">Plain Text</button>
            <button className="px-3 py-1 text-xs text-white/50">Email</button>
          </div>

          {/* Message preview */}
          <div className="bg-slate-950 rounded-lg p-3 font-mono text-[11px] text-slate-300 leading-relaxed">
            <p>🚚 *Load Available*</p>
            <p className="mt-2">📍 Los Angeles, CA → Phoenix, AZ</p>
            <p>📦 2,400 CF</p>
            <p>💰 $3,200</p>
            <p>📅 Dec 23, 2024</p>
            <p className="mt-2 text-sky-400">🔗 moveboss.com/board/abc123</p>
          </div>

          {/* Share button */}
          <button className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-[#25D366]/20">
            <WhatsAppIcon />
            Share to WhatsApp
          </button>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 bg-white/[0.06] text-white text-xs rounded-lg border border-white/[0.08] flex items-center justify-center gap-1.5">
              <CopyIcon />
              Copy Text
            </button>
            <button className="py-2 bg-white/[0.06] text-white text-xs rounded-lg border border-white/[0.08] flex items-center justify-center gap-1.5">
              <LinkIcon />
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, accent, subtitle }: { label: string; value: string; accent: 'emerald' | 'blue' | 'amber'; subtitle: string }) {
  const accentClasses = {
    emerald: 'bg-emerald-500/5 border-emerald-500/20',
    blue: 'bg-blue-500/5 border-blue-500/20',
    amber: 'bg-amber-500/5 border-amber-500/20',
  };
  return (
    <div className={`rounded-xl border p-3 ${accentClasses[accent]}`}>
      <p className="text-[9px] font-medium uppercase tracking-wider text-white/40 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>
    </div>
  );
}

function DriverCard({ driver }: { driver: typeof mockDrivers[0] }) {
  const status = statusColors[driver.status];
  return (
    <div className={`flex-shrink-0 w-[120px] rounded-xl border border-white/[0.06] p-2.5 ${status.bg}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-white">
            {driver.initials}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f1117] ${status.dot}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-white truncate">{driver.name.split(' ')[0]}</p>
          <p className="text-[9px] text-white/50">{status.label}</p>
        </div>
      </div>
      <p className="text-[9px] text-white/40 truncate">{driver.location}</p>
    </div>
  );
}

function LoadCard({ load }: { load: typeof mockLoads[0] }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] border-l-2 p-3 ${urgencyColors[load.urgency]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold ${load.urgency === 'today' ? 'text-red-400' : load.urgency === 'tomorrow' ? 'text-amber-400' : 'text-blue-400'}`}>
              {load.urgencyLabel}
            </span>
            <span className="text-[9px] text-white/40">{load.pickupWindow}</span>
          </div>
          <p className="text-sm font-medium text-white">
            {load.origin.split(',')[0]} <span className="text-white/30">→</span> {load.destination.split(',')[0]}
          </p>
          <p className="text-[10px] text-white/40">
            {load.cubicFeet.toLocaleString()} CF · ${load.rate.toLocaleString()} · {load.loadNumber}
          </p>
        </div>
        <button className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-white text-[10px] font-medium rounded-lg transition-colors">
          Assign
        </button>
      </div>
    </div>
  );
}

function MarketplaceLoadCard({ load }: { load: typeof mockMarketplaceLoads[0] }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
            load.type === 'PICKUP' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
          }`}>
            {load.type}
          </span>
          <span className="text-[10px] text-white/40 font-mono">{load.loadNumber}</span>
          {load.isReady && (
            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded">Ready Now</span>
          )}
          {load.expedited && (
            <span className="px-1.5 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded">Expedited</span>
          )}
        </div>
        <span className="text-[9px] text-white/30">{load.postedAgo} ago</span>
      </div>

      <p className="text-sm font-medium text-white mb-1">
        {load.origin.split(',')[0]} <span className="text-white/30">→</span> {load.destination.split(',')[0]}
      </p>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-white/50">{load.company}</span>
        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
          <StarIcon />
          {load.rating}
        </span>
        <span className="text-[10px] text-white/30">({load.loads} loads)</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40">{load.cubicFeet.toLocaleString()} CF</span>
        <span className="text-sm font-semibold text-emerald-400">${load.rate.toLocaleString()}</span>
      </div>
    </div>
  );
}

function RouteSegment({ from, to, miles, status }: { from: string; to: string; miles: number; status: 'completed' | 'current' | 'upcoming' }) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${status === 'current' ? 'bg-sky-500/10' : ''}`}>
      <div className={`w-2 h-2 rounded-full ${
        status === 'completed' ? 'bg-emerald-500' : status === 'current' ? 'bg-sky-500' : 'bg-white/20'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white truncate">
          {from.split(',')[0]} → {to.split(',')[0]}
        </p>
      </div>
      <span className="text-[10px] text-white/40">{miles} mi</span>
      {status === 'completed' && <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />}
      {status === 'current' && <span className="text-[9px] text-sky-400 font-medium">IN PROGRESS</span>}
    </div>
  );
}

// Icons
function LockIcon() {
  return (
    <svg className="w-3 h-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function WhatsAppSmallIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

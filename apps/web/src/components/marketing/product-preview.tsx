'use client';

import { useState } from 'react';

// Mock data for authentic preview
const mockDrivers = [
  { name: 'Marcus Johnson', initials: 'MJ', status: 'delivering', location: 'Atlanta, GA' },
  { name: 'David Chen', initials: 'DC', status: 'in_transit', location: 'Nashville, TN' },
  { name: 'James Wilson', initials: 'JW', status: 'loading', location: 'Dallas, TX' },
  { name: 'Mike Santos', initials: 'MS', status: 'available', location: 'Phoenix, AZ' },
];

const mockLoads = [
  {
    id: '1',
    loadNumber: 'LD-2847',
    urgency: 'today',
    urgencyLabel: 'TODAY',
    origin: 'Los Angeles, CA',
    destination: 'Phoenix, AZ',
    cubicFeet: 2400,
    rate: 3200,
    pickupWindow: '2:00 PM',
  },
  {
    id: '2',
    loadNumber: 'LD-2851',
    urgency: 'tomorrow',
    urgencyLabel: 'TOMORROW',
    origin: 'Seattle, WA',
    destination: 'Portland, OR',
    cubicFeet: 1800,
    rate: 1450,
    pickupWindow: '9:00 AM',
  },
  {
    id: '3',
    loadNumber: 'LD-2856',
    urgency: 'this_week',
    urgencyLabel: 'THU',
    origin: 'Denver, CO',
    destination: 'Salt Lake City, UT',
    cubicFeet: 3200,
    rate: 2800,
    pickupWindow: '11:00 AM',
  },
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

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loads' | 'trips'>('dashboard');

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
        <div className="bg-[#0f1117] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-white font-semibold">MoveBoss</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`transition-colors ${activeTab === 'dashboard' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('loads')}
              className={`transition-colors ${activeTab === 'loads' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              Loads
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`transition-colors ${activeTab === 'trips' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              Trips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[480px]">
          {activeTab === 'dashboard' && <DashboardPreview />}
          {activeTab === 'loads' && <LoadsPreview />}
          {activeTab === 'trips' && <TripsPreview />}
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-white/40">Sunday, December 22</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Loads" value="12" accent="emerald" subtitle="3 delivering today" />
        <StatCard label="Drivers on Road" value="8" accent="blue" subtitle="of 12 total" />
        <StatCard label="Owed to You" value="$47,250" accent="amber" subtitle="+12% vs last week" />
        <StatCard label="Collected Today" value="$8,400" accent="emerald" subtitle="4 payments" />
      </div>

      {/* Drivers Now */}
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Drivers Now</h3>
          <span className="text-xs text-white/40">8 / 12 on road</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Loads Awaiting Dispatch</h2>
          <p className="text-sm text-white/40">3 loads · $7,450 total</p>
        </div>
        <button className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors">
          + New Load
        </button>
      </div>

      {/* Loads List */}
      <div className="space-y-3">
        {mockLoads.map((load) => (
          <LoadCard key={load.id} load={load} />
        ))}
      </div>
    </div>
  );
}

function TripsPreview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Active Trips</h2>
          <p className="text-sm text-white/40">4 trips in progress</p>
        </div>
        <button className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors">
          + New Trip
        </button>
      </div>

      {/* Trip Cards */}
      <div className="grid gap-4">
        <TripCard
          tripNumber="TR-1847"
          driver="Marcus Johnson"
          route="Los Angeles → Phoenix → Denver"
          status="en_route"
          progress={65}
          loads={3}
          revenue={8400}
        />
        <TripCard
          tripNumber="TR-1852"
          driver="David Chen"
          route="Seattle → Portland → San Francisco"
          status="loading"
          progress={15}
          loads={2}
          revenue={4200}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  subtitle,
}: {
  label: string;
  value: string;
  accent: 'emerald' | 'blue' | 'amber';
  subtitle: string;
}) {
  const accentClasses = {
    emerald: 'bg-emerald-500/5 border-emerald-500/20',
    blue: 'bg-blue-500/5 border-blue-500/20',
    amber: 'bg-amber-500/5 border-amber-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${accentClasses[accent]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-white/40 mt-1">{subtitle}</p>
    </div>
  );
}

function DriverCard({ driver }: { driver: typeof mockDrivers[0] }) {
  const status = statusColors[driver.status];
  return (
    <div className={`flex-shrink-0 w-[140px] rounded-xl border border-white/[0.06] p-3 ${status.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white">
            {driver.initials}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1117] ${status.dot}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white truncate">{driver.name.split(' ')[0]}</p>
          <p className="text-[10px] text-white/50">{status.label}</p>
        </div>
      </div>
      <p className="text-[10px] text-white/40 truncate">{driver.location}</p>
    </div>
  );
}

function LoadCard({ load }: { load: typeof mockLoads[0] }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] border-l-2 p-4 ${urgencyColors[load.urgency]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold ${load.urgency === 'today' ? 'text-red-400' : load.urgency === 'tomorrow' ? 'text-amber-400' : 'text-blue-400'}`}>
              {load.urgencyLabel}
            </span>
            <span className="text-[10px] text-white/40">{load.pickupWindow}</span>
          </div>
          <p className="text-sm font-medium text-white">
            {load.origin.split(',')[0]} <span className="text-white/30">→</span> {load.destination.split(',')[0]}
          </p>
          <p className="text-[11px] text-white/40">
            {load.cubicFeet.toLocaleString()} CF · ${load.rate.toLocaleString()} · {load.loadNumber}
          </p>
        </div>
        <button className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium rounded-lg transition-colors">
          Assign
        </button>
      </div>
    </div>
  );
}

function TripCard({
  tripNumber,
  driver,
  route,
  status,
  progress,
  loads,
  revenue,
}: {
  tripNumber: string;
  driver: string;
  route: string;
  status: 'en_route' | 'loading';
  progress: number;
  loads: number;
  revenue: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{tripNumber}</span>
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${status === 'en_route' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {status === 'en_route' ? 'En Route' : 'Loading'}
            </span>
          </div>
          <p className="text-xs text-white/50">{driver}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-emerald-400">${revenue.toLocaleString()}</p>
          <p className="text-[10px] text-white/40">{loads} loads</p>
        </div>
      </div>
      <p className="text-xs text-white/60 mb-3">{route}</p>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-white/40 mt-1.5">{progress}% complete</p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

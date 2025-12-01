import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getOnboardingState, getDashboardRouteForRole } from '@/data/onboarding';
import { RouteLines } from './login/route-lines';
import styles from './login/login.module.css';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // If already logged in, redirect appropriately
  if (user) {
    const state = await getOnboardingState(user.id);

    if (!state?.onboarding_completed) {
      redirect('/onboarding');
    }

    if (state?.role) {
      redirect(getDashboardRouteForRole(state.role));
    }

    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-white flex items-center justify-center px-6">
      {/* Centered grid container */}
      <div className="mx-auto max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Panel - Hero */}
        <div className={`hidden lg:flex flex-col justify-center relative overflow-hidden ${styles.gridBackground}`}>
          {/* Route Lines Animation */}
          <RouteLines />

          {/* Content */}
          <div className="flex flex-col justify-center relative z-10 max-w-[500px]">
            <h1 className="text-[44px] font-semibold leading-[1.12] tracking-tight mb-5 text-white">
              Run your entire<br />
              <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">
                moving operation
              </span><br />
              from one place.
            </h1>

            <p className="text-base text-white/50 leading-relaxed mb-6">
              The complete platform for carriers, moving companies, and owner-operators to manage loads, drivers, finances, and compliance — all in one system.
            </p>

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

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2">
              <FeaturePill icon="grid">Load Board</FeaturePill>
              <FeaturePill icon="bolt">Trip Management</FeaturePill>
              <FeaturePill icon="globe">Fleet Tracking</FeaturePill>
              <FeaturePill icon="dollar">Financial Brain</FeaturePill>
              <FeaturePill icon="shield">Compliance</FeaturePill>
              <FeaturePill icon="users">Driver Management</FeaturePill>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 mt-8">
            <p className="text-xs text-white/30">© 2025 MoveBoss</p>
          </div>
        </div>

        {/* Right Panel - Auth */}
        <div className="flex justify-center items-center">
          <div className="w-full max-w-md mx-auto bg-gradient-to-b from-[#0C1017] to-[#080B12] border border-white/5 rounded-2xl p-8 lg:p-10 relative">
            {/* Top accent line */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-0.5 rounded-full ${styles.accentLine}`} />

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.03] border border-white/[0.06] rounded-[20px] text-[13px] text-white/60">
      <PillIcon name={icon} />
      {children}
    </div>
  );
}

function PillIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    bolt: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    globe: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
      </svg>
    ),
    dollar: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    shield: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    users: (
      <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };

  return icons[name] || null;
}

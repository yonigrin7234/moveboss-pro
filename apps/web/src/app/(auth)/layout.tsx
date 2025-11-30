import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getOnboardingState, getDashboardRouteForRole } from '@/data/onboarding';

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
    <div className="min-h-screen flex bg-black">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 p-16 flex-col justify-between relative overflow-hidden">
        {/* Layered gradient background for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,rgba(39,39,42,0.1)_180deg,transparent_360deg)]" />

        {/* Subtle route line effect */}
        <div className="absolute bottom-0 left-1/4 w-px h-2/3 bg-gradient-to-t from-zinc-700/20 via-zinc-600/10 to-transparent" />
        <div className="absolute bottom-1/4 left-1/4 w-16 h-px bg-gradient-to-r from-zinc-700/20 to-transparent" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 animate-[fadeIn_0.5s_ease-out]">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-sm">M</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">MoveBoss</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-medium text-white tracking-tight leading-[1.15] animate-[fadeIn_0.6s_ease-out]">
            Run your entire moving operation from one place.
          </h2>

          <div className="space-y-3">
            <p className="text-zinc-400 text-lg leading-relaxed animate-[fadeIn_0.7s_ease-out]">
              Manage loads, trips, drivers, fleet, and finances in a single platform.
            </p>
            <p className="text-zinc-500 text-base animate-[fadeIn_0.8s_ease-out]">
              Built for carriers, brokers, moving companies, and owner-operators.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-sm text-zinc-600 animate-[fadeIn_0.9s_ease-out]">
          © 2025 MoveBoss
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950">
        <div className="w-full max-w-md animate-[fadeIn_0.4s_ease-out]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                <span className="text-black font-bold text-sm">M</span>
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">MoveBoss</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

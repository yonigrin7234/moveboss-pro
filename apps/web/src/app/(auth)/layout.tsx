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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold">MoveBoss Pro</h1>
          <p className="text-primary-foreground/80 mt-2">
            The complete TMS for modern moving companies
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-lg text-primary-foreground/90">
            Built for modern moving companies.
          </p>
          <p className="text-lg text-primary-foreground/90">
            One platform for loads, trips, drivers & finances.
          </p>
          <p className="text-lg text-primary-foreground/90">
            Designed for carriers, brokers, and owner-operators.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/60">
          © 2025 MoveBoss Pro. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold">MoveBoss Pro</h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

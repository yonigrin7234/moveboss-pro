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

        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Streamline Your Operations</h3>
            <p className="text-primary-foreground/80">
              Manage loads, trips, drivers, and finances all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-primary-foreground/80">Active Carriers</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-sm text-primary-foreground/80">Loads Delivered</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm text-primary-foreground/80">On-Time Rate</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <p className="text-3xl font-bold">4.9</p>
              <p className="text-sm text-primary-foreground/80">User Rating</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60">
          © 2024 MoveBoss Pro. All rights reserved.
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

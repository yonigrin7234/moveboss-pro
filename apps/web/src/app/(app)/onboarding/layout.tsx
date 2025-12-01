import { getCurrentUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getOnboardingState, getDashboardRouteForRole } from '@/data/onboarding';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if onboarding is already completed
  const state = await getOnboardingState(user.id);

  if (state?.onboarding_completed && state?.role) {
    redirect(getDashboardRouteForRole(state.role));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <main>{children}</main>
    </div>
  );
}

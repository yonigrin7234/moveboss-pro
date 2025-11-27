import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState, getDashboardRouteForRole } from '@/data/onboarding';
import { RoleSelection } from './role-selection';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const state = await getOnboardingState(user.id);

  // If role already selected, go to role-specific setup
  if (state?.role && !state.onboarding_completed) {
    redirect(`/onboarding/${state.role}`);
  }

  // If completed, go to dashboard
  if (state?.onboarding_completed && state?.role) {
    redirect(getDashboardRouteForRole(state.role));
  }

  return <RoleSelection userId={user.id} />;
}

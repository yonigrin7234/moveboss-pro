import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState, getDashboardRouteForRole } from '@/data/onboarding';
import { RoleSelection } from './role-selection';

interface OnboardingPageProps {
  searchParams: Promise<{ change?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const isChangingRole = params.change === 'true';

  const state = await getOnboardingState(user.id);

  // If role already selected and not changing, go to role-specific setup
  if (state?.role && !state.onboarding_completed && !isChangingRole) {
    redirect(`/onboarding/${state.role}`);
  }

  // If completed, go to dashboard
  if (state?.onboarding_completed && state?.role) {
    redirect(getDashboardRouteForRole(state.role));
  }

  return <RoleSelection userId={user.id} currentRole={state?.role} />;
}

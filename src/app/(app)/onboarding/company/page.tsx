import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState } from '@/data/onboarding';
import { CompanySetup } from './company-setup';

export default async function CompanyOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const state = await getOnboardingState(user.id);

  if (state?.role !== 'company') {
    redirect('/onboarding');
  }

  if (state?.onboarding_completed) {
    redirect('/dashboard');
  }

  // Get capabilities from onboarding_data
  const capabilities = state?.onboarding_data as {
    canPostLoads?: boolean;
    canHaulLoads?: boolean;
    isOwnerOperator?: boolean;
  } | undefined;

  return (
    <CompanySetup
      currentStep={state?.onboarding_step || 1}
      canPostLoads={capabilities?.canPostLoads ?? true}
      canHaulLoads={capabilities?.canHaulLoads ?? false}
    />
  );
}

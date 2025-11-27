import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState } from '@/data/onboarding';
import { OwnerOperatorSetup } from './owner-operator-setup';

export default async function OwnerOperatorOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const state = await getOnboardingState(user.id);

  if (state?.role !== 'owner_operator') {
    redirect('/onboarding');
  }

  if (state?.onboarding_completed) {
    redirect('/dashboard');
  }

  return (
    <OwnerOperatorSetup
      userEmail={user.email || ''}
      currentStep={state?.onboarding_step || 1}
    />
  );
}

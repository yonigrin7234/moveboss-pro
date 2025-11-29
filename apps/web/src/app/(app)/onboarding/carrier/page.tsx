import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState } from '@/data/onboarding';
import { CarrierSetup } from './carrier-setup';

export default async function CarrierOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const state = await getOnboardingState(user.id);

  if (state?.role !== 'carrier') {
    redirect('/onboarding');
  }

  if (state?.onboarding_completed) {
    redirect('/dashboard');
  }

  return <CarrierSetup currentStep={state?.onboarding_step || 1} />;
}

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getOnboardingState } from '@/data/onboarding';
import { DriverSetup } from './driver-setup';

export default async function DriverOnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const state = await getOnboardingState(user.id);

  if (state?.role !== 'driver') {
    redirect('/onboarding');
  }

  if (state?.onboarding_completed) {
    redirect('/driver');
  }

  return (
    <DriverSetup userEmail={user.email || ''} currentStep={state?.onboarding_step || 1} />
  );
}

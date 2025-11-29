import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { getWorkspaceCompanyForUser } from '@/data/companies';
import { CompanyProfileFormClient } from '@/app/(app)/dashboard/settings/company-profile/CompanyProfileFormClient';
import { createWorkspaceCompanyAction } from '@/app/(app)/dashboard/settings/company-profile/actions';
import { type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { WorkspaceEscape } from '../WorkspaceEscape';

export default async function WorkspaceOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const workspace = await getWorkspaceCompanyForUser(user.id);
  if (workspace) {
    redirect('/dashboard');
  }

  const defaults: CompanyProfileFormValues = {
    name: '',
    phone: '',
    email: '',
    state: '',
    city: '',
    address_line1: '',
    address_line2: '',
    website: '',
    notes: '',
    dot_number: '',
    mc_number: '',
    zip: '',
    owner_name: '',
    owner_role: '',
    owner_phone: '',
    owner_email: user.email || '',
    secondary_contact_name: '',
    secondary_contact_phone: '',
    secondary_contact_email: '',
  };

  return (
    <CreationPageShell
      title="Set up your business"
      subtitle="Create the workspace company that owns this MoveBoss account. Partner companies are added later in Companies."
      pill="Onboarding"
      className="max-w-4xl"
      actions={<WorkspaceEscape />}
    >
      <CompanyProfileFormClient
        defaults={defaults}
        action={createWorkspaceCompanyAction}
        submitLabel="Create workspace company"
        redirectTo="/dashboard"
      />
    </CreationPageShell>
  );
}

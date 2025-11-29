import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/supabase-server';
import {
  getPrimaryMembershipForUser,
  getWorkspaceCompanyForUser,
  updateCompanyProfileFields,
  upsertWorkspaceCompanyForUser,
} from '@/data/companies';
import { companyProfileSchema, type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';

export type CompanyProfileActionState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function loadCompanyProfile(): Promise<{
  company: any | null;
  role: string | null;
  membershipId: string | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const company = await getWorkspaceCompanyForUser(user.id);
  const membership = await getPrimaryMembershipForUser(user.id);

  if (!company) {
    return { company: null, role: null, membershipId: null };
  }

  return { company, role: membership?.role ?? 'owner', membershipId: membership?.id ?? null };
}

export async function updateCompanyProfileAction(
  prevState: CompanyProfileActionState,
  formData: FormData
): Promise<CompanyProfileActionState> {
  'use server';

  const user = await getCurrentUser();
  if (!user) {
    return { errors: { _form: 'Not authenticated' } };
  }

  const membership = await getPrimaryMembershipForUser(user.id);
  const workspace = await getWorkspaceCompanyForUser(user.id);
  if (!workspace) {
    return { errors: { _form: 'Create your workspace company first.' } };
  }

  const values: CompanyProfileFormValues = {
    name: (formData.get('name') as string) || '',
    phone: (formData.get('phone') as string) || '',
    email: (formData.get('email') as string) || '',
    state: (formData.get('state') as string) || '',
    city: (formData.get('city') as string) || '',
    address_line1: (formData.get('address_line1') as string) || '',
    address_line2: (formData.get('address_line2') as string) || '',
    website: (formData.get('website') as string) || '',
    notes: (formData.get('notes') as string) || '',
    dot_number: (formData.get('dot_number') as string) || '',
    mc_number: (formData.get('mc_number') as string) || '',
    zip: (formData.get('zip') as string) || '',
    owner_name: (formData.get('owner_name') as string) || '',
    owner_role: (formData.get('owner_role') as string) || '',
    owner_phone: (formData.get('owner_phone') as string) || '',
    owner_email: (formData.get('owner_email') as string) || '',
    secondary_contact_name: (formData.get('secondary_contact_name') as string) || '',
    secondary_contact_phone: (formData.get('secondary_contact_phone') as string) || '',
    secondary_contact_email: (formData.get('secondary_contact_email') as string) || '',
  };

  const parsed = companyProfileSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0]?.toString() || '_form';
      errors[key] = issue.message;
    });
    return { errors };
  }

  try {
    if (membership && !['owner', 'admin'].includes(membership.role)) {
      return { errors: { _form: 'You do not have permission to edit this company.' } };
    }
    await updateCompanyProfileFields(workspace.id, parsed.data, user.id);
    return { message: 'Company profile updated.' };
  } catch (error) {
    return {
      errors: {
        _form: error instanceof Error ? error.message : 'Failed to update company',
      },
    };
  }
}

export async function createWorkspaceCompanyAction(
  prevState: CompanyProfileActionState,
  formData: FormData
): Promise<CompanyProfileActionState> {
  'use server';

  const user = await getCurrentUser();
  if (!user) {
    return { errors: { _form: 'Not authenticated' } };
  }

  const values: CompanyProfileFormValues = {
    name: (formData.get('name') as string) || '',
    phone: (formData.get('phone') as string) || '',
    email: (formData.get('email') as string) || '',
    state: (formData.get('state') as string) || '',
    city: (formData.get('city') as string) || '',
    address_line1: (formData.get('address_line1') as string) || '',
    address_line2: (formData.get('address_line2') as string) || '',
    website: (formData.get('website') as string) || '',
    notes: (formData.get('notes') as string) || '',
    dot_number: (formData.get('dot_number') as string) || '',
    mc_number: (formData.get('mc_number') as string) || '',
    zip: (formData.get('zip') as string) || '',
    owner_name: (formData.get('owner_name') as string) || '',
    owner_role: (formData.get('owner_role') as string) || '',
    owner_phone: (formData.get('owner_phone') as string) || '',
    owner_email: (formData.get('owner_email') as string) || '',
    secondary_contact_name: (formData.get('secondary_contact_name') as string) || '',
    secondary_contact_phone: (formData.get('secondary_contact_phone') as string) || '',
    secondary_contact_email: (formData.get('secondary_contact_email') as string) || '',
  };

  const parsed = companyProfileSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0]?.toString() || '_form';
      errors[key] = issue.message;
    });
    return { errors };
  }

  try {
    await upsertWorkspaceCompanyForUser(user.id, parsed.data);
    const redirectTo = (formData.get('redirect_to') as string) || '/dashboard/settings/company-profile';
    redirect(redirectTo);
  } catch (error) {
    // Allow Next.js redirects to bubble through instead of surfacing as form errors
    if (error && typeof error === 'object' && 'digest' in error && `${(error as any).digest}`.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      errors: {
        _form: error instanceof Error ? error.message : 'Failed to create workspace company',
      },
    };
  }
}

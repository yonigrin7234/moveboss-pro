import { createClient } from '@/lib/supabase-server';
import { companyProfileSchema, type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';

export type CompanyMembership = {
  company_id: string;
  role: string;
};

export async function getMembershipForUser(userId: string): Promise<CompanyMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company_memberships')
    .select('company_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  // Gracefully handle environments where the migration has not run yet.
  if (error) {
    if (error.message?.toLowerCase().includes('company_memberships')) {
      return null;
    }
    throw new Error(`Failed to fetch membership: ${error.message}`);
  }

  if (!data) return null;

  return {
    company_id: data.company_id,
    role: data.role,
  };
}

export async function getCompanyById(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch company: ${error.message}`);
  }

  return data ?? null;
}

export async function updateCompanyProfile(
  companyId: string,
  role: string,
  values: CompanyProfileFormValues
) {
  if (!['owner', 'admin'].includes(role)) {
    throw new Error('You do not have permission to edit this company.');
  }

  const parsed = companyProfileSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      state: parsed.state,
      city: parsed.city,
      address_line1: parsed.address_line1,
      address_line2: parsed.address_line2 ?? null,
      website: parsed.website ?? null,
      notes: parsed.notes ?? null,
      dot_number: parsed.dot_number ?? null,
      mc_number: parsed.mc_number ?? null,
      zip: parsed.zip ?? null,
      owner_name: parsed.owner_name,
      owner_role: parsed.owner_role ?? null,
      owner_phone: parsed.owner_phone,
      owner_email: parsed.owner_email,
      secondary_contact_name: parsed.secondary_contact_name ?? null,
      secondary_contact_phone: parsed.secondary_contact_phone ?? null,
      secondary_contact_email: parsed.secondary_contact_email ?? null,
    })
    .eq('id', companyId);

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`);
  }
}

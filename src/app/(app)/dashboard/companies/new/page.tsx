import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase-server';
import { createCompany, newCompanyInputSchema } from '@/data/companies';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { CreationPageShell } from '@/components/layout/CreationPageShell';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';

export default async function NewCompanyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  async function createCompanyAction(
    prevState: { errors?: Record<string, string>; success?: boolean; companyId?: string } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string>; success?: boolean; companyId?: string } | null> {
    'use server';

    const user = await getCurrentUser();
    if (!user) {
      return { errors: { _form: 'Not authenticated' } };
    }

    // Extract all form fields
    const fields = [
      'name',
      'dba_name',
      'company_type',
      'status',
      'dot_number',
      'mc_number',
      // Main Company Address
      'street',
      'city',
      'state',
      'postal_code',
      'country',
      // Primary Contact
      'primary_contact_name',
      'primary_contact_email',
      'primary_contact_phone',
      // Dispatch Contact
      'dispatch_contact_name',
      'dispatch_contact_email',
      'dispatch_contact_phone',
      'dispatch_notes',
      'loading_location_type',
      // Dispatch Contact Address
      'dispatch_contact_street',
      'dispatch_contact_city',
      'dispatch_contact_state',
      'dispatch_contact_postal_code',
      'dispatch_contact_country',
      // Billing Address
      'billing_street',
      'billing_city',
      'billing_state',
      'billing_postal_code',
      'billing_country',
      'billing_notes',
    ];

    const rawData = extractFormValues(formData, fields);
    const cleanedData = cleanFormValues(rawData);

    try {
      const validated = newCompanyInputSchema.parse(cleanedData);
      const created = await createCompany(validated, user.id);
      return { success: true, companyId: created.id };
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        // Zod validation error
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const errors: Record<string, string> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
        return { errors };
      }
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to create company' } };
    }
  }

  return (
    <CreationPageShell
      title="Add Company"
      subtitle="Create a clean profile for shippers, brokers, partner carriers, or vendors with contacts and billing ready to go."
      pill="Companies"
      meta={[
        { label: 'Time to complete', value: '~3 minutes' },
        { label: 'Data quality', value: 'Primary + dispatch contacts' },
        { label: 'Finance-ready', value: 'Billing + status set' },
      ]}
      checklist={[
        { label: 'Identity', detail: 'Name, DBA, type, status, DOT/MC' },
        { label: 'Contacts', detail: 'Primary + dispatch with phones and emails' },
        { label: 'Addresses', detail: 'Company, contact, and billing locations' },
        { label: 'Notes', detail: 'Dispatch + billing notes before you save' },
      ]}
    >
      <CompanyForm onSubmit={createCompanyAction} />
    </CreationPageShell>
  );
}

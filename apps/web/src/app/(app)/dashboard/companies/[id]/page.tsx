import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase-server';
import { getCompanyById, updateCompany, updateCompanyInputSchema, type Company } from '@/data/companies';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { cleanFormValues, extractFormValues } from '@/lib/form-data';
import { Receipt } from 'lucide-react';

function formatCompanyType(type: Company['company_type']): string {
  switch (type) {
    case 'customer':
      return 'Customer';
    case 'carrier':
      return 'Carrier';
    case 'both':
      return 'Both';
    default:
      return type;
  }
}

function formatStatus(status: Company['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
}

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const company = await getCompanyById(id, user.id);

  if (!company) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-foreground">Company Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The company you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link
              href="/dashboard/companies"
              className="text-foreground hover:text-primary underline"
            >
              Back to Companies
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function updateCompanyAction(
    prevState: { errors?: Record<string, string> } | null,
    formData: FormData
  ): Promise<{ errors?: Record<string, string> } | null> {
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
      // Primary Contact Address
      'primary_contact_street',
      'primary_contact_city',
      'primary_contact_state',
      'primary_contact_postal_code',
      'primary_contact_country',
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
      const validated = updateCompanyInputSchema.parse(cleanedData);
      await updateCompany(id, validated, user.id);
      return { errors: undefined };
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
      return { errors: { _form: error instanceof Error ? error.message : 'Failed to update company' } };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {company.name}
          </h1>
          <Badge variant="secondary">{formatCompanyType(company.company_type)}</Badge>
          <Badge
            variant="secondary"
            className={
              company.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : company.status === 'suspended'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-muted text-muted-foreground'
            }
          >
            {formatStatus(company.status)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/companies/${id}/ledger`} className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              View Ledger
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/companies">Back to Companies</Link>
          </Button>
        </div>
      </div>

      <CompanyForm
        initialData={{
          ...company,
          // Convert null to undefined for form compatibility
          legal_name: company.legal_name ?? undefined,
          dba_name: company.dba_name ?? undefined,
          relationship_role: company.relationship_role ?? undefined,
          dot_number: company.dot_number ?? undefined,
          mc_number: company.mc_number ?? undefined,
          scac_code: company.scac_code ?? undefined,
          // Main Company Address
          street: company.street ?? undefined,
          city: company.city ?? undefined,
          state: company.state ?? undefined,
          postal_code: company.postal_code ?? undefined,
          country: company.country ?? undefined,
          // Primary Contact
          primary_contact_name: company.primary_contact_name ?? undefined,
          primary_contact_email: company.primary_contact_email ?? undefined,
          primary_contact_phone: company.primary_contact_phone ?? undefined,
          // Primary Contact Address
          primary_contact_street: company.primary_contact_street ?? undefined,
          primary_contact_city: company.primary_contact_city ?? undefined,
          primary_contact_state: company.primary_contact_state ?? undefined,
          primary_contact_postal_code: company.primary_contact_postal_code ?? undefined,
          primary_contact_country: company.primary_contact_country ?? undefined,
          // Dispatch Contact
          dispatch_contact_name: company.dispatch_contact_name ?? undefined,
          dispatch_contact_email: company.dispatch_contact_email ?? undefined,
          dispatch_contact_phone: company.dispatch_contact_phone ?? undefined,
          dispatch_notes: company.dispatch_notes ?? undefined,
          loading_location_type: company.loading_location_type ?? undefined,
          // Dispatch Contact Address
          dispatch_contact_street: company.dispatch_contact_street ?? undefined,
          dispatch_contact_city: company.dispatch_contact_city ?? undefined,
          dispatch_contact_state: company.dispatch_contact_state ?? undefined,
          dispatch_contact_postal_code: company.dispatch_contact_postal_code ?? undefined,
          dispatch_contact_country: company.dispatch_contact_country ?? undefined,
          // Billing Address
          billing_street: company.billing_street ?? undefined,
          billing_city: company.billing_city ?? undefined,
          billing_state: company.billing_state ?? undefined,
          billing_postal_code: company.billing_postal_code ?? undefined,
          billing_country: company.billing_country ?? undefined,
          billing_notes: company.billing_notes ?? undefined,
        }}
        onSubmit={updateCompanyAction}
        submitLabel="Update Company"
      />
    </div>
  );
}


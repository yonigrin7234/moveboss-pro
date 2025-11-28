import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/supabase-server';
import { CompanyProfileFormClient } from './CompanyProfileFormClient';
import { DOTVerificationCard } from './DOTVerificationCard';
import { loadCompanyProfile, updateCompanyProfileAction, createWorkspaceCompanyAction } from './actions';
import { type CompanyProfileFormValues } from '@/lib/validation/companyProfileSchema';

export default async function CompanyProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { company, role } = await loadCompanyProfile();

  if (!company) {
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
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Company Profile</h1>
          <p className="text-sm text-muted-foreground">
            Create your workspace company. This is the business that owns this MoveBoss account.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workspace company (one-time setup)</CardTitle>
            <p className="text-sm text-muted-foreground">
              This profile is separate from any partner companies you work with.
            </p>
          </CardHeader>
          <CardContent>
            <CompanyProfileFormClient
              defaults={defaults}
              action={createWorkspaceCompanyAction}
              submitLabel="Create workspace company"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const defaults: CompanyProfileFormValues = {
    name: company.name ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    state: company.state ?? '',
    city: company.city ?? '',
    address_line1: company.address_line1 ?? '',
    address_line2: company.address_line2 ?? '',
    website: company.website ?? '',
    notes: company.notes ?? '',
    dot_number: company.dot_number ?? '',
    mc_number: company.mc_number ?? '',
    zip: company.zip ?? '',
    owner_name: company.owner_name ?? '',
    owner_role: company.owner_role ?? '',
    owner_phone: company.owner_phone ?? '',
    owner_email: company.owner_email ?? '',
    secondary_contact_name: company.secondary_contact_name ?? '',
    secondary_contact_phone: company.secondary_contact_phone ?? '',
    secondary_contact_email: company.secondary_contact_email ?? '',
  };

  const readOnly = !role || !['owner', 'admin'].includes(role);

  // Build FMCSA data object for the verification card
  const fmcsaData = company.fmcsa_last_checked
    ? {
        verified: company.fmcsa_verified ?? false,
        verifiedAt: company.fmcsa_verified_at ?? null,
        lastChecked: company.fmcsa_last_checked,
        legalName: company.fmcsa_legal_name ?? null,
        dbaName: company.fmcsa_dba_name ?? null,
        statusCode: company.fmcsa_status_code ?? null,
        allowedToOperate: company.fmcsa_allowed_to_operate ?? false,
        commonAuthority: company.fmcsa_common_authority ?? null,
        contractAuthority: company.fmcsa_contract_authority ?? null,
        brokerAuthority: company.fmcsa_broker_authority ?? null,
        bipdInsurance: company.fmcsa_bipd_insurance_on_file ?? null,
        totalDrivers: company.fmcsa_total_drivers ?? null,
        totalPowerUnits: company.fmcsa_total_power_units ?? null,
        operationType: company.fmcsa_operation_type ?? null,
        hhgAuthorized: company.fmcsa_hhg_authorized ?? false,
        cargoCarried: company.fmcsa_cargo_carried ?? [],
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Company Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your company identity, contact details, and operational defaults.
        </p>
      </div>

      {/* FMCSA Verification Card */}
      <DOTVerificationCard
        companyId={company.id}
        currentDotNumber={company.dot_number ?? null}
        fmcsaData={fmcsaData}
        readOnly={readOnly}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update company identity, contact info, and address details.
          </p>
        </CardHeader>
        <CardContent>
          <CompanyProfileFormClient
            defaults={defaults}
            action={updateCompanyProfileAction}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>
    </div>
  );
}

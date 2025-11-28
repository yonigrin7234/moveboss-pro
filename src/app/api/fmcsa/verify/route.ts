import { NextResponse } from 'next/server';

import { getCurrentUser, createClient } from '@/lib/supabase-server';
import {
  verifyCarrier,
  getCarrierByDOT,
  formatInsuranceAmount,
  getVerificationMessage,
  type FMCSAVerificationResult,
} from '@/lib/fmcsa';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dotNumber = searchParams.get('dot')?.trim();

  if (!dotNumber) {
    return NextResponse.json(
      { error: 'DOT number is required' },
      { status: 400 }
    );
  }

  // Validate DOT format (should be numeric)
  if (!/^\d+$/.test(dotNumber)) {
    return NextResponse.json(
      { error: 'Invalid DOT number format' },
      { status: 400 }
    );
  }

  try {
    const result = await verifyCarrier(dotNumber);

    return NextResponse.json({
      ...result,
      message: getVerificationMessage(result),
      insuranceDisplay: result.carrier
        ? formatInsuranceAmount(result.carrier.bipdInsuranceOnFile)
        : null,
    });
  } catch (error) {
    console.error('FMCSA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify carrier' },
      { status: 500 }
    );
  }
}

/**
 * POST - Verify and save FMCSA data to a company record
 * Body: { dotNumber: string, companyId: string }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { dotNumber: string; companyId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { dotNumber, companyId } = body;

  if (!dotNumber || !companyId) {
    return NextResponse.json(
      { error: 'DOT number and company ID are required' },
      { status: 400 }
    );
  }

  // Validate DOT format
  if (!/^\d+$/.test(dotNumber)) {
    return NextResponse.json(
      { error: 'Invalid DOT number format' },
      { status: 400 }
    );
  }

  try {
    // Verify the company belongs to the user
    const supabase = await createClient();
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, owner_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify with FMCSA
    const result = await verifyCarrier(dotNumber);

    if (!result.found || !result.carrier) {
      return NextResponse.json({
        success: false,
        error: result.error || 'DOT number not found in FMCSA database',
        result,
      });
    }

    const carrier = result.carrier;

    // Update company with FMCSA data
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        dot_number: String(carrier.dotNumber),
        fmcsa_verified: result.verified,
        fmcsa_verified_at: result.verified ? new Date().toISOString() : null,
        fmcsa_last_checked: new Date().toISOString(),
        fmcsa_legal_name: carrier.legalName,
        fmcsa_dba_name: carrier.dbaName,
        fmcsa_status_code: carrier.statusCode,
        fmcsa_allowed_to_operate: carrier.allowedToOperate === 'Y',
        fmcsa_out_of_service_date: carrier.oosDate,
        fmcsa_common_authority: carrier.commonAuthorityStatus,
        fmcsa_contract_authority: carrier.contractAuthorityStatus,
        fmcsa_broker_authority: carrier.brokerAuthorityStatus,
        fmcsa_bipd_insurance_on_file: carrier.bipdInsuranceOnFile
          ? parseInt(carrier.bipdInsuranceOnFile, 10)
          : null,
        fmcsa_bipd_required_amount: carrier.bipdRequiredAmount
          ? parseInt(carrier.bipdRequiredAmount, 10)
          : null,
        fmcsa_cargo_insurance_on_file: carrier.cargoInsuranceOnFile
          ? parseInt(carrier.cargoInsuranceOnFile, 10)
          : null,
        fmcsa_total_drivers: carrier.totalDrivers,
        fmcsa_total_power_units: carrier.totalPowerUnits,
        fmcsa_crash_total: carrier.crashTotal,
        fmcsa_fatal_crash: carrier.fatalCrash,
        fmcsa_safety_rating: carrier.safetyRating,
        fmcsa_operation_type: carrier.carrierOperation?.carrierOperationDesc,
        fmcsa_raw_data: carrier,
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Failed to update company:', updateError);
      return NextResponse.json(
        { error: 'Failed to save verification data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: result.verified,
      message: getVerificationMessage(result),
      carrier: {
        legalName: carrier.legalName,
        dbaName: carrier.dbaName,
        dotNumber: carrier.dotNumber,
        city: carrier.phyCity,
        state: carrier.phyState,
        allowedToOperate: carrier.allowedToOperate === 'Y',
        statusCode: carrier.statusCode,
        authorityTypes: result.verificationDetails?.authorityTypes || [],
        insurance: formatInsuranceAmount(carrier.bipdInsuranceOnFile),
        totalDrivers: carrier.totalDrivers,
        totalPowerUnits: carrier.totalPowerUnits,
      },
    });
  } catch (error) {
    console.error('FMCSA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify carrier' },
      { status: 500 }
    );
  }
}

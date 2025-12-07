import { NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase-server';
import { createComplianceRequestsForPartnership, getComplianceRequestsForPartnership } from '@/data/compliance';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    const supabase = await createClient();

    // Test 1: Check if compliance_document_types table exists and has data
    const { data: docTypes, error: docTypesError } = await supabase
      .from('compliance_document_types')
      .select('*');

    if (docTypesError) {
      return NextResponse.json({
        step: 'fetch_document_types',
        error: docTypesError.message,
        hint: 'Table might not exist or RLS is blocking access',
      });
    }

    // Test 2: Check if compliance_requests table exists
    const { data: requests, error: requestsError } = await supabase
      .from('compliance_requests')
      .select('id')
      .limit(1);

    if (requestsError) {
      return NextResponse.json({
        step: 'fetch_compliance_requests',
        error: requestsError.message,
        hint: 'compliance_requests table might not exist',
      });
    }

    // Test 3: Get a partnership to test with
    const { data: partnership, error: partnershipError } = await supabase
      .from('company_partnerships')
      .select('id, company_a_id, company_b_id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    // If action=create, actually try to create the compliance requests
    if (action === 'create' && partnership) {
      const result = await createComplianceRequestsForPartnership(
        partnership.id,
        partnership.company_a_id,
        user.id,
        partnership.company_b_id
      );

      return NextResponse.json({
        action: 'create',
        result,
        partnership_id: partnership.id,
        company_a_id: partnership.company_a_id,
        company_b_id: partnership.company_b_id,
      });
    }

    // Check if user owns company_a
    let companyAOwner = null;
    if (partnership) {
      const { data: companyA } = await supabase
        .from('companies')
        .select('id, name, owner_id')
        .eq('id', partnership.company_a_id)
        .single();
      companyAOwner = companyA;
    }

    // Direct query to see ALL compliance requests for this partnership (bypassing function)
    let directRequests = null;
    if (partnership) {
      const { data: direct, error: directError } = await supabase
        .from('compliance_requests')
        .select('id, partnership_id, requesting_company_id, carrier_id, status')
        .eq('partnership_id', partnership.id);
      directRequests = { data: direct, error: directError?.message };
    }

    // Fetch existing compliance requests for this partnership
    let existingRequests: unknown[] = [];
    if (partnership) {
      existingRequests = await getComplianceRequestsForPartnership(partnership.id);
    }

    return NextResponse.json({
      _version: 'v3-with-debug',
      success: true,
      user_id: user.id,
      document_types: {
        count: docTypes?.length || 0,
        data: docTypes,
      },
      compliance_requests: {
        table_exists: !requestsError,
        sample_count: requests?.length || 0,
      },
      partnership: partnership || null,
      partnership_error: partnershipError?.message || null,
      company_a_info: companyAOwner,
      direct_requests_query: directRequests,
      existing_requests_for_partnership: existingRequests,
      hint: 'Add ?action=create to actually create compliance requests',
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

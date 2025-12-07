import { NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase-server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

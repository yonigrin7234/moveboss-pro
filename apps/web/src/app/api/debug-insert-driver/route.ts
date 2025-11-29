import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated',
          details: authError?.message || 'No user found',
          authError: authError 
        },
        { status: 401 }
      );
    }

    // Minimal required fields only
    const insertData = {
      owner_id: user.id,
      first_name: 'Debug',
      last_name: 'Driver',
      status: 'active',
      pay_mode: 'per_mile',
      driver_type: 'company_driver',
      license_number: 'DEBUG-123',
      license_state: 'CA',
      license_expiry: new Date().toISOString().split('T')[0],
      medical_card_expiry: new Date().toISOString().split('T')[0],
    };

    console.log('[DEBUG INSERT] Attempting insert with:', {
      userId: user.id,
      email: user.email,
      insertData,
    });

    // Attempt insert
    const { data, error } = await supabase
      .from('drivers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[DEBUG INSERT] Insert failed:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Insert failed',
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error,
        },
        { status: 400 }
      );
    }

    if (!data) {
      console.error('[DEBUG INSERT] Insert returned no data');
      return NextResponse.json(
        { 
          success: false,
          error: 'Insert succeeded but no data returned',
          message: 'This may indicate an RLS policy issue',
        },
        { status: 500 }
      );
    }

    console.log('[DEBUG INSERT] Insert succeeded:', data);

    // Verify we can read it back
    const { data: verifyData, error: verifyError } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', data.id)
      .eq('owner_id', user.id)
      .single();

    if (verifyError || !verifyData) {
      console.error('[DEBUG INSERT] Cannot read back inserted row:', verifyError);
      return NextResponse.json(
        { 
          success: true,
          warning: 'Row inserted but cannot be read back',
          insertedRow: data,
          verifyError: verifyError?.message,
          verifyCode: verifyError?.code,
          message: 'This indicates an RLS SELECT policy issue',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Driver inserted and verified successfully',
      driver: verifyData,
      userId: user.id,
    });

  } catch (error) {
    console.error('[DEBUG INSERT] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


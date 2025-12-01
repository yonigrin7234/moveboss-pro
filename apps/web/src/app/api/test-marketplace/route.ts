import { NextResponse } from 'next/server';
import { getMarketplaceLoads } from '@/data/marketplace';

export async function GET() {
  try {
    console.log('=== TESTING getMarketplaceLoads ===');
    
    const loads = await getMarketplaceLoads();
    
    console.log('\n--- RESULTS ---');
    console.log(`Total loads returned: ${loads.length}`);
    console.log(`Load IDs:`, loads.map(l => l.id));
    
    if (loads.length > 0) {
      console.log('\n--- FIRST LOAD DETAILS ---');
      console.log(JSON.stringify(loads[0], null, 2));
    }
    
    return NextResponse.json({
      success: true,
      count: loads.length,
      loadIds: loads.map(l => l.id),
      loads: loads,
    });
  } catch (error: any) {
    console.error('\n--- ERROR ---');
    console.error('Error message:', error?.message);
    console.error('Error object:', error);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      },
    }, { status: 500 });
  }
}


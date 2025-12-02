import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getCarrierAssignedLoads, getAssignedLoadDetails } from '@/data/marketplace';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const loadId = searchParams.get('loadId');

    const supabase = await createClient();

    // Get user's workspace company
    const { data: carrier, error: carrierError } = await supabase
      .from('companies')
      .select('id, name, owner_id, is_workspace_company')
      .eq('owner_id', user.id)
      .eq('is_workspace_company', true)
      .maybeSingle();

    // Get assigned loads list
    const assignedLoads = await getCarrierAssignedLoads(user.id);

    // If loadId provided, try to get details
    let loadDetails = null;
    let rawLoadQuery = null;
    if (loadId) {
      loadDetails = await getAssignedLoadDetails(loadId, user.id);

      // Also do a raw query to see what's happening
      if (carrier) {
        const { data: rawLoad, error: rawError } = await supabase
          .from('loads')
          .select('id, load_number, assigned_carrier_id, load_status, carrier_confirmed_at')
          .eq('id', loadId)
          .maybeSingle();

        // Try the exact same query as getAssignedLoadDetails
        const { data: detailQuery, error: detailError } = await supabase
          .from('loads')
          .select(`
            id, load_number, company_id,
            company:companies!loads_company_id_fkey(id, name, phone)
          `)
          .eq('id', loadId)
          .eq('assigned_carrier_id', carrier.id)
          .single();

        rawLoadQuery = {
          simpleQuery: { data: rawLoad, error: rawError },
          detailQuery: { data: detailQuery, error: detailError }
        };
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      carrier: carrier,
      carrierError: carrierError,
      assignedLoadsCount: assignedLoads.length,
      assignedLoads: assignedLoads.map(l => ({
        id: l.id,
        load_number: l.load_number,
        load_status: l.load_status,
        carrier_confirmed_at: l.carrier_confirmed_at,
      })),
      loadId: loadId,
      loadDetails: loadDetails ? 'Found' : 'Not found (null)',
      rawLoadQuery: rawLoadQuery,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: {
        message: error?.message,
        code: error?.code,
        details: error?.details,
      },
    }, { status: 500 });
  }
}

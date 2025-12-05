import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getCarrierAssignedLoads, getAssignedLoadDetails, assignLoadToTrip, getLoadsGivenOut } from '@/data/marketplace';
import { getTripsForLoadAssignment } from '@/data/trips';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const loadId = searchParams.get('loadId');
    const testType = searchParams.get('test') || 'carrier-assigned';

    const supabase = await createClient();

    // ===== TEST: LOADS GIVEN OUT =====
    if (testType === 'loads-given-out') {
      // Get workspace company
      const { data: workspaceCompany, error: companyError } = await supabase
        .from('companies')
        .select('id, name, owner_id, is_workspace_company')
        .eq('owner_id', user.id)
        .eq('is_workspace_company', true)
        .maybeSingle();

      // Query Posted Jobs style (what works)
      const { data: postedJobsStyle, error: postedJobsError } = await supabase
        .from('loads')
        .select(`
          id, load_number, posting_type, posting_status,
          assigned_carrier_id,
          assigned_carrier:assigned_carrier_id(id, name)
        `)
        .eq('posted_by_company_id', workspaceCompany?.id || '')
        .not('posting_type', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Same query but with assigned_carrier_id filter
      const { data: withCarrierFilter, error: withCarrierError } = await supabase
        .from('loads')
        .select(`
          id, load_number, posting_type, posting_status,
          assigned_carrier_id,
          assigned_carrier:assigned_carrier_id(id, name)
        `)
        .eq('posted_by_company_id', workspaceCompany?.id || '')
        .not('assigned_carrier_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get the actual function result
      const loadsGivenOut = await getLoadsGivenOut(user.id);

      // Also do a second workspace company lookup to compare
      const { data: secondWorkspaceCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_workspace_company', true)
        .maybeSingle();

      return NextResponse.json({
        testType: 'loads-given-out',
        user: { id: user.id, email: user.email },
        workspaceCompany,
        secondWorkspaceCompanyId: secondWorkspaceCompany?.id,
        workspaceIdsMatch: workspaceCompany?.id === secondWorkspaceCompany?.id,
        companyError,
        postedJobsStyle: {
          count: postedJobsStyle?.length || 0,
          withCarrier: postedJobsStyle?.filter((l: any) => l.assigned_carrier_id)?.length || 0,
          data: postedJobsStyle,
          error: postedJobsError,
        },
        withCarrierFilter: {
          count: withCarrierFilter?.length || 0,
          data: withCarrierFilter,
          error: withCarrierError,
        },
        loadsGivenOutResult: {
          count: loadsGivenOut.length,
          data: loadsGivenOut,
        },
      });
    }

    // ===== EXISTING TEST: CARRIER ASSIGNED =====
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

        // Try the exact same query as getAssignedLoadDetails (without companies JOIN)
        const { data: detailQuery, error: detailError } = await supabase
          .from('loads')
          .select(`
            id, load_number, company_id, source_company_name,
            pickup_city, pickup_state, pickup_postal_code,
            carrier_confirmed_at, load_status, assigned_carrier_id
          `)
          .eq('id', loadId)
          .eq('assigned_carrier_id', carrier.id)
          .single();

        // Check if carrier ID matches assigned_carrier_id
        const carrierMatch = rawLoad?.assigned_carrier_id === carrier.id;

        rawLoadQuery = {
          simpleQuery: { data: rawLoad, error: rawError },
          detailQuery: { data: detailQuery, error: detailError },
          carrierIdFromLoad: rawLoad?.assigned_carrier_id,
          carrierIdFromCompany: carrier.id,
          carrierMatch: carrierMatch,
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
      loadDetailsStatus: loadDetails ? 'Found' : 'Not found (null)',
      loadDetailsData: loadDetails ? {
        id: loadDetails.id,
        load_number: loadDetails.load_number,
        load_status: loadDetails.load_status,
        company: loadDetails.company,
      } : null,
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

// POST: Test trip assignment
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { loadId, tripId } = await request.json();
    if (!loadId || !tripId) {
      return NextResponse.json({ error: 'loadId and tripId are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const diagnostics: Record<string, unknown> = {};

    // 1. Get user info
    diagnostics.user = { id: user.id, email: user.email };

    // 2. Get carrier
    const { data: carrier, error: carrierError } = await supabase
      .from('companies')
      .select('id, name, owner_id, is_workspace_company')
      .eq('owner_id', user.id)
      .eq('is_workspace_company', true)
      .maybeSingle();
    diagnostics.carrier = { data: carrier, error: carrierError };

    // 3. Get trip info
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, owner_id, driver_id, trip_number')
      .eq('id', tripId)
      .single();
    diagnostics.trip = { data: trip, error: tripError };
    diagnostics.tripOwnerMatch = trip?.owner_id === user.id;

    // 4. Get load info
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select('id, load_number, assigned_carrier_id, trip_id, owner_id')
      .eq('id', loadId)
      .single();
    diagnostics.load = { data: load, error: loadError };
    diagnostics.loadCarrierMatch = load?.assigned_carrier_id === carrier?.id;

    // 5. Check existing trip_loads for this load
    const { data: existingTripLoad, error: existingError } = await supabase
      .from('trip_loads')
      .select('id, trip_id, owner_id')
      .eq('load_id', loadId)
      .maybeSingle();
    diagnostics.existingTripLoad = { data: existingTripLoad, error: existingError };

    // 6. Get available trips for load assignment
    const availableTrips = await getTripsForLoadAssignment(user.id);
    diagnostics.availableTripsCount = availableTrips.length;

    // 7. NOW TRY THE ACTUAL ASSIGNMENT
    const result = await assignLoadToTrip(loadId, tripId, 1);
    diagnostics.assignResult = result;

    // 8. Check if trip_loads was created
    const { data: afterTripLoad, error: afterError } = await supabase
      .from('trip_loads')
      .select('id, trip_id, load_id, owner_id, sequence_index')
      .eq('load_id', loadId)
      .maybeSingle();
    diagnostics.afterTripLoad = { data: afterTripLoad, error: afterError };

    // 9. Check load's trip_id after assignment
    const { data: afterLoad, error: afterLoadError } = await supabase
      .from('loads')
      .select('id, trip_id, assigned_driver_id, assigned_driver_name')
      .eq('id', loadId)
      .single();
    diagnostics.afterLoad = { data: afterLoad, error: afterLoadError };

    return NextResponse.json({
      success: result.success,
      diagnostics,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        stack: error?.stack,
      },
    }, { status: 500 });
  }
}






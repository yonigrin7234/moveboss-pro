/**
 * Balance Dispute Submit API
 *
 * Called by drivers from the mobile app when they report an incorrect balance.
 * Creates a dispute record and notifies dispatch.
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { notifyOwnerBalanceDispute } from '@/lib/push-notifications';

interface SubmitDisputeRequest {
  loadId: string;
  tripId?: string;
  originalBalance: number;
  driverNote?: string;
}

export async function POST(request: Request) {
  try {
    // Handle both cookie auth (web) and Bearer token auth (mobile)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let supabase;
    if (token) {
      // Mobile app - use Bearer token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      );
    } else {
      // Web - use server client with cookies
      supabase = await createServerClient();
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the driver record for this user
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found. Only drivers can submit balance disputes.' },
        { status: 403 }
      );
    }

    const body = await request.json() as SubmitDisputeRequest;
    const { loadId, tripId, originalBalance, driverNote } = body;

    if (!loadId) {
      return NextResponse.json({ error: 'loadId is required' }, { status: 400 });
    }

    // Verify the driver has access to this load (via trip assignment)
    const { data: tripLoad, error: accessError } = await supabase
      .from('trip_loads')
      .select(`
        trip_id,
        trips!inner (id, driver_id)
      `)
      .eq('load_id', loadId)
      .eq('trips.driver_id', driver.id)
      .limit(1)
      .maybeSingle();

    if (accessError || !tripLoad) {
      return NextResponse.json(
        { error: 'You do not have access to this load' },
        { status: 403 }
      );
    }

    // Get load details for the notification
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select('load_number, owner_id')
      .eq('id', loadId)
      .single();

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if there's already a pending dispute for this load
    const { data: existingDispute } = await supabase
      .from('load_balance_disputes')
      .select('id')
      .eq('load_id', loadId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'A pending dispute already exists for this load' },
        { status: 409 }
      );
    }

    // Create the dispute record
    const { data: dispute, error: insertError } = await supabase
      .from('load_balance_disputes')
      .insert({
        load_id: loadId,
        driver_id: driver.id,
        trip_id: tripId || tripLoad.trip_id,
        original_balance: originalBalance,
        driver_note: driverNote || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating balance dispute:', insertError);
      return NextResponse.json(
        { error: 'Failed to create dispute' },
        { status: 500 }
      );
    }

    // Send push notification to owner/dispatch
    const driverName = `${driver.first_name} ${driver.last_name}`;
    try {
      await notifyOwnerBalanceDispute(
        loadId,
        dispute.id,
        driverName,
        load.load_number || 'Unknown',
        originalBalance,
        driverNote
      );
    } catch (notifyError) {
      // Log but don't fail the request if notification fails
      console.error('Error sending balance dispute notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      disputeId: dispute.id,
      message: 'Dispatch has been notified. They will update the balance if needed.',
    });
  } catch (error) {
    console.error('Balance dispute submit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit dispute' },
      { status: 500 }
    );
  }
}

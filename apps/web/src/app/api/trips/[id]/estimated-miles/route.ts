import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { computeTripFinancialsWithDriverPay } from '@/data/trip-financials';

/**
 * PATCH /api/trips/[id]/estimated-miles
 *
 * Updates the trip's total_miles with the estimated route distance from the map.
 * This allows driver pay calculations to use estimated miles before actual
 * odometer readings are entered.
 *
 * Body: { estimatedMiles: number }
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: tripId } = await context.params;

  try {
    const body = await request.json();
    const estimatedMiles = Number(body.estimatedMiles);

    if (!Number.isFinite(estimatedMiles) || estimatedMiles < 0) {
      return NextResponse.json(
        { error: 'Invalid estimatedMiles value' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify trip ownership and get current odometer status
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, odometer_start, odometer_end, total_miles')
      .eq('id', tripId)
      .eq('owner_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Only update if odometer readings aren't set yet
    // (actual miles take precedence over estimated miles)
    const hasActualMiles =
      trip.odometer_start != null && trip.odometer_end != null;

    if (hasActualMiles) {
      return NextResponse.json({
        message: 'Trip already has actual odometer readings',
        updated: false,
      });
    }

    // Update total_miles with estimated value
    const { error: updateError } = await supabase
      .from('trips')
      .update({ total_miles: estimatedMiles })
      .eq('id', tripId)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Error updating trip estimated miles:', updateError);
      return NextResponse.json(
        { error: 'Failed to update estimated miles' },
        { status: 500 }
      );
    }

    // Recompute trip financials with the new estimated miles
    await computeTripFinancialsWithDriverPay(supabase, tripId, user.id);

    return NextResponse.json({
      message: 'Estimated miles updated',
      updated: true,
      estimatedMiles,
    });
  } catch (error) {
    console.error('Error in estimated-miles endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to update estimated miles' },
      { status: 500 }
    );
  }
}

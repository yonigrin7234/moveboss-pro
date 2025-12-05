import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import {
  findMatchingLoads,
  saveSuggestions,
  buildMatchingContext,
} from '@/lib/matching/engine';

/**
 * POST /api/matching/suggestions/refresh
 * Runs the matching engine for a trip and saves new suggestions
 *
 * Body:
 * - tripId: string (required)
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Build matching context from trip data
    const context = await buildMatchingContext(supabase, tripId, user.id);

    if (!context) {
      return NextResponse.json({ error: 'Trip not found or no delivery destinations' }, { status: 404 });
    }

    // Get company matching settings
    const { data: settings } = await supabase
      .from('company_matching_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();

    // Build preferences from settings
    const preferences = {
      minProfitPerMile: settings?.min_profit_per_mile || 1.0,
      maxDeadheadMiles: settings?.max_deadhead_miles || 150,
      minMatchScore: settings?.min_match_score || 50,
      preferredReturnStates: settings?.preferred_return_states || [],
      excludedStates: settings?.excluded_states || [],
      minCapacityUtilization: settings?.min_capacity_utilization_percent || 30,
      maxCapacityUtilization: settings?.max_capacity_utilization_percent || 100,
    };

    // Run matching engine
    const suggestions = await findMatchingLoads(supabase, context, preferences);

    // Save to database
    const result = await saveSuggestions(
      supabase,
      tripId,
      context.companyId,
      context.driverId,
      user.id,
      suggestions
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      suggestions: suggestions.map((s) => ({
        loadId: s.loadId,
        suggestionType: s.suggestionType,
        matchScore: s.matchScore,
        profitEstimate: s.profitEstimate,
        profitPerMile: s.profitPerMile,
        distanceToPickupMiles: s.distanceToPickupMiles,
        capacityFitPercent: s.capacityFitPercent,
      })),
    });
  } catch (error) {
    console.error('Error refreshing suggestions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh suggestions' },
      { status: 500 }
    );
  }
}

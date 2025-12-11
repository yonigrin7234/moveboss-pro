/**
 * Smart Load Matching Engine
 * Finds and scores potential loads for drivers based on location and capacity
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  geocodeAddress,
  calculateDistance,
  type GeoCoordinates,
} from '@/lib/geocoding';
import { estimateLoadCosts, estimateDaysForLoad, type DriverPayConfig } from './cost-calculator';

// Types
export type SuggestionType =
  | 'near_delivery'
  | 'backhaul'
  | 'capacity_fit'
  | 'high_profit'
  | 'partner_load';

export interface TripMatchingContext {
  tripId: string;
  driverId: string;
  companyId: string;
  ownerId: string;

  // Current location (from mobile app)
  currentLocation: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  } | null;

  // Where the driver is delivering
  deliveryDestinations: Array<{
    city: string | null;
    state: string | null;
    zip: string | null;
    expectedDate?: Date | null;
    loadId?: string;
  }>;

  // Trailer info
  trailerCapacityCuft: number;
  remainingCapacityCuft: number;

  // Driver pay config (for cost estimation)
  driverPayConfig: DriverPayConfig;

  // Preferences
  returnRoutePreference?: string[];
}

export interface MatchingPreferences {
  minProfitPerMile: number;
  maxDeadheadMiles: number;
  minMatchScore: number;
  preferredReturnStates: string[];
  excludedStates: string[];
  minCapacityUtilization: number;
  maxCapacityUtilization: number;
}

export interface ScoreBreakdown {
  proximityScore: number;
  profitScore: number;
  capacityScore: number;
  routeScore: number;
  partnerScore: number;
}

export interface ScoredSuggestion {
  loadId: string;
  load: LoadForMatching;

  suggestionType: SuggestionType;

  // Distance metrics
  distanceToPickupMiles: number;
  loadMiles: number;
  totalMiles: number;

  // Financial metrics
  revenueEstimate: number;
  driverCostEstimate: number;
  fuelCostEstimate: number;
  profitEstimate: number;
  profitPerMile: number;

  // Fit metrics
  capacityFitPercent: number;

  // Scoring
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
}

interface LoadForMatching {
  id: string;
  owner_id: string;
  posted_by_company_id?: string | null;
  company_id?: string | null;

  // Location
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_zip?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_zip?: string | null;

  // Size and revenue
  cubic_feet?: number | null;
  total_rate?: number | null;
  rate_per_cuft?: number | null;
  balance_due?: number | null;

  // Posting info
  posting_type?: string | null;
  posting_status?: string | null;

  // Company info
  company?: {
    id: string;
    company_name?: string | null;
    name?: string | null;
  } | null;
}

const DEFAULT_PREFERENCES: MatchingPreferences = {
  minProfitPerMile: 1.0,
  maxDeadheadMiles: 150,
  minMatchScore: 50,
  preferredReturnStates: [],
  excludedStates: [],
  minCapacityUtilization: 30,
  maxCapacityUtilization: 100,
};

/**
 * Main matching function - finds and scores potential loads for a trip
 */
export async function findMatchingLoads(
  supabase: SupabaseClient,
  context: TripMatchingContext,
  preferences: Partial<MatchingPreferences> = {}
): Promise<ScoredSuggestion[]> {
  const prefs: MatchingPreferences = { ...DEFAULT_PREFERENCES, ...preferences };

  // Get the final delivery destination (where driver will be when done)
  const finalDelivery = context.deliveryDestinations[context.deliveryDestinations.length - 1];
  if (!finalDelivery || (!finalDelivery.city && !finalDelivery.zip)) {
    console.log('No final delivery destination found');
    return [];
  }

  // Get final delivery coordinates
  const deliveryResult = await geocodeAddress(
    finalDelivery.city,
    finalDelivery.state,
    finalDelivery.zip
  );

  if (!deliveryResult.success || !deliveryResult.coordinates) {
    console.log('Failed to geocode delivery destination');
    return [];
  }

  const deliveryCoords = deliveryResult.coordinates;

  // Query posted loads that could potentially match
  const { data: loads, error } = await supabase
    .from('loads')
    .select(
      `
      id,
      owner_id,
      posted_by_company_id,
      company_id,
      pickup_city,
      pickup_state,
      pickup_zip,
      delivery_city,
      delivery_state,
      delivery_zip,
      cubic_feet,
      total_rate,
      rate_per_cuft,
      balance_due,
      posting_type,
      posting_status,
      pickup_date,
      company:companies!loads_company_id_fkey(id, name)
    `
    )
    .eq('posting_status', 'posted')
    .neq('owner_id', context.ownerId) // Don't suggest own loads
    .gte('pickup_date', new Date().toISOString().split('T')[0]); // Future only

  if (error) {
    console.error('Error fetching loads for matching:', error);
    return [];
  }

  if (!loads || loads.length === 0) {
    console.log('No posted loads found');
    return [];
  }

  // Get list of partner company IDs for bonus scoring
  const { data: partnerships } = await supabase
    .from('company_partnerships')
    .select('company_a_id, company_b_id')
    .or(`company_a_id.eq.${context.companyId},company_b_id.eq.${context.companyId}`)
    .eq('status', 'active');

  const partnerIds = new Set<string>();
  if (partnerships) {
    for (const p of partnerships) {
      if (p.company_a_id !== context.companyId) partnerIds.add(p.company_a_id);
      if (p.company_b_id !== context.companyId) partnerIds.add(p.company_b_id);
    }
  }

  // Score each load
  const suggestions: ScoredSuggestion[] = [];

  // Transform loads to handle Supabase array format for company
  const transformedLoads: LoadForMatching[] = loads.map((load: any) => ({
    ...load,
    company: Array.isArray(load.company) ? load.company[0] || null : load.company,
  }));

  for (const load of transformedLoads) {
    const scored = await scoreLoadForTrip(
      load,
      context,
      prefs,
      deliveryCoords,
      partnerIds
    );

    if (scored && scored.matchScore >= prefs.minMatchScore) {
      suggestions.push(scored);
    }
  }

  // Sort by score descending and return top results
  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  return suggestions.slice(0, 20);
}

/**
 * Score a single load against trip context
 */
async function scoreLoadForTrip(
  load: LoadForMatching,
  context: TripMatchingContext,
  preferences: MatchingPreferences,
  deliveryCoords: GeoCoordinates,
  partnerIds: Set<string>
): Promise<ScoredSuggestion | null> {
  // Extract load locations
  const pickupLocation = {
    city: load.pickup_city,
    state: load.pickup_state,
    zip: load.pickup_zip,
  };

  const dropoffLocation = {
    city: load.delivery_city,
    state: load.delivery_state,
    zip: load.delivery_zip,
  };

  // Check excluded states
  if (
    (pickupLocation.state && preferences.excludedStates.includes(pickupLocation.state)) ||
    (dropoffLocation.state && preferences.excludedStates.includes(dropoffLocation.state))
  ) {
    return null;
  }

  // Get pickup coordinates
  const pickupResult = await geocodeAddress(
    pickupLocation.city,
    pickupLocation.state,
    pickupLocation.zip
  );

  if (!pickupResult.success || !pickupResult.coordinates) {
    return null;
  }

  const pickupCoords = pickupResult.coordinates;

  // Calculate distance to pickup (deadhead)
  const distanceToPickup = calculateDistance(deliveryCoords, pickupCoords);

  // Check deadhead limit
  if (distanceToPickup > preferences.maxDeadheadMiles) {
    return null;
  }

  // Get dropoff coordinates and calculate load distance
  const dropoffResult = await geocodeAddress(
    dropoffLocation.city,
    dropoffLocation.state,
    dropoffLocation.zip
  );

  if (!dropoffResult.success || !dropoffResult.coordinates) {
    return null;
  }

  const loadDistance = calculateDistance(pickupCoords, dropoffResult.coordinates);

  // Extract load details
  const cubicFeet = load.cubic_feet || 0;

  // Check capacity fit
  if (cubicFeet > context.remainingCapacityCuft) {
    return null; // Doesn't fit
  }

  const capacityFitPercent =
    context.remainingCapacityCuft > 0
      ? (cubicFeet / context.remainingCapacityCuft) * 100
      : 0;

  // Check capacity utilization preferences
  if (
    capacityFitPercent < preferences.minCapacityUtilization ||
    capacityFitPercent > preferences.maxCapacityUtilization
  ) {
    return null;
  }

  // Calculate revenue
  const revenue =
    load.total_rate ||
    load.balance_due ||
    cubicFeet * (load.rate_per_cuft || 0);

  // Calculate costs
  const totalMiles = distanceToPickup + loadDistance;
  const estimatedDays = estimateDaysForLoad(totalMiles);

  const costs = estimateLoadCosts(
    context.driverPayConfig,
    totalMiles,
    cubicFeet,
    revenue,
    estimatedDays
  );

  // Calculate profit
  const profitEstimate = revenue - costs.totalCost;
  const profitPerMile = totalMiles > 0 ? profitEstimate / totalMiles : 0;

  // Check minimum profit
  if (profitPerMile < preferences.minProfitPerMile) {
    return null;
  }

  // --- SCORING ---
  const scoreBreakdown = calculateScores(
    distanceToPickup,
    profitPerMile,
    capacityFitPercent,
    dropoffLocation.state,
    context.returnRoutePreference || [],
    preferences.preferredReturnStates,
    load.posted_by_company_id || load.company_id || '',
    partnerIds
  );

  const matchScore =
    scoreBreakdown.proximityScore +
    scoreBreakdown.profitScore +
    scoreBreakdown.capacityScore +
    scoreBreakdown.routeScore +
    scoreBreakdown.partnerScore;

  // Determine suggestion type
  const suggestionType = determineSuggestionType(scoreBreakdown);

  return {
    loadId: load.id,
    load,
    suggestionType,
    distanceToPickupMiles: Number(distanceToPickup.toFixed(1)),
    loadMiles: Number(loadDistance.toFixed(1)),
    totalMiles: Number(totalMiles.toFixed(1)),
    revenueEstimate: revenue,
    driverCostEstimate: costs.driverCost,
    fuelCostEstimate: costs.fuelCost,
    profitEstimate: Number(profitEstimate.toFixed(2)),
    profitPerMile: Number(profitPerMile.toFixed(4)),
    capacityFitPercent: Number(capacityFitPercent.toFixed(1)),
    matchScore: Number(matchScore.toFixed(1)),
    scoreBreakdown,
  };
}

/**
 * Calculate individual score components
 */
function calculateScores(
  distanceToPickup: number,
  profitPerMile: number,
  capacityFitPercent: number,
  dropoffState: string | null | undefined,
  returnRoutePreference: string[],
  preferredReturnStates: string[],
  loadCompanyId: string,
  partnerIds: Set<string>
): ScoreBreakdown {
  // Proximity score (0-25): Closer pickup = higher score
  let proximityScore = 0;
  if (distanceToPickup <= 25) proximityScore = 25;
  else if (distanceToPickup <= 50) proximityScore = 20;
  else if (distanceToPickup <= 75) proximityScore = 15;
  else if (distanceToPickup <= 100) proximityScore = 10;
  else proximityScore = 5;

  // Profit score (0-25): Higher profit per mile = higher score
  let profitScore = 0;
  if (profitPerMile >= 2.5) profitScore = 25;
  else if (profitPerMile >= 2.0) profitScore = 20;
  else if (profitPerMile >= 1.5) profitScore = 15;
  else if (profitPerMile >= 1.25) profitScore = 10;
  else profitScore = 5;

  // Capacity score (0-20): 60-90% utilization is ideal
  let capacityScore = 0;
  if (capacityFitPercent >= 60 && capacityFitPercent <= 90) capacityScore = 20;
  else if (capacityFitPercent >= 40 && capacityFitPercent <= 95) capacityScore = 15;
  else capacityScore = 10;

  // Route score (0-20): Does destination match preferred return route?
  let routeScore = 5;
  if (dropoffState) {
    if (returnRoutePreference.includes(dropoffState)) {
      routeScore = 20;
    } else if (preferredReturnStates.includes(dropoffState)) {
      routeScore = 15;
    }
  }

  // Partner score (0-10): Is this from a known partner?
  const partnerScore = partnerIds.has(loadCompanyId) ? 10 : 0;

  return {
    proximityScore,
    profitScore,
    capacityScore,
    routeScore,
    partnerScore,
  };
}

/**
 * Determine the primary suggestion type based on scores
 */
function determineSuggestionType(scores: ScoreBreakdown): SuggestionType {
  if (scores.partnerScore > 0) return 'partner_load';
  if (scores.profitScore >= 20) return 'high_profit';
  if (scores.routeScore >= 15) return 'backhaul';
  if (scores.capacityScore >= 18) return 'capacity_fit';
  return 'near_delivery';
}

/**
 * Save suggestions to database
 */
export async function saveSuggestions(
  supabase: SupabaseClient,
  tripId: string,
  companyId: string | null,
  driverId: string,
  ownerId: string,
  suggestions: ScoredSuggestion[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (suggestions.length === 0) {
    return { success: true, count: 0 };
  }

  // Set expiration (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const records = suggestions.map((s) => ({
    owner_id: ownerId,
    trip_id: tripId,
    company_id: companyId,
    driver_id: driverId,
    load_id: s.loadId,
    suggestion_type: s.suggestionType,
    distance_to_pickup_miles: s.distanceToPickupMiles,
    load_miles: s.loadMiles,
    total_miles: s.totalMiles,
    profit_estimate: s.profitEstimate,
    profit_per_mile: s.profitPerMile,
    revenue_estimate: s.revenueEstimate,
    driver_cost_estimate: s.driverCostEstimate,
    fuel_cost_estimate: s.fuelCostEstimate,
    capacity_fit_percent: s.capacityFitPercent,
    match_score: s.matchScore,
    score_breakdown: s.scoreBreakdown,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
  }));

  // Upsert to handle duplicates
  const { error } = await supabase.from('load_suggestions').upsert(records, {
    onConflict: 'trip_id,load_id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('Error saving suggestions:', error);
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: suggestions.length };
}

/**
 * Build matching context from trip data
 */
export async function buildMatchingContext(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<TripMatchingContext | null> {
  // Get trip with all related data
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      *,
      driver:drivers(
        id,
        pay_mode,
        rate_per_mile,
        rate_per_cuft,
        percent_of_revenue,
        flat_daily_rate,
        location_sharing_enabled
      ),
      trailer:trailers(id, cubic_capacity),
      trip_loads:trip_loads(
        load:loads(
          id,
          delivery_city,
          delivery_state,
          delivery_zip,
          delivery_date,
          cubic_feet,
          actual_cuft_loaded
        )
      )
    `
    )
    .eq('id', tripId)
    .eq('owner_id', userId)
    .single();

  if (tripError || !trip) {
    console.error('Error fetching trip for matching:', tripError);
    return null;
  }

  // Get company info
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  const companyId = profile?.company_id || null;

  // Calculate remaining capacity
  const trailerCapacity = trip.trailer?.cubic_capacity || 4200;
  const loadedCuft = trip.trip_loads?.reduce((sum: number, tl: any) => {
    const cuft = tl.load?.actual_cuft_loaded ?? tl.load?.cubic_feet ?? 0;
    return sum + cuft;
  }, 0) || 0;
  const remainingCapacity = trip.remaining_capacity_cuft ?? Math.max(0, trailerCapacity - loadedCuft);

  // Build delivery destinations
  const deliveryDestinations = trip.trip_loads?.map((tl: any) => ({
    city: tl.load?.delivery_city,
    state: tl.load?.delivery_state,
    zip: tl.load?.delivery_zip,
    expectedDate: tl.load?.delivery_date ? new Date(tl.load.delivery_date) : null,
    loadId: tl.load?.id,
  })) || [];

  // Build driver pay config
  const driver = trip.driver;
  const driverPayConfig: DriverPayConfig = {
    pay_mode: driver?.pay_mode || 'per_mile',
    rate_per_mile: driver?.rate_per_mile,
    rate_per_cuft: driver?.rate_per_cuft,
    percent_of_revenue: driver?.percent_of_revenue,
    flat_daily_rate: driver?.flat_daily_rate,
  };

  return {
    tripId: trip.id,
    driverId: trip.driver_id,
    companyId: companyId || '',
    ownerId: userId,
    currentLocation: trip.current_location_lat && trip.current_location_lng
      ? {
          lat: trip.current_location_lat,
          lng: trip.current_location_lng,
          city: trip.current_location_city,
          state: trip.current_location_state,
        }
      : null,
    deliveryDestinations,
    trailerCapacityCuft: trailerCapacity,
    remainingCapacityCuft: remainingCapacity,
    driverPayConfig,
    returnRoutePreference: trip.return_route_preference || [],
  };
}

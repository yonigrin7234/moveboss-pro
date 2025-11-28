/**
 * Geocoding utilities for zip code lookups and distance calculations
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

export interface GeocodingResult {
  success: boolean;
  coordinates?: GeoCoordinates;
  error?: string;
}

// Cache for zip code lookups to avoid repeated API calls
const zipCodeCache = new Map<string, GeoCoordinates>();

/**
 * Get coordinates for a US zip code using Zippopotam.us API (free, no key required)
 */
export async function geocodeZipCode(zipCode: string): Promise<GeocodingResult> {
  const cleanZip = zipCode.trim().substring(0, 5);

  if (!/^\d{5}$/.test(cleanZip)) {
    return { success: false, error: 'Invalid zip code format' };
  }

  // Check cache first
  const cached = zipCodeCache.get(cleanZip);
  if (cached) {
    return { success: true, coordinates: cached };
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Zip code not found' };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const place = data.places?.[0];

    if (!place) {
      return { success: false, error: 'No location data found' };
    }

    const coordinates: GeoCoordinates = {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation'],
    };

    // Cache the result
    zipCodeCache.set(cleanZip, coordinates);

    return { success: true, coordinates };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to geocode zip code',
    };
  }
}

/**
 * Geocode a full address using city, state, and optional zip
 * Falls back to zip code if provided
 */
export async function geocodeAddress(
  city?: string | null,
  state?: string | null,
  postalCode?: string | null
): Promise<GeocodingResult> {
  // Try zip code first if available
  if (postalCode) {
    const zipResult = await geocodeZipCode(postalCode);
    if (zipResult.success) {
      return zipResult;
    }
  }

  // If no zip or zip failed, we can't geocode without an API key
  // Return a fallback based on state center (rough estimate)
  if (state) {
    const stateCenter = STATE_CENTERS[state.toUpperCase()];
    if (stateCenter) {
      return {
        success: true,
        coordinates: {
          lat: stateCenter.lat,
          lng: stateCenter.lng,
          city: city || undefined,
          state: state,
        },
      };
    }
  }

  return { success: false, error: 'Unable to geocode location' };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: GeoCoordinates,
  point2: GeoCoordinates
): number {
  const R = 3958.8; // Earth's radius in miles

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total distance for a route (array of points)
 */
export function calculateRouteDistance(points: GeoCoordinates[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(points[i], points[i + 1]);
  }

  return totalDistance;
}

/**
 * Calculate distance from a point to a line segment (for "detour" calculation)
 * Returns distance in miles from the point to the closest point on the route
 */
export function calculateDetourDistance(
  routeStart: GeoCoordinates,
  routeEnd: GeoCoordinates,
  point: GeoCoordinates
): number {
  // Calculate distance from point to both endpoints
  const distToStart = calculateDistance(point, routeStart);
  const distToEnd = calculateDistance(point, routeEnd);

  // Calculate route length
  const routeLength = calculateDistance(routeStart, routeEnd);

  if (routeLength === 0) return distToStart;

  // Project point onto line using normalized coordinates
  const t = Math.max(0, Math.min(1,
    ((point.lat - routeStart.lat) * (routeEnd.lat - routeStart.lat) +
     (point.lng - routeStart.lng) * (routeEnd.lng - routeStart.lng)) /
    (Math.pow(routeEnd.lat - routeStart.lat, 2) + Math.pow(routeEnd.lng - routeStart.lng, 2))
  ));

  // Find closest point on line
  const closestPoint: GeoCoordinates = {
    lat: routeStart.lat + t * (routeEnd.lat - routeStart.lat),
    lng: routeStart.lng + t * (routeEnd.lng - routeStart.lng),
  };

  return calculateDistance(point, closestPoint);
}

/**
 * Calculate added miles for a detour (how much extra to pick up a load)
 * Returns total added miles (there and back to route)
 */
export function calculateAddedMiles(
  routeStart: GeoCoordinates,
  routeEnd: GeoCoordinates,
  detourPoint: GeoCoordinates
): number {
  // Current direct distance
  const directDistance = calculateDistance(routeStart, routeEnd);

  // Distance via detour
  const viaDetour = calculateDistance(routeStart, detourPoint) +
                    calculateDistance(detourPoint, routeEnd);

  return Math.max(0, viaDetour - directDistance);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// State center coordinates (approximate centers for fallback)
const STATE_CENTERS: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806671, lng: -86.791130 },
  AK: { lat: 61.370716, lng: -152.404419 },
  AZ: { lat: 33.729759, lng: -111.431221 },
  AR: { lat: 34.969704, lng: -92.373123 },
  CA: { lat: 36.116203, lng: -119.681564 },
  CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 },
  DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 21.094318, lng: -157.498337 },
  ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 },
  IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.526600, lng: -96.726486 },
  KY: { lat: 37.668140, lng: -84.670067 },
  LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 },
  MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 },
  MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 },
  MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.125370, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 },
  NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 },
  NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 },
  OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 },
  PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.511780 },
  SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 },
  TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 },
  UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 },
  WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 },
  WY: { lat: 42.755966, lng: -107.302490 },
  DC: { lat: 38.897438, lng: -77.026817 },
};

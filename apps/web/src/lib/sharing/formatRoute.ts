/**
 * Unified Route Formatter
 *
 * Formats load routes consistently as: "City, ST ZIP -> City, ST ZIP"
 * Used across all sharing functionality: API, modals, and public pages.
 */

export interface LoadLocationFields {
  // Origin fields (pickup)
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_postal_code?: string | null;
  pickup_zip?: string | null;

  // Destination fields (delivery/dropoff)
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_postal_code?: string | null;
  dropoff_city?: string | null;
  dropoff_state?: string | null;
  dropoff_postal_code?: string | null;

  // Loading location (for RFD loads where origin is loading location)
  loading_city?: string | null;
  loading_state?: string | null;
  loading_postal_code?: string | null;
}

/**
 * Formats a location string based on available data
 * Returns: "City, ST ZIP" | "City, ST" | "City" | "Unknown"
 */
function formatLocation(
  city?: string | null,
  state?: string | null,
  zip?: string | null
): string {
  const parts: string[] = [];

  if (city?.trim()) {
    parts.push(city.trim());
  }

  if (state?.trim()) {
    // If we have city, add state as "City, ST"
    if (parts.length > 0) {
      parts[0] = `${parts[0]}, ${state.trim().toUpperCase()}`;
    } else {
      parts.push(state.trim().toUpperCase());
    }
  }

  if (zip?.trim()) {
    // Add ZIP to the end
    if (parts.length > 0) {
      parts[0] = `${parts[0]} ${zip.trim()}`;
    } else {
      parts.push(zip.trim());
    }
  }

  return parts.length > 0 ? parts[0] : 'Unknown';
}

/**
 * Formats a complete route string
 * Always returns: "{origin} → {destination}"
 */
export function formatRoute(loc: LoadLocationFields): string {
  // Get origin location
  const originCity = loc.pickup_city || loc.loading_city;
  const originState = loc.pickup_state || loc.loading_state;
  const originZip = loc.pickup_postal_code || loc.pickup_zip || loc.loading_postal_code;

  // Get destination location (prefer delivery_*, fallback to dropoff_*)
  const destCity = loc.delivery_city || loc.dropoff_city;
  const destState = loc.delivery_state || loc.dropoff_state;
  const destZip = loc.delivery_postal_code || loc.dropoff_postal_code;

  const origin = formatLocation(originCity, originState, originZip);
  const destination = formatLocation(destCity, destState, destZip);

  return `${origin} → ${destination}`;
}

/**
 * Gets formatted origin location only
 */
export function formatOrigin(loc: LoadLocationFields): string {
  const city = loc.pickup_city || loc.loading_city;
  const state = loc.pickup_state || loc.loading_state;
  const zip = loc.pickup_postal_code || loc.pickup_zip || loc.loading_postal_code;

  return formatLocation(city, state, zip);
}

/**
 * Gets formatted destination location only
 */
export function formatDestination(loc: LoadLocationFields): string {
  const city = loc.delivery_city || loc.dropoff_city;
  const state = loc.delivery_state || loc.dropoff_state;
  const zip = loc.delivery_postal_code || loc.dropoff_postal_code;

  return formatLocation(city, state, zip);
}

/**
 * Gets origin and destination as separate strings
 * Useful for components that display them separately
 */
export function getRouteLocations(loc: LoadLocationFields): { origin: string; destination: string } {
  return {
    origin: formatOrigin(loc),
    destination: formatDestination(loc),
  };
}

/**
 * Mobile Message Builder
 *
 * Builds consistent share messages for WhatsApp and plain text.
 * Simplified port of web's lib/sharing/buildMessage.ts
 */

export interface ShareableLoad {
  id: string;
  load_number?: string | null;
  // Location fields
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_postal_code?: string | null;
  pickup_zip?: string | null;
  dropoff_city?: string | null;
  dropoff_state?: string | null;
  dropoff_postal_code?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_postal_code?: string | null;
  // Loading location (for RFD loads)
  loading_city?: string | null;
  loading_state?: string | null;
  loading_postal_code?: string | null;
  // Pricing
  cubic_feet?: number | null;
  cuft?: number | null;
  cubic_feet_estimate?: number | null;
  rate_per_cuft?: number | null;
  total_rate?: number | null;
  linehaul_amount?: number | null;
  balance_cf?: number | null;
  remaining_cf?: number | null;
  // Pickup dates
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
  pickup_date_start?: string | null;
  pickup_date?: string | null;
  first_available_date?: string | null;
  rfd_date?: string | null;
  // Status
  status?: string | null;
}

export interface BuildMessageOptions {
  showRates?: boolean;
  companyName?: string;
  link?: string;
}

/**
 * Formats a location string: "City, ST ZIP" | "City, ST" | "City" | "Unknown"
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
    if (parts.length > 0) {
      parts[0] = `${parts[0]}, ${state.trim().toUpperCase()}`;
    } else {
      parts.push(state.trim().toUpperCase());
    }
  }

  if (zip?.trim()) {
    if (parts.length > 0) {
      parts[0] = `${parts[0]} ${zip.trim()}`;
    } else {
      parts.push(zip.trim());
    }
  }

  return parts.length > 0 ? parts[0] : 'Unknown';
}

/**
 * Format a route string with ZIP codes: "City, ST ZIP → City, ST ZIP"
 */
function formatRoute(load: ShareableLoad): string {
  // Get origin location
  const originCity = load.pickup_city || load.loading_city;
  const originState = load.pickup_state || load.loading_state;
  const originZip = load.pickup_postal_code || load.pickup_zip || load.loading_postal_code;

  // Get destination location (prefer delivery_*, fallback to dropoff_*)
  const destCity = load.delivery_city || load.dropoff_city;
  const destState = load.delivery_state || load.dropoff_state;
  const destZip = load.delivery_postal_code || load.dropoff_postal_code;

  const origin = formatLocation(originCity, originState, originZip);
  const destination = formatLocation(destCity, destState, destZip);

  return `${origin} → ${destination}`;
}

/**
 * Get cubic feet value
 */
function getCubicFeet(load: ShareableLoad): number | null {
  return load.cubic_feet || load.cuft || load.cubic_feet_estimate || null;
}

/**
 * Get balance CF left
 */
function getBalanceCF(load: ShareableLoad): number | null {
  return load.balance_cf || load.remaining_cf || null;
}

/**
 * Builds balance line if applicable
 */
function buildBalanceLine(load: ShareableLoad): string {
  const balance = getBalanceCF(load);
  if (!balance || balance <= 0) return '';
  return `• Balance left: ${balance.toLocaleString()} CF`;
}

/**
 * Get total payout
 */
function getTotalPayout(load: ShareableLoad): number | null {
  return load.total_rate || load.linehaul_amount || null;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format pickup window dates
 */
function formatPickupWindow(load: ShareableLoad): string | null {
  const start = load.pickup_window_start || load.rfd_date;
  const end = load.pickup_window_end;

  if (!start && !end) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (start && end) {
    const startDate = formatDate(start);
    const endDate = formatDate(end);
    return startDate === endDate ? startDate : `${startDate}–${endDate}`;
  }

  return start ? formatDate(start) : null;
}

/**
 * Determine template type based on load data
 */
function getTemplateType(load: ShareableLoad): 'LIVE_PICKUP' | 'RFD' | 'GENERIC' {
  if (load.pickup_window_start || load.pickup_window_end) {
    return 'LIVE_PICKUP';
  }
  if (load.rfd_date) {
    return 'RFD';
  }
  return 'GENERIC';
}

/**
 * Determine unified template type for a batch of loads
 * Returns the most specific type if all loads share it, otherwise GENERIC
 */
function getBatchTemplateType(loads: ShareableLoad[]): 'LIVE_PICKUP' | 'RFD' | 'GENERIC' {
  if (loads.length === 0) return 'GENERIC';
  if (loads.length === 1) return getTemplateType(loads[0]);

  const types = loads.map(getTemplateType);
  const uniqueTypes = [...new Set(types)];

  if (uniqueTypes.length === 1) {
    return uniqueTypes[0];
  }

  return 'GENERIC';
}

/**
 * Checks if a date is today or in the future
 */
function isDateTodayOrFuture(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Gets the primary date for a load
 */
function getPrimaryDate(load: ShareableLoad): string | null {
  return load.rfd_date || load.pickup_window_start || null;
}

/**
 * Gets the date label based on template type
 */
function getDateLabel(templateType: 'LIVE_PICKUP' | 'RFD' | 'GENERIC'): string {
  return templateType === 'RFD' ? 'RFD date' : 'Pickup';
}

/**
 * Determines if date should be shown for a load
 * For RFD loads, only show if date is today or in the future
 */
function shouldShowDate(load: ShareableLoad, templateType: 'LIVE_PICKUP' | 'RFD' | 'GENERIC'): boolean {
  const dateStr = formatPickupWindow(load);
  if (!dateStr) return false;

  if (templateType === 'RFD') {
    const primaryDate = getPrimaryDate(load);
    return isDateTodayOrFuture(primaryDate);
  }

  return true;
}

/**
 * Get header text based on template type
 */
function getHeaderText(templateType: 'LIVE_PICKUP' | 'RFD' | 'GENERIC'): string {
  switch (templateType) {
    case 'LIVE_PICKUP':
      return 'LIVE LOAD PICKUP AVAILABLE';
    case 'RFD':
      return 'RFD LOAD AVAILABLE';
    default:
      return 'LOAD AVAILABLE';
  }
}

/**
 * Builds CF line
 */
function buildCFLine(load: ShareableLoad, showRates: boolean): string {
  const cf = getCubicFeet(load);
  const rate = load.rate_per_cuft;

  if (!cf) return '';

  if (showRates && rate) {
    return `• ${cf.toLocaleString()} CF @ $${rate.toFixed(2)}/cf`;
  }

  return `• ${cf.toLocaleString()} CF`;
}

/**
 * Builds payout line
 */
function buildPayoutLine(load: ShareableLoad, showRates: boolean): string {
  if (!showRates) return '';
  const payout = getTotalPayout(load);
  if (!payout) return '';
  return `• ${formatCurrency(payout)} payout`;
}

/**
 * Builds a single load share message
 */
export function buildSingleLoadMessage(
  load: ShareableLoad,
  opts: BuildMessageOptions = {}
): string {
  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';

  const templateType = getTemplateType(load);
  const headerText = getHeaderText(templateType);
  const header = companyName
    ? `*${headerText}* — ${companyName}`
    : `*${headerText}*`;
  const route = formatRoute(load);
  const cfLine = buildCFLine(load, showRates);
  const pickupWindow = formatPickupWindow(load);
  const payoutLine = buildPayoutLine(load, showRates);
  const dateLabel = getDateLabel(templateType);
  const showDate = shouldShowDate(load, templateType);

  const balanceLine = buildBalanceLine(load);

  const lines: string[] = [];
  lines.push(header);
  lines.push('');
  lines.push(`→ ${route}`);

  if (cfLine) lines.push(cfLine);
  if (balanceLine) lines.push(balanceLine);
  if (showDate && pickupWindow) lines.push(`• ${dateLabel}: ${pickupWindow}`);
  if (payoutLine) lines.push(payoutLine);

  if (opts.link) {
    lines.push('');
    lines.push(`→ Claim: ${opts.link}`);
  }

  return lines.join('\n');
}

/**
 * Builds a multi-load share message
 */
export function buildMultiLoadMessage(
  loads: ShareableLoad[],
  opts: BuildMessageOptions = {}
): string {
  if (loads.length === 0) return '';
  if (loads.length === 1) return buildSingleLoadMessage(loads[0], opts);

  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';

  // Use batch template type for type-aware headers (matching web)
  const batchType = getBatchTemplateType(loads);
  const batchHeaderText =
    batchType === 'LIVE_PICKUP'
      ? `${loads.length} LIVE LOAD PICKUPS AVAILABLE`
      : batchType === 'RFD'
        ? `${loads.length} RFD LOADS AVAILABLE`
        : `${loads.length} LOADS AVAILABLE`;

  const header = companyName
    ? `*${batchHeaderText}* — ${companyName}`
    : `*${batchHeaderText}*`;

  const items = loads.map((load, i) => {
    const route = formatRoute(load);
    const cf = getCubicFeet(load);
    const rate = load.rate_per_cuft;
    const balance = getBalanceCF(load);
    const pickup = formatPickupWindow(load);
    const payout = getTotalPayout(load);
    const loadTemplateType = getTemplateType(load);
    const dateLabel = getDateLabel(loadTemplateType);
    const showDate = shouldShowDate(load, loadTemplateType);

    const parts: string[] = [];

    if (cf) {
      if (showRates && rate) {
        parts.push(`${cf.toLocaleString()} CF @ $${rate.toFixed(2)}/cf`);
      } else {
        parts.push(`${cf.toLocaleString()} CF`);
      }
    }

    if (balance && balance > 0) {
      parts.push(`Balance: ${balance.toLocaleString()} CF`);
    }

    if (showDate && pickup) {
      parts.push(`${dateLabel}: ${pickup}`);
    }

    if (showRates && payout) {
      parts.push(formatCurrency(payout));
    }

    const details = parts.length > 0 ? `\n    ${parts.join(' • ')}` : '';

    return `${i + 1}. ${route}${details}`;
  });

  const lines: string[] = [];
  lines.push(header);
  lines.push('');
  lines.push(...items);

  if (opts.link) {
    lines.push('');
    lines.push(`→ View details & claim: ${opts.link}`);
  }

  return lines.join('\n');
}

/**
 * Main entry point - builds message for any number of loads
 */
export function buildShareMessage(
  loads: ShareableLoad[],
  opts: BuildMessageOptions = {}
): string {
  if (loads.length === 0) return '';
  if (loads.length === 1) {
    return buildSingleLoadMessage(loads[0], opts);
  }
  return buildMultiLoadMessage(loads, opts);
}

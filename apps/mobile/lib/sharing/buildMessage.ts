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
  dropoff_city?: string | null;
  dropoff_state?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  // Pricing
  cubic_feet?: number | null;
  cuft?: number | null;
  rate_per_cuft?: number | null;
  total_rate?: number | null;
  linehaul_amount?: number | null;
  // Pickup dates
  pickup_window_start?: string | null;
  pickup_window_end?: string | null;
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
 * Format a route string
 */
function formatRoute(load: ShareableLoad): string {
  const originCity = load.pickup_city || 'Unknown';
  const originState = load.pickup_state || '';
  const destCity = load.delivery_city || load.dropoff_city || 'Unknown';
  const destState = load.delivery_state || load.dropoff_state || '';

  const origin = originState ? `${originCity}, ${originState}` : originCity;
  const dest = destState ? `${destCity}, ${destState}` : destCity;

  return `${origin} → ${dest}`;
}

/**
 * Get cubic feet value
 */
function getCubicFeet(load: ShareableLoad): number | null {
  return load.cubic_feet || load.cuft || null;
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
  const start = load.pickup_window_start;
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

  const lines: string[] = [];
  lines.push(header);
  lines.push('');
  lines.push(`→ ${route}`);

  if (cfLine) lines.push(cfLine);
  if (pickupWindow) lines.push(`• Pickup: ${pickupWindow}`);
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

  const header = companyName
    ? `*${loads.length} LOADS AVAILABLE* — ${companyName}`
    : `*${loads.length} LOADS AVAILABLE*`;

  const items = loads.map((load, i) => {
    const route = formatRoute(load);
    const cf = getCubicFeet(load);
    const rate = load.rate_per_cuft;
    const payout = getTotalPayout(load);

    const parts: string[] = [];

    if (cf) {
      if (showRates && rate) {
        parts.push(`${cf.toLocaleString()} CF @ $${rate.toFixed(2)}/cf`);
      } else {
        parts.push(`${cf.toLocaleString()} CF`);
      }
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

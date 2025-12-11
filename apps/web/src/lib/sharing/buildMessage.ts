/**
 * Unified Message Builder
 *
 * Builds consistent share messages for WhatsApp, plain text, and email.
 * All share messages should go through these functions.
 */

import { formatRoute, type LoadLocationFields } from './formatRoute';
import {
  getSharingTemplateType,
  getBatchTemplateType,
  type LoadTypeFields,
} from './templateType';
import { formatPickupWindow, type PickupDateFields } from './formatPickupWindow';

// Combined load interface for message building
export interface ShareableLoad
  extends LoadLocationFields,
    LoadTypeFields,
    PickupDateFields {
  id: string;
  load_number?: string | null;
  cubic_feet?: number | null;
  cubic_feet_estimate?: number | null;
  rate_per_cuft?: number | null;
  total_rate?: number | null;
  linehaul_amount?: number | null;
  balance_cf?: number | null;
  remaining_cf?: number | null;
}

export type ShareFormat = 'whatsapp' | 'plain' | 'email';

export interface BuildShareMessageOptions {
  format: ShareFormat;
  link?: string;
  showRates?: boolean;
  companyName?: string;
}

/**
 * Gets the cubic feet value from a load
 */
function getCubicFeet(load: ShareableLoad): number | null {
  return load.cubic_feet || load.cubic_feet_estimate || null;
}

/**
 * Gets the balance CF left
 */
function getBalanceCF(load: ShareableLoad): number | null {
  return load.balance_cf || load.remaining_cf || null;
}

/**
 * Gets the total payout/rate
 */
function getTotalPayout(load: ShareableLoad): number | null {
  return load.total_rate || load.linehaul_amount || null;
}

/**
 * Formats currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Emoji bullets for better visual appearance in WhatsApp
const ICONS = {
  ROUTE: '📍',
  BOX: '📦',
  MONEY: '💰',
  CALENDAR: '📅',
  TRUCK: '🚚',
};

/**
 * Builds the CF line for a load
 * Examples: "📦 1,200 CF @ $3.50/cf" or "📦 1,200 CF"
 */
function buildCFLine(load: ShareableLoad, showRates: boolean): string {
  const cf = getCubicFeet(load);
  const rate = load.rate_per_cuft;

  if (!cf) return '';

  if (showRates && rate) {
    return `${ICONS.BOX} ${cf.toLocaleString()} CF @ $${rate.toFixed(2)}/cf`;
  }

  return `${ICONS.BOX} ${cf.toLocaleString()} CF`;
}

/**
 * Builds the balance line if applicable
 */
function buildBalanceLine(load: ShareableLoad): string {
  const balance = getBalanceCF(load);
  if (!balance || balance <= 0) return '';
  return `${ICONS.BOX} Balance left: ${balance.toLocaleString()} CF`;
}

/**
 * Builds the payout line
 */
function buildPayoutLine(load: ShareableLoad, showRates: boolean): string {
  if (!showRates) return '';
  const payout = getTotalPayout(load);
  if (!payout) return '';
  return `${ICONS.MONEY} ${formatCurrency(payout)} payout`;
}

/**
 * Gets the header text based on template type
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
 * Builds a single load share message (WhatsApp/Plain)
 */
export function buildSingleLoadMessage(
  load: ShareableLoad,
  opts: BuildShareMessageOptions
): string {
  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';

  if (opts.format === 'email') {
    return buildSingleLoadEmailMessage(load, opts);
  }

  const templateType = getSharingTemplateType(load);
  const headerText = getHeaderText(templateType);
  const header = companyName
    ? `${ICONS.TRUCK} *${headerText}* — ${companyName}`
    : `${ICONS.TRUCK} *${headerText}*`;
  const route = formatRoute(load);
  const cfLine = buildCFLine(load, showRates);
  const balanceLine = buildBalanceLine(load);
  const pickupWindow = formatPickupWindow(load);
  const payoutLine = buildPayoutLine(load, showRates);

  const lines: string[] = [];
  lines.push(header);
  lines.push('');
  lines.push(`${ICONS.ROUTE} ${route}`);

  if (cfLine) lines.push(cfLine);
  if (balanceLine) lines.push(balanceLine);
  if (pickupWindow) lines.push(`${ICONS.CALENDAR} Pickup: ${pickupWindow}`);
  if (payoutLine) lines.push(payoutLine);

  // Link at bottom with "Claim:" prefix
  if (opts.link) {
    lines.push('');
    lines.push(`${ICONS.ROUTE} Claim: ${opts.link}`);
  }

  return lines.join('\n');
}

/**
 * Builds a single load email message (HTML)
 */
function buildSingleLoadEmailMessage(
  load: ShareableLoad,
  opts: BuildShareMessageOptions
): string {
  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';
  const templateType = getSharingTemplateType(load);
  const headerText = getHeaderText(templateType);
  const fullHeader = companyName ? `${headerText} — ${companyName}` : headerText;

  const route = formatRoute(load);
  const cf = getCubicFeet(load);
  const rate = load.rate_per_cuft;
  const balance = getBalanceCF(load);
  const pickup = formatPickupWindow(load);
  const payout = getTotalPayout(load);

  const details: string[] = [];
  if (cf) {
    if (showRates && rate) {
      details.push(`${cf.toLocaleString()} CF @ $${rate.toFixed(2)}/cf`);
    } else {
      details.push(`${cf.toLocaleString()} CF`);
    }
  }
  if (balance && balance > 0) {
    details.push(`Balance: ${balance.toLocaleString()} CF`);
  }
  if (pickup) {
    details.push(`Pickup: ${pickup}`);
  }
  if (showRates && payout) {
    details.push(`Payout: ${formatCurrency(payout)}`);
  }

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a1a; margin-bottom: 16px;">${fullHeader}</h2>
  <p style="font-size: 18px; color: #333; margin-bottom: 16px;"><strong>${route}</strong></p>
  ${
    details.length > 0
      ? `<p style="color: #555; line-height: 1.6;">${details.join('<br/>')}</p>`
      : ''
  }
  ${
    opts.link
      ? `<p style="margin-top: 20px;">
          <a href="${opts.link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Claim This Load
          </a>
        </p>`
      : ''
  }
</div>`.trim();
}

/**
 * Builds a multi-load share message (WhatsApp/Plain)
 */
export function buildMultiLoadMessage(
  loads: ShareableLoad[],
  opts: BuildShareMessageOptions
): string {
  if (loads.length === 0) return '';
  if (loads.length === 1) return buildSingleLoadMessage(loads[0], opts);

  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';

  if (opts.format === 'email') {
    return buildMultiLoadEmailMessage(loads, opts);
  }

  const batchType = getBatchTemplateType(loads);
  const batchHeaderText =
    batchType === 'LIVE_PICKUP'
      ? `${loads.length} LIVE LOAD PICKUPS AVAILABLE`
      : batchType === 'RFD'
        ? `${loads.length} RFD LOADS AVAILABLE`
        : `${loads.length} LOADS AVAILABLE`;

  const header = companyName
    ? `${ICONS.TRUCK} *${batchHeaderText}* — ${companyName}`
    : `${ICONS.TRUCK} *${batchHeaderText}*`;

  const items = loads.map((load, i) => {
    const route = formatRoute(load);
    const cf = getCubicFeet(load);
    const rate = load.rate_per_cuft;
    const balance = getBalanceCF(load);
    const pickup = formatPickupWindow(load);
    const payout = getTotalPayout(load);

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

    if (pickup) {
      parts.push(`Pickup: ${pickup}`);
    }

    if (showRates && payout) {
      parts.push(formatCurrency(payout));
    }

    const details = parts.length > 0 ? `\n    ${parts.join(' • ')}` : '';
    const emoji = getNumberEmoji(i + 1);

    return `${emoji} ${route}${details}`;
  });

  const lines: string[] = [];
  lines.push(header);
  lines.push('');
  lines.push(...items);

  // Link at bottom
  if (opts.link) {
    lines.push('');
    lines.push(`${ICONS.ROUTE} View details & claim: ${opts.link}`);
  }

  return lines.join('\n');
}

/**
 * Builds a multi-load email message (HTML)
 */
function buildMultiLoadEmailMessage(
  loads: ShareableLoad[],
  opts: BuildShareMessageOptions
): string {
  const showRates = opts.showRates ?? true;
  const companyName = opts.companyName ?? '';
  const batchType = getBatchTemplateType(loads);
  const batchHeaderText =
    batchType === 'LIVE_PICKUP'
      ? `${loads.length} Live Load Pickups Available`
      : batchType === 'RFD'
        ? `${loads.length} RFD Loads Available`
        : `${loads.length} Loads Available`;
  const headerText = companyName ? `${batchHeaderText} — ${companyName}` : batchHeaderText;

  const loadRows = loads
    .map((load) => {
      const route = formatRoute(load);
      const cf = getCubicFeet(load);
      const pickup = formatPickupWindow(load) || 'TBD';
      const payout = showRates ? getTotalPayout(load) : null;

      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${route}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${cf ? `${cf.toLocaleString()} CF` : 'TBD'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${pickup}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${payout ? formatCurrency(payout) : 'Call for rate'}</td>
      </tr>
    `;
    })
    .join('');

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a1a1a;">${headerText}</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="padding: 12px; text-align: left;">Route</th>
        <th style="padding: 12px; text-align: left;">Size</th>
        <th style="padding: 12px; text-align: left;">Pickup</th>
        <th style="padding: 12px; text-align: left;">Payout</th>
      </tr>
    </thead>
    <tbody>
      ${loadRows}
    </tbody>
  </table>
  ${
    opts.link
      ? `<p>
          <a href="${opts.link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View All Loads
          </a>
        </p>`
      : ''
  }
</div>`.trim();
}

/**
 * Gets the number marker for list items
 * Uses simple text numbers that render consistently everywhere
 */
function getNumberEmoji(n: number): string {
  return `${n}.`;
}

/**
 * Main entry point - builds message for any number of loads
 */
export function buildShareMessage(
  loads: ShareableLoad[],
  opts: BuildShareMessageOptions
): string {
  if (loads.length === 0) return '';
  if (loads.length === 1) {
    return buildSingleLoadMessage(loads[0], opts);
  }
  return buildMultiLoadMessage(loads, opts);
}

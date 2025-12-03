/**
 * Template Type Detection
 *
 * Automatically determines which sharing template to use based on load type.
 */

export type SharingTemplateType = 'LIVE_PICKUP' | 'RFD' | 'GENERIC';

export interface LoadTypeFields {
  load_type?: string | null;
  posting_type?: 'live_load' | 'rfd' | 'pickup' | string | null;
  load_subtype?: string | null;
  is_rfd?: boolean | null;
}

/**
 * Determines the sharing template type based on load properties
 */
export function getSharingTemplateType(load: LoadTypeFields): SharingTemplateType {
  const loadType = load.load_type?.toLowerCase?.() ?? '';
  const postingType = load.posting_type?.toLowerCase?.() ?? '';
  const loadSubtype = load.load_subtype?.toLowerCase?.() ?? '';

  // Check for RFD loads
  if (
    load.is_rfd === true ||
    postingType === 'rfd' ||
    loadSubtype === 'rfd' ||
    loadType === 'rfd'
  ) {
    return 'RFD';
  }

  // Check for live pickup loads
  if (
    postingType === 'live_load' ||
    postingType === 'pickup' ||
    loadType === 'live_load' ||
    loadSubtype === 'live'
  ) {
    return 'LIVE_PICKUP';
  }

  return 'GENERIC';
}

/**
 * Gets the header text for a sharing message based on template type
 */
export function getTemplateHeader(
  templateType: SharingTemplateType,
  count: number = 1
): string {
  if (count === 1) {
    switch (templateType) {
      case 'LIVE_PICKUP':
        return '🚚 *LIVE LOAD PICKUP AVAILABLE*';
      case 'RFD':
        return '🚚 *RFD LOAD AVAILABLE*';
      default:
        return '🚚 *LOAD AVAILABLE*';
    }
  }

  // Multiple loads - determine unified header
  switch (templateType) {
    case 'LIVE_PICKUP':
      return `🚚 *${count} LIVE LOAD PICKUPS AVAILABLE*`;
    case 'RFD':
      return `🚚 *${count} RFD LOADS AVAILABLE*`;
    default:
      return `🚚 *${count} LOADS AVAILABLE*`;
  }
}

/**
 * Determines the unified template type for a batch of loads
 */
export function getBatchTemplateType(
  loads: LoadTypeFields[]
): SharingTemplateType {
  if (loads.length === 0) return 'GENERIC';

  const types = loads.map(getSharingTemplateType);
  const allSame = types.every((t) => t === types[0]);

  if (allSame) {
    return types[0];
  }

  return 'GENERIC';
}

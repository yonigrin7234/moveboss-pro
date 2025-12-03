/**
 * Unified Load Sharing System
 *
 * Provides consistent formatting for all load sharing functionality.
 * Use these helpers everywhere: API routes, modals, and public pages.
 */

// Route formatting
export {
  formatRoute,
  formatOrigin,
  formatDestination,
  getRouteLocations,
  type LoadLocationFields,
} from './formatRoute';

// Template type detection
export {
  getSharingTemplateType,
  getBatchTemplateType,
  getTemplateHeader,
  type SharingTemplateType,
  type LoadTypeFields,
} from './templateType';

// Pickup window formatting
export {
  formatPickupWindow,
  formatPickupLine,
  formatDate,
  formatDateRangeDisplay,
  type PickupDateFields,
} from './formatPickupWindow';

// Message building
export {
  buildSingleLoadMessage,
  buildMultiLoadMessage,
  buildShareMessage,
  type ShareableLoad,
  type ShareFormat,
  type BuildShareMessageOptions,
} from './buildMessage';

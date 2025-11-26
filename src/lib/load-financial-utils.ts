/**
 * Client-safe load financial utilities
 * These are pure functions with no server-side dependencies
 */

// TrustLevel type (duplicated to avoid importing from server-side companies.ts)
export type TrustLevel = 'trusted' | 'cod_required';

// Helper function
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// PRE-DELIVERY CHECK - COD vs TRUSTED Company Logic
// ============================================================================

/**
 * Pre-delivery financial check result
 * Used by drivers to know if COD payment is required before unloading
 */
export interface PreDeliveryCheck {
  // Calculated amounts
  carrierRate: number;           // What we (the carrier/owner) earn for this load
  customerBalance: number;        // What customer needs to pay at delivery
  shortfall: number;              // carrierRate - customerBalance (what company owes us)

  // Trust status
  trustLevel: TrustLevel;
  isTrusted: boolean;

  // COD determination
  requiresCOD: boolean;           // Do we need to collect COD before unloading?
  codAmountRequired: number;      // How much COD is needed

  // Messaging
  statusMessage: string;          // Human-readable status
  actionRequired: string;         // What the driver needs to do
  alertLevel: 'success' | 'warning' | 'danger';  // UI styling hint
}

/**
 * Input for pre-delivery check
 */
export interface PreDeliveryCheckInput {
  // Load financial data
  actual_cuft_loaded?: number | null;
  rate_per_cuft?: number | null;
  contract_rate_per_cuft?: number | null;
  balance_due_on_delivery?: number | null;

  // Contract accessorials (already agreed)
  contract_accessorials_total?: number | null;

  // Company trust level
  trust_level: TrustLevel;
  company_name: string;

  // Has COD already been received?
  cod_received?: boolean;
  company_approved_exception?: boolean;
}

/**
 * Generate pre-delivery check for a load
 *
 * This is the critical decision point for drivers:
 * - For TRUSTED companies: Deliver and collect customer balance, company pays us later
 * - For COD REQUIRED companies: Company must pay us the shortfall BEFORE we unload
 */
export function generatePreDeliveryCheck(input: PreDeliveryCheckInput): PreDeliveryCheck {
  const actualCuft = Number(input.actual_cuft_loaded) || 0;
  const ratePerCuft = Number(input.contract_rate_per_cuft) || Number(input.rate_per_cuft) || 0;
  const contractAccessorials = Number(input.contract_accessorials_total) || 0;
  const customerBalance = Number(input.balance_due_on_delivery) || 0;

  // Calculate carrier rate (what we earn)
  const carrierRate = round(actualCuft * ratePerCuft + contractAccessorials);

  // Calculate shortfall (what company needs to pay us beyond customer balance)
  const shortfall = round(carrierRate - customerBalance);

  // Determine trust status
  const trustLevel = input.trust_level;
  const isTrusted = trustLevel === 'trusted';

  // COD is required if:
  // 1. Company is COD Required (not trusted)
  // 2. There is a positive shortfall (carrier rate > customer balance)
  // 3. COD has not already been received
  // 4. Company has not approved an exception
  const requiresCOD =
    !isTrusted &&
    shortfall > 0 &&
    !input.cod_received &&
    !input.company_approved_exception;

  const codAmountRequired = requiresCOD ? shortfall : 0;

  // Generate status message and action required
  let statusMessage: string;
  let actionRequired: string;
  let alertLevel: PreDeliveryCheck['alertLevel'];

  if (input.cod_received) {
    statusMessage = `COD of $${shortfall.toFixed(2)} received from ${input.company_name}`;
    actionRequired = customerBalance > 0
      ? `Collect $${customerBalance.toFixed(2)} from customer and complete delivery`
      : 'Complete delivery';
    alertLevel = 'success';
  } else if (input.company_approved_exception) {
    statusMessage = `${input.company_name} approved delivery without COD`;
    actionRequired = customerBalance > 0
      ? `Collect $${customerBalance.toFixed(2)} from customer and complete delivery`
      : 'Complete delivery';
    alertLevel = 'success';
  } else if (isTrusted) {
    if (shortfall > 0) {
      statusMessage = `TRUSTED - ${input.company_name} will pay you $${shortfall.toFixed(2)} after delivery`;
      actionRequired = customerBalance > 0
        ? `Collect $${customerBalance.toFixed(2)} from customer, then complete delivery`
        : 'Complete delivery';
      alertLevel = 'success';
    } else {
      statusMessage = 'Customer balance covers your rate';
      actionRequired = customerBalance > 0
        ? `Collect $${customerBalance.toFixed(2)} from customer`
        : 'Complete delivery';
      alertLevel = 'success';
    }
  } else {
    // COD Required company
    if (shortfall > 0) {
      statusMessage = `COD REQUIRED - ${input.company_name} must pay $${shortfall.toFixed(2)} BEFORE you unload`;
      actionRequired = `DO NOT UNLOAD until you receive $${shortfall.toFixed(2)} from ${input.company_name}`;
      alertLevel = 'danger';
    } else {
      statusMessage = 'Customer balance covers your rate - no COD needed';
      actionRequired = customerBalance > 0
        ? `Collect $${customerBalance.toFixed(2)} from customer`
        : 'Complete delivery';
      alertLevel = 'success';
    }
  }

  return {
    carrierRate,
    customerBalance,
    shortfall,
    trustLevel,
    isTrusted,
    requiresCOD,
    codAmountRequired,
    statusMessage,
    actionRequired,
    alertLevel,
  };
}

/**
 * Quick check if COD is required for a load/company combination
 */
export function requiresCODPayment(
  trustLevel: TrustLevel,
  carrierRate: number,
  customerBalance: number
): boolean {
  if (trustLevel === 'trusted') return false;
  const shortfall = carrierRate - customerBalance;
  return shortfall > 0;
}

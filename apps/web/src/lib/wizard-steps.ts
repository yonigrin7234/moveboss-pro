/**
 * Wizard step visibility helpers for load creation/edit wizard.
 *
 * This file is safe to import in both client and server components.
 */

/**
 * LoadFlowType indicates how a load was created/originated.
 * This is a NEW dimension, NOT a replacement for load_type, posting_type, or load_subtype.
 *
 * Used to control wizard step visibility:
 * - 'hhg_originated': Moving company created job for own customer → shows all steps
 * - 'storage_out_rfd': RFD from storage → skips Pickup step (origin is storage location)
 * - 'marketplace_purchase': Carrier bought from marketplace → skips Pickup step
 * - 'carrier_intake': Carrier manually intakes job from another company → skips Pickup step
 * - null: Legacy loads → shows all steps (backward compatible)
 */
export type LoadFlowType = 'hhg_originated' | 'storage_out_rfd' | 'marketplace_purchase' | 'carrier_intake';

/**
 * Wizard step identifiers for the load creation/edit wizard
 */
export type WizardStepId = 'basics' | 'pickup' | 'delivery' | 'financials';

/**
 * Determines which wizard steps should be visible based on load_flow_type.
 *
 * Behavior:
 * - null (legacy): show all steps (backward compatible)
 * - 'hhg_originated': show all steps (full HHG workflow)
 * - 'storage_out_rfd': hide Pickup step (origin is storage location)
 * - 'marketplace_purchase': hide Pickup step (pickup already done by posting company)
 * - 'carrier_intake': hide Pickup step (carrier intakes already-loaded goods)
 *
 * @param loadFlowType - The load_flow_type value from the load
 * @returns Array of visible step IDs in order
 */
export function getVisibleWizardSteps(loadFlowType: LoadFlowType | null | undefined): WizardStepId[] {
  // Legacy loads or HHG-originated loads show all steps
  if (!loadFlowType || loadFlowType === 'hhg_originated') {
    return ['basics', 'pickup', 'delivery', 'financials'];
  }

  // All other flow types skip the pickup step
  // (storage_out_rfd, marketplace_purchase, carrier_intake)
  return ['basics', 'delivery', 'financials'];
}

/**
 * Check if a specific wizard step should be visible
 */
export function isWizardStepVisible(
  stepId: WizardStepId,
  loadFlowType: LoadFlowType | null | undefined
): boolean {
  const visibleSteps = getVisibleWizardSteps(loadFlowType);
  return visibleSteps.includes(stepId);
}

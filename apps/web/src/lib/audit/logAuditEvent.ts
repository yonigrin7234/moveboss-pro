import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Entity types that can be audited
 */
export type AuditEntityType = 'trip' | 'load' | 'partnership' | 'company';

/**
 * Common audit actions
 */
export type AuditAction =
  // Trip actions
  | 'status_changed'
  | 'driver_assigned'
  | 'driver_removed'
  | 'equipment_assigned'
  | 'load_added'
  | 'load_removed'
  | 'loads_reordered'
  | 'trip_created'
  | 'trip_deleted'
  | 'trip_completed'
  | 'trip_settled'
  | 'delivery_order_confirmed'
  | 'driver_sharing_changed'
  // Trip expense actions
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  // Load actions
  | 'posted_to_marketplace'
  | 'removed_from_marketplace'
  | 'carrier_assigned'
  | 'carrier_removed'
  | 'carrier_request_accepted'
  | 'carrier_request_rejected'
  | 'carrier_request_submitted'
  | 'carrier_request_withdrawn'
  | 'load_created'
  | 'load_updated'
  | 'load_deleted'
  | 'load_delivered'
  | 'load_status_changed'
  // Partnership actions
  | 'partnership_created'
  | 'partnership_upgraded'
  | 'partnership_deactivated'
  // Company actions
  | 'company_updated'
  | 'member_added'
  | 'member_removed'
  // Settlement actions
  | 'settlement_created'
  | 'settlement_recalculated'
  // Generic
  | 'updated'
  | 'created'
  | 'deleted';

/**
 * Visibility levels for audit logs
 */
export type AuditVisibility = 'internal' | 'partner' | 'public';

/**
 * Source of the audit event
 */
export type AuditSource = 'web' | 'mobile' | 'system';

/**
 * Input for logging an audit event
 */
export interface LogAuditEventInput {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction | string;
  performedByUserId: string;
  performedByCompanyId?: string | null;
  source?: AuditSource;
  visibility?: AuditVisibility;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the audit_logs table.
 *
 * This function is designed to be non-blocking and fail-safe.
 * If the insert fails, it logs the error but does NOT throw.
 * This ensures that audit logging never breaks the main application flow.
 *
 * @param client - Supabase client (server-side)
 * @param input - Audit event details
 */
export async function logAuditEvent(
  client: SupabaseClient,
  input: LogAuditEventInput
): Promise<void> {
  try {
    // Verify the session matches the performedByUserId
    const { data: { user: sessionUser } } = await client.auth.getUser();
    const sessionUserId = sessionUser?.id;

    console.log('[Audit] Attempting to log event:', {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedByUserId: input.performedByUserId,
      sessionUserId,
      sessionMatch: sessionUserId === input.performedByUserId,
    });

    if (sessionUserId !== input.performedByUserId) {
      console.warn('[Audit] WARNING: Session user ID does not match performedByUserId!',
        'This will likely cause RLS policy to reject the insert.',
        { sessionUserId, performedByUserId: input.performedByUserId });
    }

    const { error, data } = await client.from('audit_logs').insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      performed_by_user_id: input.performedByUserId,
      performed_by_company_id: input.performedByCompanyId ?? null,
      source: input.source ?? 'web',
      visibility: input.visibility ?? 'partner',
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
      metadata: input.metadata ?? null,
    }).select('id');

    if (error) {
      console.error('[Audit] Failed to log event:', error.message, error.code, error.details, {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
      });
    } else {
      console.log('[Audit] Successfully logged event:', data?.[0]?.id);
    }
  } catch (err) {
    // Silently fail - audit logging should never break the main flow
    console.error('[Audit] Exception while logging event:', err);
  }
}

/**
 * Helper to create a minimal change snapshot for status changes
 */
export function createStatusChangeSnapshot(
  oldStatus: string | null | undefined,
  newStatus: string
): { previousValue: { status: string | null }; newValue: { status: string } } {
  return {
    previousValue: { status: oldStatus ?? null },
    newValue: { status: newStatus },
  };
}

/**
 * Helper to create metadata for driver assignment
 */
export function createDriverAssignmentMetadata(
  driverId: string,
  driverName: string,
  oldDriverId?: string | null,
  oldDriverName?: string | null
): Record<string, unknown> {
  return {
    driver_id: driverId,
    driver_name: driverName,
    old_driver_id: oldDriverId ?? null,
    old_driver_name: oldDriverName ?? null,
  };
}

/**
 * Helper to create metadata for marketplace posting
 */
export function createMarketplacePostingMetadata(data: {
  cubicFeet?: number;
  ratePerCuft?: number;
  linehaulAmount?: number;
  truckRequirement?: string;
  isOpenToCounter?: boolean;
}): Record<string, unknown> {
  return {
    cubic_feet: data.cubicFeet,
    rate_per_cuft: data.ratePerCuft,
    linehaul_amount: data.linehaulAmount,
    truck_requirement: data.truckRequirement,
    is_open_to_counter: data.isOpenToCounter,
  };
}

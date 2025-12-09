import { createClient } from '@/lib/supabase-server';
import type { AuditEntityType, AuditAction, AuditVisibility, AuditSource } from './logAuditEvent';

/**
 * Represents an audit log entry with performer details
 */
export interface AuditLogEntry {
  id: number;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction | string;
  performed_by_user_id: string;
  performed_by_company_id: string | null;
  source: AuditSource;
  visibility: AuditVisibility;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined from profiles
  performer_name: string | null;
  performer_email: string | null;
}

/**
 * Raw database row shape before transformation
 * Note: Supabase returns joined relations as arrays when using foreign key joins
 */
interface RawAuditLogRow {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by_user_id: string;
  performed_by_company_id: string | null;
  source: string;
  visibility: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer: Array<{
    full_name: string | null;
    email: string | null;
  }> | null;
}

/**
 * Get audit logs for a specific entity.
 *
 * @param entityType - Type of entity ('trip', 'load', 'partnership', 'company')
 * @param entityId - UUID of the entity
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  // First try with the profiles join
  let { data, error } = await supabase
    .from('audit_logs')
    .select(
      `
      id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      performed_by_company_id,
      source,
      visibility,
      previous_value,
      new_value,
      metadata,
      created_at,
      performer:profiles!performed_by_user_id(full_name, email)
    `
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // If join fails, try without the join
  if (error) {
    const fallbackResult = await supabase
      .from('audit_logs')
      .select(
        `
        id,
        entity_type,
        entity_id,
        action,
        performed_by_user_id,
        performed_by_company_id,
        source,
        visibility,
        previous_value,
        new_value,
        metadata,
        created_at
      `
      )
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fallbackResult.error) {
      return [];
    }

    data = fallbackResult.data?.map((row: any) => ({ ...row, performer: null })) ?? null;
    error = null;
  }

  // Transform the data to flatten the performer info
  // Supabase returns joined relations as arrays, so we take the first element
  return (data || []).map((row: RawAuditLogRow) => {
    const performer = row.performer?.[0] ?? null;
    return {
      id: row.id,
      entity_type: row.entity_type as AuditEntityType,
      entity_id: row.entity_id,
      action: row.action,
      performed_by_user_id: row.performed_by_user_id,
      performed_by_company_id: row.performed_by_company_id,
      source: row.source as AuditSource,
      visibility: row.visibility as AuditVisibility,
      previous_value: row.previous_value,
      new_value: row.new_value,
      metadata: row.metadata,
      created_at: row.created_at,
      performer_name: performer?.full_name ?? null,
      performer_email: performer?.email ?? null,
    };
  });
}

/**
 * Get recent audit logs for a user (across all their entities)
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function getRecentAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    entityTypes?: AuditEntityType[];
    companyId?: string;
  }
): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;

  let query = supabase
    .from('audit_logs')
    .select(
      `
      id,
      entity_type,
      entity_id,
      action,
      performed_by_user_id,
      performed_by_company_id,
      source,
      visibility,
      previous_value,
      new_value,
      metadata,
      created_at,
      performer:profiles!performed_by_user_id(full_name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  // Note: RLS handles access control - we don't filter by user here
  // The RLS policy should ensure users only see logs for entities they have access to

  if (options?.entityTypes && options.entityTypes.length > 0) {
    query = query.in('entity_type', options.entityTypes);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getRecentAuditLogs] Query failed:', error.code, error.message, { userId });
    return [];
  }

  // Debug: log if no results
  if (!data || data.length === 0) {
    console.log('[getRecentAuditLogs] No results for userId:', userId);
  }

  return (data || []).map((row: RawAuditLogRow) => {
    const performer = row.performer?.[0] ?? null;
    return {
      id: row.id,
      entity_type: row.entity_type as AuditEntityType,
      entity_id: row.entity_id,
      action: row.action,
      performed_by_user_id: row.performed_by_user_id,
      performed_by_company_id: row.performed_by_company_id,
      source: row.source as AuditSource,
      visibility: row.visibility as AuditVisibility,
      previous_value: row.previous_value,
      new_value: row.new_value,
      metadata: row.metadata,
      created_at: row.created_at,
      performer_name: performer?.full_name ?? null,
      performer_email: performer?.email ?? null,
    };
  });
}

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  logAuditEvent,
  type AuditEntityType,
  type AuditAction,
  type AuditSource,
  type AuditVisibility,
} from './logAuditEvent';

/**
 * Upload-specific action types (subset of AuditAction)
 */
export type UploadAction =
  | 'photo_uploaded'
  | 'photo_deleted'
  | 'damage_documented'
  | 'paperwork_uploaded'
  | 'odometer_photo_uploaded'
  | 'receipt_uploaded'
  | 'document_uploaded'
  | 'document_version_uploaded';

/**
 * Upload context determines where the upload happened
 */
export type UploadContext =
  | 'load_pickup'
  | 'load_delivery'
  | 'load_damage'
  | 'load_paperwork'
  | 'trip_odometer_start'
  | 'trip_odometer_end'
  | 'trip_expense_receipt'
  | 'compliance_document';

/**
 * Base metadata for all upload events
 */
interface BaseUploadMetadata {
  /** URL or storage path of the uploaded file */
  file_url?: string;
  /** Original filename */
  file_name?: string;
  /** MIME type */
  file_type?: string;
  /** File size in bytes */
  file_size?: number;
  /** Upload context (pickup, delivery, etc.) */
  upload_context?: UploadContext;
}

/**
 * Photo upload metadata
 */
export interface PhotoUploadMetadata extends BaseUploadMetadata {
  /** Type of photo: pickup, delivery, damage, etc. */
  photo_type?: 'pickup' | 'delivery' | 'damage' | 'odometer' | 'receipt' | 'general';
  /** Number of photos uploaded (for batch uploads) */
  photo_count?: number;
  /** Related load number for context */
  load_number?: string;
  /** Related trip number for context */
  trip_number?: string;
}

/**
 * Damage documentation metadata
 */
export interface DamageMetadata extends BaseUploadMetadata {
  /** Severity level */
  severity?: 'minor' | 'moderate' | 'severe';
  /** Number of damages documented */
  damage_count?: number;
  /** Description of the damage */
  description?: string;
  /** Location on the item */
  location?: string;
  /** Related load number */
  load_number?: string;
}

/**
 * Odometer photo metadata
 */
export interface OdometerMetadata extends BaseUploadMetadata {
  /** Phase: start or end of trip */
  phase?: 'start' | 'end';
  /** Odometer reading value */
  reading?: number;
  /** Trip number for context */
  trip_number?: string;
}

/**
 * Receipt upload metadata
 */
export interface ReceiptMetadata extends BaseUploadMetadata {
  /** Expense category */
  category?: string;
  /** Expense amount */
  amount?: number;
  /** Trip number for context */
  trip_number?: string;
  /** Expense ID */
  expense_id?: string;
}

/**
 * Document upload metadata
 */
export interface DocumentMetadata extends BaseUploadMetadata {
  /** Type of document */
  document_type?: string;
  /** Document status */
  status?: string;
  /** Version number for versioned documents */
  version_number?: number;
  /** Company name for compliance docs */
  company_name?: string;
  /** Expiration date if applicable */
  expires_at?: string;
}

/**
 * Paperwork upload metadata
 */
export interface PaperworkMetadata extends BaseUploadMetadata {
  /** Type of paperwork: BOL, POD, etc. */
  document_type?: 'bol' | 'pod' | 'weight_ticket' | 'invoice' | 'other';
  /** Load number */
  load_number?: string;
}

/**
 * Union of all upload metadata types
 */
export type UploadMetadata =
  | PhotoUploadMetadata
  | DamageMetadata
  | OdometerMetadata
  | ReceiptMetadata
  | DocumentMetadata
  | PaperworkMetadata;

/**
 * Input for logging a structured upload event
 */
export interface LogStructuredUploadInput {
  /** Entity type (load, trip, company) */
  entityType: AuditEntityType;
  /** Entity ID */
  entityId: string;
  /** Upload action */
  action: UploadAction;
  /** User who performed the upload */
  performedByUserId: string;
  /** Company of the user (if applicable) */
  performedByCompanyId?: string | null;
  /** Source of the upload (web, mobile, system) */
  source?: AuditSource;
  /** Visibility of this event */
  visibility?: AuditVisibility;
  /** Upload-specific metadata */
  metadata?: UploadMetadata;
}

/**
 * Log a structured upload event to the audit log.
 *
 * This is a specialized wrapper around logAuditEvent that provides
 * strong typing for upload-related events and their metadata.
 *
 * @param client - Supabase client (server-side)
 * @param input - Upload event details
 */
export async function logStructuredUploadEvent(
  client: SupabaseClient,
  input: LogStructuredUploadInput
): Promise<void> {
  await logAuditEvent(client, {
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action as AuditAction,
    performedByUserId: input.performedByUserId,
    performedByCompanyId: input.performedByCompanyId,
    source: input.source ?? 'web',
    visibility: input.visibility ?? 'partner',
    metadata: input.metadata as Record<string, unknown>,
  });
}

/**
 * Helper to create photo upload metadata
 */
export function createPhotoUploadMetadata(data: {
  photoType: PhotoUploadMetadata['photo_type'];
  fileUrl?: string;
  fileName?: string;
  photoCount?: number;
  loadNumber?: string;
  tripNumber?: string;
  uploadContext?: UploadContext;
}): PhotoUploadMetadata {
  return {
    photo_type: data.photoType,
    file_url: data.fileUrl,
    file_name: data.fileName,
    photo_count: data.photoCount,
    load_number: data.loadNumber,
    trip_number: data.tripNumber,
    upload_context: data.uploadContext,
  };
}

/**
 * Helper to create damage documentation metadata
 */
export function createDamageMetadata(data: {
  severity?: DamageMetadata['severity'];
  damageCount?: number;
  description?: string;
  location?: string;
  fileUrl?: string;
  loadNumber?: string;
}): DamageMetadata {
  return {
    severity: data.severity,
    damage_count: data.damageCount,
    description: data.description,
    location: data.location,
    file_url: data.fileUrl,
    load_number: data.loadNumber,
    upload_context: 'load_damage',
  };
}

/**
 * Helper to create odometer photo metadata
 */
export function createOdometerMetadata(data: {
  phase: 'start' | 'end';
  reading?: number;
  fileUrl?: string;
  tripNumber?: string;
}): OdometerMetadata {
  return {
    phase: data.phase,
    reading: data.reading,
    file_url: data.fileUrl,
    trip_number: data.tripNumber,
    upload_context: data.phase === 'start' ? 'trip_odometer_start' : 'trip_odometer_end',
  };
}

/**
 * Helper to create receipt upload metadata
 */
export function createReceiptMetadata(data: {
  category?: string;
  amount?: number;
  fileUrl?: string;
  tripNumber?: string;
  expenseId?: string;
}): ReceiptMetadata {
  return {
    category: data.category,
    amount: data.amount,
    file_url: data.fileUrl,
    trip_number: data.tripNumber,
    expense_id: data.expenseId,
    upload_context: 'trip_expense_receipt',
  };
}

/**
 * Helper to create document upload metadata
 */
export function createDocumentMetadata(data: {
  documentType?: string;
  status?: string;
  versionNumber?: number;
  companyName?: string;
  expiresAt?: string;
  fileUrl?: string;
}): DocumentMetadata {
  return {
    document_type: data.documentType,
    status: data.status,
    version_number: data.versionNumber,
    company_name: data.companyName,
    expires_at: data.expiresAt,
    file_url: data.fileUrl,
    upload_context: 'compliance_document',
  };
}

/**
 * Helper to create paperwork upload metadata
 */
export function createPaperworkMetadata(data: {
  documentType?: PaperworkMetadata['document_type'];
  loadNumber?: string;
  fileUrl?: string;
}): PaperworkMetadata {
  return {
    document_type: data.documentType,
    load_number: data.loadNumber,
    file_url: data.fileUrl,
    upload_context: 'load_paperwork',
  };
}

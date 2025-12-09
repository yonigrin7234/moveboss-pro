import type { SupabaseClient } from '@supabase/supabase-js';
import type { UploadAction, UploadMetadata } from '@/lib/audit';

/**
 * Entity types that can receive upload notification messages
 */
export type UploadMessageEntityType = 'load' | 'trip' | 'company';

/**
 * Conversation target for upload messages
 */
export type UploadMessageTarget = 'internal' | 'shared' | 'both';

/**
 * Input for recording a structured upload message
 */
export interface RecordUploadMessageInput {
  /** Entity type (load, trip, company) */
  entityType: UploadMessageEntityType;
  /** Entity ID */
  entityId: string;
  /** Company ID that owns this entity */
  companyId: string;
  /** Upload action type */
  action: UploadAction;
  /** User who performed the upload (for user-initiated uploads) */
  performerUserId?: string;
  /** Driver who performed the upload (for driver-initiated uploads) */
  performerDriverId?: string;
  /** Performer name for display */
  performerName?: string;
  /** Which conversations to send to */
  target?: UploadMessageTarget;
  /** Partner company ID (for shared conversations) */
  partnerCompanyId?: string;
  /** Upload metadata for message content */
  metadata?: UploadMetadata;
}

/**
 * Result of recording an upload message
 */
export interface RecordUploadMessageResult {
  success: boolean;
  internalMessageId?: string;
  sharedMessageId?: string;
  error?: string;
}

/**
 * Generate a human-readable message body for an upload event
 */
function generateMessageBody(
  action: UploadAction,
  performerName: string | undefined,
  metadata?: UploadMetadata
): string {
  const actor = performerName || 'Someone';

  switch (action) {
    case 'photo_uploaded': {
      const photoType = (metadata as any)?.photo_type || 'photo';
      const count = (metadata as any)?.photo_count;
      if (count && count > 1) {
        return `${actor} uploaded ${count} ${photoType} photos`;
      }
      return `${actor} uploaded a ${photoType} photo`;
    }

    case 'photo_deleted': {
      const photoType = (metadata as any)?.photo_type || 'photo';
      return `${actor} deleted a ${photoType} photo`;
    }

    case 'damage_documented': {
      const count = (metadata as any)?.damage_count;
      const severity = (metadata as any)?.severity;
      if (count && count > 1) {
        return `${actor} documented ${count} damages`;
      }
      const severityText = severity ? ` (${severity})` : '';
      return `${actor} documented damage${severityText}`;
    }

    case 'paperwork_uploaded': {
      const docType = (metadata as any)?.document_type;
      const docTypeLabel = docType ? formatDocumentType(docType) : 'paperwork';
      return `${actor} uploaded ${docTypeLabel}`;
    }

    case 'odometer_photo_uploaded': {
      const phase = (metadata as any)?.phase;
      const reading = (metadata as any)?.reading;
      if (phase && reading) {
        return `${actor} uploaded ${phase} odometer photo (${Number(reading).toLocaleString()} mi)`;
      }
      return phase
        ? `${actor} uploaded ${phase} odometer photo`
        : `${actor} uploaded odometer photo`;
    }

    case 'receipt_uploaded': {
      const category = (metadata as any)?.category;
      const amount = (metadata as any)?.amount;
      if (category && amount) {
        return `${actor} uploaded receipt for ${category} ($${Number(amount).toLocaleString()})`;
      }
      return category
        ? `${actor} uploaded ${category} receipt`
        : `${actor} uploaded a receipt`;
    }

    case 'document_uploaded': {
      const docType = (metadata as any)?.document_type || 'document';
      return `${actor} uploaded ${docType}`;
    }

    case 'document_version_uploaded': {
      const docType = (metadata as any)?.document_type || 'document';
      const version = (metadata as any)?.version_number;
      return version
        ? `${actor} uploaded ${docType} v${version}`
        : `${actor} uploaded a new version of ${docType}`;
    }

    default:
      return `${actor} uploaded a file`;
  }
}

/**
 * Format document type for display
 */
function formatDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    bol: 'Bill of Lading',
    pod: 'Proof of Delivery',
    weight_ticket: 'Weight Ticket',
    invoice: 'Invoice',
    other: 'document',
  };
  return typeMap[type] || type;
}

/**
 * Record a structured upload event as a system message in the appropriate conversation(s).
 *
 * This function:
 * 1. Finds or creates the appropriate conversation(s) for the entity
 * 2. Inserts a system message describing the upload
 * 3. Does NOT throw errors - logs and returns failure status
 *
 * @param client - Supabase client (server-side)
 * @param input - Upload message details
 */
export async function recordStructuredUploadMessage(
  client: SupabaseClient,
  input: RecordUploadMessageInput
): Promise<RecordUploadMessageResult> {
  const result: RecordUploadMessageResult = { success: false };

  try {
    const messageBody = generateMessageBody(
      input.action,
      input.performerName,
      input.metadata
    );

    const messageMetadata = {
      upload_action: input.action,
      ...input.metadata,
      performer_user_id: input.performerUserId,
      performer_driver_id: input.performerDriverId,
      performer_name: input.performerName,
    };

    const target = input.target ?? 'internal';

    // Handle load-related uploads
    if (input.entityType === 'load') {
      // Send to internal conversation
      if (target === 'internal' || target === 'both') {
        const internalResult = await sendToLoadConversation(
          client,
          input.entityId,
          input.companyId,
          'load_internal',
          messageBody,
          messageMetadata,
          input.performerUserId,
          input.performerDriverId
        );
        if (internalResult.success) {
          result.internalMessageId = internalResult.messageId;
        }
      }

      // Send to shared conversation if requested and partner exists
      if ((target === 'shared' || target === 'both') && input.partnerCompanyId) {
        const sharedResult = await sendToLoadConversation(
          client,
          input.entityId,
          input.companyId,
          'load_shared',
          messageBody,
          messageMetadata,
          input.performerUserId,
          input.performerDriverId,
          input.partnerCompanyId
        );
        if (sharedResult.success) {
          result.sharedMessageId = sharedResult.messageId;
        }
      }
    }

    // Handle trip-related uploads
    if (input.entityType === 'trip') {
      const tripResult = await sendToTripConversation(
        client,
        input.entityId,
        input.companyId,
        messageBody,
        messageMetadata,
        input.performerUserId,
        input.performerDriverId
      );
      if (tripResult.success) {
        result.internalMessageId = tripResult.messageId;
      }
    }

    // Mark success if at least one message was sent
    result.success = !!(result.internalMessageId || result.sharedMessageId);
    return result;
  } catch (err) {
    console.error('[UploadMessage] Exception while recording upload message:', err);
    result.error = err instanceof Error ? err.message : 'Unknown error';
    return result;
  }
}

/**
 * Send a system message to a load conversation
 */
async function sendToLoadConversation(
  client: SupabaseClient,
  loadId: string,
  companyId: string,
  conversationType: 'load_internal' | 'load_shared',
  body: string,
  metadata: Record<string, unknown>,
  senderUserId?: string,
  senderDriverId?: string,
  partnerCompanyId?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // Find existing conversation
    let query = client
      .from('conversations')
      .select('id')
      .eq('load_id', loadId)
      .eq('type', conversationType);

    if (conversationType === 'load_internal') {
      query = query.eq('owner_company_id', companyId);
    }

    const { data: existingConv } = await query.maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation
      const insertData: Record<string, unknown> = {
        type: conversationType,
        owner_company_id: companyId,
        load_id: loadId,
      };

      if (conversationType === 'load_shared' && partnerCompanyId) {
        insertData.partner_company_id = partnerCompanyId;
      }

      const { data: newConv, error: createError } = await client
        .from('conversations')
        .insert(insertData)
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('[UploadMessage] Failed to create conversation:', createError?.message);
        return { success: false };
      }

      conversationId = newConv.id;
    }

    // Insert system message
    const { data: message, error: msgError } = await client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: senderUserId || null,
        sender_driver_id: senderDriverId || null,
        sender_company_id: companyId,
        body,
        message_type: 'system',
        metadata,
      })
      .select('id')
      .single();

    if (msgError) {
      console.error('[UploadMessage] Failed to insert message:', msgError.message);
      return { success: false };
    }

    return { success: true, messageId: message.id };
  } catch (err) {
    console.error('[UploadMessage] Error in sendToLoadConversation:', err);
    return { success: false };
  }
}

/**
 * Send a system message to a trip conversation
 */
async function sendToTripConversation(
  client: SupabaseClient,
  tripId: string,
  companyId: string,
  body: string,
  metadata: Record<string, unknown>,
  senderUserId?: string,
  senderDriverId?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // Find existing conversation
    const { data: existingConv } = await client
      .from('conversations')
      .select('id')
      .eq('trip_id', tripId)
      .eq('type', 'trip_internal')
      .eq('owner_company_id', companyId)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation
      const { data: newConv, error: createError } = await client
        .from('conversations')
        .insert({
          type: 'trip_internal',
          owner_company_id: companyId,
          trip_id: tripId,
        })
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('[UploadMessage] Failed to create trip conversation:', createError?.message);
        return { success: false };
      }

      conversationId = newConv.id;
    }

    // Insert system message
    const { data: message, error: msgError } = await client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: senderUserId || null,
        sender_driver_id: senderDriverId || null,
        sender_company_id: companyId,
        body,
        message_type: 'system',
        metadata,
      })
      .select('id')
      .single();

    if (msgError) {
      console.error('[UploadMessage] Failed to insert trip message:', msgError.message);
      return { success: false };
    }

    return { success: true, messageId: message.id };
  } catch (err) {
    console.error('[UploadMessage] Error in sendToTripConversation:', err);
    return { success: false };
  }
}

/**
 * Helper to determine if an upload should be sent to shared conversation
 * based on visibility settings and upload type
 */
export function shouldSendToShared(
  action: UploadAction,
  driverVisibility: 'none' | 'read_only' | 'full' = 'none'
): boolean {
  // Only send to shared if driver has at least read-only access
  // and the upload type is something partners should see
  if (driverVisibility === 'none') {
    return false;
  }

  // These upload types are typically internal-only
  const internalOnlyActions: UploadAction[] = ['receipt_uploaded', 'document_uploaded', 'document_version_uploaded'];

  // These upload types should be shared with partners
  const sharedActions: UploadAction[] = [
    'photo_uploaded',
    'damage_documented',
    'paperwork_uploaded',
  ];

  return sharedActions.includes(action);
}

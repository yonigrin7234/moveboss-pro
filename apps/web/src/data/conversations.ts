import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import type {
  Conversation,
  ConversationParticipant,
  ConversationWithDetails,
  ConversationListItem,
  ConversationType,
  DriverVisibilityLevel,
  ConversationParticipantRole,
  LoadCommunicationSettings,
  PartnerCommunicationSettings,
  MessageWithSender,
  Message,
  MessageType,
  MessageAttachment,
  MessageMetadata,
  LoadCommunicationPermissions,
} from '@/lib/communication-types';

// ============================================================================
// SCHEMAS
// ============================================================================

export const conversationTypeSchema = z.enum([
  'load_shared',
  'load_internal',
  'trip_internal',
  'company_to_company',
  'driver_dispatch',
  'general',
]);

export const driverVisibilitySchema = z.enum(['none', 'read_only', 'full']);

export const participantRoleSchema = z.enum([
  'owner',
  'dispatcher',
  'driver',
  'helper',
  'partner_rep',
  'broker',
  'ai_agent',
]);

export const messageTypeSchema = z.enum([
  'text',
  'system',
  'ai_response',
  'document',
  'image',
  'voice',
  'location',
  'balance_request',
  'status_update',
]);

export const createConversationSchema = z.object({
  type: conversationTypeSchema,
  load_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  partner_company_id: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(10000),
  message_type: messageTypeSchema.optional().default('text'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'voice']),
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    mime_type: z.string().optional(),
  })).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  reply_to_message_id: z.string().uuid().optional(),
});

export const updateDriverVisibilitySchema = z.object({
  load_id: z.string().uuid(),
  driver_visibility: driverVisibilitySchema,
  driver_id: z.string().uuid().optional(),
});

export const addParticipantSchema = z.object({
  conversation_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  role: participantRoleSchema,
  can_read: z.boolean().optional().default(true),
  can_write: z.boolean().optional().default(true),
});

// ============================================================================
// CONVERSATION QUERIES
// ============================================================================

/**
 * Get all conversations for a user (filtered by company membership via RLS)
 */
export async function getUserConversations(
  userId: string,
  companyId: string,
  options?: {
    type?: ConversationType;
    load_id?: string;
    trip_id?: string;
    include_archived?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<ConversationListItem[]> {
  const supabase = await createClient();

  // Query conversations by company membership (RLS handles access control)
  // Use left join for participant data since user may not have a participant record yet
  let query = supabase
    .from('conversations')
    .select(`
      id,
      type,
      owner_company_id,
      load_id,
      trip_id,
      carrier_company_id,
      partner_company_id,
      title,
      is_archived,
      is_muted,
      last_message_at,
      last_message_preview,
      last_message_sender_name,
      message_count,
      created_at,
      loads:load_id (
        id,
        load_number,
        status,
        pickup_city,
        delivery_city
      ),
      trips:trip_id (
        id,
        trip_number,
        status
      ),
      carrier_company:carrier_company_id (
        id,
        name
      ),
      partner_company:partner_company_id (
        id,
        name
      )
    `)
    .or(`owner_company_id.eq.${companyId},partner_company_id.eq.${companyId},carrier_company_id.eq.${companyId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.load_id) {
    query = query.eq('load_id', options.load_id);
  }

  if (options?.trip_id) {
    query = query.eq('trip_id', options.trip_id);
  }

  if (!options?.include_archived) {
    query = query.eq('is_archived', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch participant data separately for unread counts
  const conversationIds = data.map((c) => c.id);
  const { data: participantData } = await supabase
    .from('conversation_participants')
    .select('conversation_id, unread_count, is_muted')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds);

  // Create a map for quick lookup
  const participantMap = new Map(
    (participantData ?? []).map((p) => [p.conversation_id, p])
  );

  // Transform to ConversationListItem format
  return data.map((conv) => {
    const participant = participantMap.get(conv.id);

    // Compute display title
    let title = conv.title ?? '';
    let subtitle = '';

    const load = Array.isArray(conv.loads) ? conv.loads[0] : conv.loads;
    const trip = Array.isArray(conv.trips) ? conv.trips[0] : conv.trips;
    const partnerCompany = Array.isArray(conv.partner_company) ? conv.partner_company[0] : conv.partner_company;

    switch (conv.type as ConversationType) {
      case 'load_shared':
        title = title || `Shared Chat - ${load?.load_number ?? 'Load'}`;
        subtitle = partnerCompany?.name ?? '';
        break;
      case 'load_internal':
        title = title || `Internal - ${load?.load_number ?? 'Load'}`;
        subtitle = load ? `${load.pickup_city ?? ''} → ${load.delivery_city ?? ''}` : '';
        break;
      case 'trip_internal':
        title = title || `Trip ${trip?.trip_number ?? ''}`;
        subtitle = trip?.status ?? '';
        break;
      case 'company_to_company':
        title = title || (partnerCompany?.name ?? 'Partner Chat');
        subtitle = 'Company thread';
        break;
      case 'driver_dispatch':
        title = title || 'Driver Chat';
        subtitle = 'Direct message';
        break;
      case 'general':
        title = title || 'General Chat';
        subtitle = '';
        break;
    }

    // Format preview with sender name
    const senderName = (conv as { last_message_sender_name?: string }).last_message_sender_name;
    const messagePreview = conv.last_message_preview
      ? (senderName ? `${senderName}: ${conv.last_message_preview}` : conv.last_message_preview)
      : undefined;

    return {
      id: conv.id,
      type: conv.type as ConversationType,
      title,
      subtitle,
      last_message_preview: messagePreview,
      last_message_at: conv.last_message_at,
      unread_count: participant?.unread_count ?? 0,
      is_muted: conv.is_muted || participant?.is_muted || false,
      participants_preview: [],
      context: {
        load_id: load?.id,
        load_number: load?.load_number,
        trip_id: trip?.id,
        trip_number: trip?.trip_number,
        partner_name: partnerCompany?.name,
      },
    };
  });
}

/**
 * Get a single conversation with full details
 */
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationWithDetails | null> {
  const supabase = await createClient();

  // Simplified query - don't fetch nested participants to avoid RLS complexity
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      loads:load_id (
        id,
        load_number,
        status,
        pickup_city,
        delivery_city
      ),
      trips:trip_id (
        id,
        trip_number,
        status
      ),
      carrier_company:carrier_company_id (
        id,
        name
      ),
      partner_company:partner_company_id (
        id,
        name
      )
    `)
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  // Note: RLS policies enforce access control.
  // If the query returns data, the user has access via company membership.

  // Transform relations
  const load = Array.isArray(data.loads) ? data.loads[0] : data.loads;
  const trip = Array.isArray(data.trips) ? data.trips[0] : data.trips;
  const carrierCompany = Array.isArray(data.carrier_company) ? data.carrier_company[0] : data.carrier_company;
  const partnerCompany = Array.isArray(data.partner_company) ? data.partner_company[0] : data.partner_company;

  return {
    ...data,
    participants: [], // Participants not fetched to avoid RLS complexity
    load: load ?? undefined,
    trip: trip ?? undefined,
    carrier_company: carrierCompany ?? undefined,
    partner_company: partnerCompany ?? undefined,
  };
}

/**
 * Get or create a conversation for a load (internal or shared)
 *
 * IMPORTANT: Load conversations are keyed by load_id and type, NOT by the viewing company.
 * This ensures the same conversation is shared between all parties who have access to the load.
 * - owner_company_id: Always the load's actual owner company (the broker/company that owns the load)
 * - carrier_company_id: The carrier assigned to the load (if any)
 * - partner_company_id: For shared conversations between broker and carrier
 *
 * RLS policies grant access based on owner_company_id, partner_company_id, and carrier_company_id.
 */
export async function getOrCreateLoadConversation(
  loadId: string,
  type: 'load_internal' | 'load_shared',
  callerCompanyId: string,
  partnerCompanyId?: string,
  createdByUserId?: string
): Promise<Conversation> {
  const supabase = await createClient();

  // First, get the load to determine the actual owner and carrier
  const { data: load, error: loadError } = await supabase
    .from('loads')
    .select('company_id, owner_id, assigned_carrier_id, posted_by_company_id')
    .eq('id', loadId)
    .single();

  if (loadError || !load) {
    throw new Error(`Failed to get load: ${loadError?.message || 'Load not found'}`);
  }

  // Determine the load's actual owner company (the broker/company that created the load)
  const loadOwnerCompanyId = load.posted_by_company_id || load.company_id;
  const assignedCarrierId = load.assigned_carrier_id;

  // For load_internal conversations: look up by load_id, type, and the load's actual owner
  // For load_shared conversations: look up by load_id and type (shared between broker & carrier)
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('load_id', loadId)
    .eq('type', type);

  if (type === 'load_internal') {
    // Internal conversations are scoped to each company
    // The caller's company owns their internal conversation
    query = query.eq('owner_company_id', callerCompanyId);
  }
  // For load_shared, we just look by load_id + type (there's only one shared conversation per load)

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return existing as Conversation;
  }

  // Create new conversation
  let insertData: Record<string, unknown>;

  if (type === 'load_internal') {
    // Internal conversation belongs to the caller's company
    insertData = {
      type,
      owner_company_id: callerCompanyId,
      load_id: loadId,
      carrier_company_id: null,
      partner_company_id: null,
      created_by_user_id: createdByUserId,
    };
  } else {
    // Shared conversation between broker and carrier
    // owner_company_id = the load's owner (broker)
    // carrier_company_id = the assigned carrier
    // partner_company_id = whichever is the "other" company (for backwards compatibility)
    insertData = {
      type,
      owner_company_id: loadOwnerCompanyId,
      load_id: loadId,
      carrier_company_id: assignedCarrierId,
      partner_company_id: partnerCompanyId || assignedCarrierId,
      created_by_user_id: createdByUserId,
    };
  }

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return newConv as Conversation;
}

/**
 * Get or create a conversation for a trip
 */
export async function getOrCreateTripConversation(
  tripId: string,
  ownerCompanyId: string,
  createdByUserId?: string
): Promise<Conversation> {
  const supabase = await createClient();

  // Get the trip to find the assigned driver
  const { data: trip } = await supabase
    .from('trips')
    .select('assigned_driver_id')
    .eq('id', tripId)
    .single();

  // Check for existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('trip_id', tripId)
    .eq('type', 'trip_internal')
    .eq('owner_company_id', ownerCompanyId)
    .maybeSingle();

  if (existing) {
    // Ensure the assigned driver is a participant (in case driver was assigned later)
    if (trip?.assigned_driver_id) {
      await supabase.from('conversation_participants').upsert(
        {
          conversation_id: existing.id,
          driver_id: trip.assigned_driver_id,
          company_id: ownerCompanyId,
          role: 'driver',
          can_read: true,
          can_write: true,
          is_driver: true,
          added_by_user_id: createdByUserId,
        },
        { onConflict: 'conversation_id,driver_id' }
      );
    }
    return existing as Conversation;
  }

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      type: 'trip_internal',
      owner_company_id: ownerCompanyId,
      trip_id: tripId,
      created_by_user_id: createdByUserId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  // Add the assigned driver as a participant with full read/write access
  if (trip?.assigned_driver_id) {
    await supabase.from('conversation_participants').insert({
      conversation_id: newConv.id,
      driver_id: trip.assigned_driver_id,
      company_id: ownerCompanyId,
      role: 'driver',
      can_read: true,
      can_write: true,
      is_driver: true,
      added_by_user_id: createdByUserId,
    });
  }

  return newConv as Conversation;
}

/**
 * Get or create a company-to-company conversation
 *
 * IMPORTANT: Company-to-company conversations should be symmetric.
 * If A chats with B, and B replies, they should use the SAME conversation.
 * We check for existing conversations in BOTH directions to ensure this.
 */
export async function getOrCreateCompanyConversation(
  callerCompanyId: string,
  otherCompanyId: string,
  createdByUserId?: string
): Promise<Conversation> {
  const supabase = await createClient();

  // Check for existing conversation in EITHER direction
  // (A→B or B→A should find the same conversation)
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('type', 'company_to_company')
    .or(
      `and(carrier_company_id.eq.${callerCompanyId},partner_company_id.eq.${otherCompanyId}),` +
      `and(carrier_company_id.eq.${otherCompanyId},partner_company_id.eq.${callerCompanyId})`
    )
    .maybeSingle();

  if (existing) {
    return existing as Conversation;
  }

  // Create new conversation
  // Use consistent ordering: the initiating company becomes the "carrier"
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      type: 'company_to_company',
      owner_company_id: callerCompanyId,
      carrier_company_id: callerCompanyId,
      partner_company_id: otherCompanyId,
      created_by_user_id: createdByUserId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return newConv as Conversation;
}

/**
 * Get or create a driver-dispatch conversation
 *
 * This creates a direct messaging channel between a driver and their company's dispatch team.
 * - owner_company_id: The driver's company
 * - driver_id: The specific driver this conversation is for
 */
export async function getOrCreateDriverDispatchConversation(
  driverId: string,
  companyId: string,
  createdByUserId?: string
): Promise<Conversation> {
  const supabase = await createClient();

  // Check for existing conversation(s)
  // Handle multiple conversations by getting the most recent one
  // IMPORTANT: Use the same ordering logic as mobile app (last_message_at DESC, created_at DESC)
  const { data: existingConvs, error: queryError } = await supabase
    .from('conversations')
    .select('*')
    .eq('type', 'driver_dispatch')
    .eq('driver_id', driverId)
    .eq('owner_company_id', companyId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  // #region agent log
  const existing = existingConvs?.[0] ?? null;
  const logData = {driverId,companyId,existingId:existing?.id,existingType:existing?.type,willCreate:!existing,foundCount:existingConvs?.length||0,queryError:queryError?.message};
  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:getOrCreateDriverDispatchConversation:CHECK_EXISTING',message:'Checking for existing driver_dispatch conversation',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (existing) {
    return existing as Conversation;
  }

  // Get driver details for title
  const { data: driver } = await supabase
    .from('drivers')
    .select('first_name, last_name')
    .eq('id', driverId)
    .single();

  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      type: 'driver_dispatch',
      owner_company_id: companyId,
      driver_id: driverId,
      title: `${driverName} - Dispatch`,
      created_by_user_id: createdByUserId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create driver dispatch conversation: ${error.message}`);
  }

  // Add the driver as a participant with full read/write access
  await supabase.from('conversation_participants').insert({
    conversation_id: newConv.id,
    driver_id: driverId,
    company_id: companyId,
    role: 'driver',
    can_read: true,
    can_write: true,
    is_driver: true,
    added_by_user_id: createdByUserId,
  });

  return newConv as Conversation;
}

/**
 * Get all driver dispatch conversations for a company
 * Used by dispatchers to see all driver conversations
 */
export async function getCompanyDriverDispatchConversations(
  companyId: string,
  userId?: string
): Promise<ConversationListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      type,
      owner_company_id,
      driver_id,
      title,
      is_archived,
      is_muted,
      last_message_at,
      last_message_preview,
      last_message_sender_name,
      message_count,
      drivers:driver_id (
        id,
        first_name,
        last_name
      )
    `)
    .eq('type', 'driver_dispatch')
    .eq('owner_company_id', companyId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[getCompanyDriverDispatchConversations] Error:', error.code, error.message);
    return [];
  }

  // Fetch unread counts for the user if userId provided
  let unreadMap = new Map<string, number>();
  if (userId && data && data.length > 0) {
    const conversationIds = data.map((c) => c.id);
    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count')
      .eq('user_id', userId)
      .in('conversation_id', conversationIds);

    if (participantData) {
      unreadMap = new Map(participantData.map((p) => [p.conversation_id, p.unread_count]));
    }
  }

  // Group by driver_id and keep only the most recent conversation per driver
  const driverMap = new Map<string, typeof data[0]>();
  (data ?? []).forEach((conv) => {
    const driverId = conv.driver_id;
    if (driverId) {
      const existing = driverMap.get(driverId);
      if (!existing || 
          (conv.last_message_at && 
           (!existing.last_message_at || 
            new Date(conv.last_message_at) > new Date(existing.last_message_at)))) {
        driverMap.set(driverId, conv);
      }
    }
  });

  return Array.from(driverMap.values()).map((conv) => {
    const driver = Array.isArray(conv.drivers) ? conv.drivers[0] : conv.drivers;
    const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

    // Format preview with sender name
    const senderName = (conv as { last_message_sender_name?: string }).last_message_sender_name;
    const messagePreview = conv.last_message_preview
      ? (senderName ? `${senderName}: ${conv.last_message_preview}` : conv.last_message_preview)
      : undefined;

    return {
      id: conv.id,
      type: 'driver_dispatch' as ConversationType,
      title: conv.title || `${driverName} - Dispatch`,
      subtitle: 'Direct message',
      last_message_preview: messagePreview,
      last_message_at: conv.last_message_at,
      unread_count: unreadMap.get(conv.id) ?? 0,
      is_muted: conv.is_muted || false,
      participants_preview: [],
      context: {
        driver_name: driverName,
        driver_id: driver?.id,
      },
    };
  });
}

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  options?: {
    limit?: number;
    before?: string; // Message ID for cursor-based pagination
    after?: string;
  }
): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;

  // Note: We rely on RLS policies to enforce access control.
  // The messages_select_company policy ensures users can only read
  // messages in conversations belonging to their company.

  // First, fetch messages without joins (to avoid schema relationship issues)
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there's more

  if (options?.before) {
    // Get the timestamp of the cursor message
    const { data: cursorMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', options.before)
      .single();

    if (cursorMsg) {
      query = query.lt('created_at', cursorMsg.created_at);
    }
  }

  if (options?.after) {
    const { data: cursorMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', options.after)
      .single();

    if (cursorMsg) {
      query = query.gt('created_at', cursorMsg.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  const hasMore = (data?.length ?? 0) > limit;
  const messagesRaw = (data ?? []).slice(0, limit);

  // Fetch sender profiles and drivers separately to avoid FK relationship issues
  const userIds = [...new Set(messagesRaw.map(m => m.sender_user_id).filter(Boolean))];
  const driverIds = [...new Set(messagesRaw.map(m => m.sender_driver_id).filter(Boolean))];

  // Fetch profiles
  let profilesMap = new Map<string, { id: string; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    if (profiles) {
      profilesMap = new Map(profiles.map(p => [p.id, p]));
    }
  }

  // Fetch drivers
  let driversMap = new Map<string, { id: string; first_name: string; last_name: string }>();
  if (driverIds.length > 0) {
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, first_name, last_name')
      .in('id', driverIds);
    if (drivers) {
      driversMap = new Map(drivers.map(d => [d.id, d]));
    }
  }

  // Fetch companies for sender_company_id
  const companyIds = [...new Set(messagesRaw.map(m => m.sender_company_id).filter(Boolean))];
  let companiesMap = new Map<string, { id: string; name: string }>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);
    if (companies) {
      companiesMap = new Map(companies.map(c => [c.id, c]));
    }
  }

  // Transform messages with sender info
  const messages = messagesRaw.map((msg) => {
    const senderProfile = msg.sender_user_id ? profilesMap.get(msg.sender_user_id) : undefined;
    const senderDriver = msg.sender_driver_id ? driversMap.get(msg.sender_driver_id) : undefined;
    const senderCompany = msg.sender_company_id ? companiesMap.get(msg.sender_company_id) : undefined;

    return {
      ...msg,
      sender_profile: senderProfile ?? undefined,
      sender_driver: senderDriver ?? undefined,
      sender_company: senderCompany ?? undefined,
      reply_to: undefined, // Skip reply_to for now to simplify
    };
  });

  return { messages: messages.reverse(), hasMore }; // Reverse to get oldest first
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  options?: {
    message_type?: MessageType;
    attachments?: MessageAttachment[];
    metadata?: MessageMetadata;
    reply_to_message_id?: string;
    sender_company_id?: string;
  }
): Promise<Message> {
  const supabase = await createClient();

  // Check if user has a participant record
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('can_write, company_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', senderId)
    .maybeSingle();

  // If participant record exists, check can_write permission
  if (participant && !participant.can_write) {
    throw new Error('You do not have permission to send messages in this conversation');
  }

  // Get company_id either from participant or from user's primary membership
  let companyId = options?.sender_company_id ?? participant?.company_id;
  if (!companyId) {
    const { data: membership } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', senderId)
      .eq('is_primary', true)
      .single();
    companyId = membership?.company_id;
  }

  // Note: The RLS policy on messages INSERT enforces that the user must have
  // access to the conversation via their company membership

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:sendMessage:INSERTING',message:'Inserting message into database',data:{conversationId,senderId,companyId,bodyLength:body.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: senderId,
      sender_company_id: companyId,
      body,
      message_type: options?.message_type ?? 'text',
      attachments: options?.attachments ?? [],
      metadata: options?.metadata ?? {},
      reply_to_message_id: options?.reply_to_message_id,
    })
    .select()
    .single();

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.ts:sendMessage:INSERT_RESULT',message:'Message insert result',data:{conversationId,messageId:message?.id,error:error?.message,success:!error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return message as Message;
}

/**
 * Send a message as a driver
 */
export async function sendDriverMessage(
  conversationId: string,
  driverId: string,
  body: string,
  options?: {
    message_type?: MessageType;
    attachments?: MessageAttachment[];
    metadata?: MessageMetadata;
    reply_to_message_id?: string;
  }
): Promise<Message> {
  const supabase = await createClient();

  // Verify driver has write access
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('can_write, company_id')
    .eq('conversation_id', conversationId)
    .eq('driver_id', driverId)
    .single();

  if (!participant?.can_write) {
    throw new Error('You do not have permission to send messages in this conversation');
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_driver_id: driverId,
      sender_company_id: participant.company_id,
      body,
      message_type: options?.message_type ?? 'text',
      attachments: options?.attachments ?? [],
      metadata: options?.metadata ?? {},
      reply_to_message_id: options?.reply_to_message_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return message as Message;
}

// ============================================================================
// PARTICIPANT MANAGEMENT
// ============================================================================

/**
 * Add a participant to a conversation
 */
export async function addParticipant(
  conversationId: string,
  addedByUserId: string,
  participantData: {
    user_id?: string;
    driver_id?: string;
    company_id?: string;
    role: ConversationParticipantRole;
    can_read?: boolean;
    can_write?: boolean;
  }
): Promise<ConversationParticipant> {
  const supabase = await createClient();

  // Verify the adder has permission to add participants
  const { data: adderConv } = await supabase
    .from('conversations')
    .select('owner_company_id')
    .eq('id', conversationId)
    .single();

  const { data: adderMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('user_id', addedByUserId)
    .eq('company_id', adderConv?.owner_company_id)
    .single();

  if (!adderMembership || !['owner', 'dispatcher', 'admin'].includes(adderMembership.role)) {
    throw new Error('You do not have permission to add participants');
  }

  const isDriver = participantData.driver_id !== undefined || participantData.role === 'driver';

  const { data, error } = await supabase
    .from('conversation_participants')
    .upsert(
      {
        conversation_id: conversationId,
        user_id: participantData.user_id,
        driver_id: participantData.driver_id,
        company_id: participantData.company_id,
        role: participantData.role,
        can_read: participantData.can_read ?? true,
        can_write: participantData.can_write ?? true,
        is_driver: isDriver,
        added_by_user_id: addedByUserId,
      },
      {
        onConflict: participantData.user_id ? 'conversation_id,user_id' : 'conversation_id,driver_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add participant: ${error.message}`);
  }

  // Log the activity
  await supabase.from('conversation_activity_log').insert({
    conversation_id: conversationId,
    actor_user_id: addedByUserId,
    action: 'participant_added',
    details: {
      participant_user_id: participantData.user_id,
      participant_driver_id: participantData.driver_id,
      role: participantData.role,
      can_read: participantData.can_read ?? true,
      can_write: participantData.can_write ?? true,
    },
  });

  return data as ConversationParticipant;
}

/**
 * Remove a participant from a conversation
 */
export async function removeParticipant(
  conversationId: string,
  removedByUserId: string,
  targetUserId?: string,
  targetDriverId?: string
): Promise<void> {
  const supabase = await createClient();

  // Verify the remover has permission
  const { data: removerConv } = await supabase
    .from('conversations')
    .select('owner_company_id')
    .eq('id', conversationId)
    .single();

  const { data: removerMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('user_id', removedByUserId)
    .eq('company_id', removerConv?.owner_company_id)
    .single();

  if (!removerMembership || !['owner', 'dispatcher', 'admin'].includes(removerMembership.role)) {
    throw new Error('You do not have permission to remove participants');
  }

  let query = supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId);

  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  } else if (targetDriverId) {
    query = query.eq('driver_id', targetDriverId);
  } else {
    throw new Error('Must specify either user_id or driver_id');
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to remove participant: ${error.message}`);
  }

  // Log the activity
  await supabase.from('conversation_activity_log').insert({
    conversation_id: conversationId,
    actor_user_id: removedByUserId,
    action: 'participant_removed',
    details: {
      removed_user_id: targetUserId,
      removed_driver_id: targetDriverId,
    },
  });
}

/**
 * Mark a conversation as read for a user
 */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('conversation_participants')
    .update({
      unread_count: 0,
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to mark conversation read: ${error.message}`);
  }
}

// ============================================================================
// DRIVER VISIBILITY MANAGEMENT
// ============================================================================

/**
 * Get load communication settings
 */
export async function getLoadCommunicationSettings(
  loadId: string
): Promise<LoadCommunicationSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('load_communication_settings')
    .select('*')
    .eq('load_id', loadId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch load communication settings: ${error.message}`);
  }

  return data as LoadCommunicationSettings | null;
}

/**
 * Update driver visibility for a load's shared conversation
 */
export async function updateDriverVisibility(
  loadId: string,
  driverVisibility: DriverVisibilityLevel,
  updatedByUserId: string,
  driverId?: string
): Promise<LoadCommunicationSettings> {
  const supabase = await createClient();

  // Get the load to find the company and check permissions
  const { data: load } = await supabase
    .from('loads')
    .select('company_id, assigned_driver_id')
    .eq('id', loadId)
    .single();

  if (!load) {
    throw new Error('Load not found');
  }

  // Check if there's a partner lock
  const { data: partnerSettings } = await supabase
    .from('partner_communication_settings')
    .select('lock_driver_visibility, default_driver_visibility')
    .eq('carrier_company_id', load.company_id)
    .maybeSingle();

  if (partnerSettings?.lock_driver_visibility) {
    throw new Error('Driver visibility is locked by partner settings');
  }

  const targetDriverId = driverId ?? load.assigned_driver_id;

  // Upsert the settings
  const { data: settings, error } = await supabase
    .from('load_communication_settings')
    .upsert(
      {
        load_id: loadId,
        driver_visibility: driverVisibility,
        driver_id: targetDriverId,
        set_by_user_id: updatedByUserId,
      },
      { onConflict: 'load_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update driver visibility: ${error.message}`);
  }

  // Apply visibility to the shared conversation if it exists
  const { data: sharedConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('load_id', loadId)
    .eq('type', 'load_shared')
    .maybeSingle();

  if (sharedConv && targetDriverId) {
    // Apply the visibility level to the driver's participation
    if (driverVisibility === 'none') {
      // Remove driver from conversation
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', sharedConv.id)
        .eq('driver_id', targetDriverId);
    } else {
      // Add/update driver with appropriate permissions
      await supabase
        .from('conversation_participants')
        .upsert(
          {
            conversation_id: sharedConv.id,
            driver_id: targetDriverId,
            company_id: load.company_id,
            role: 'driver',
            can_read: true,
            can_write: driverVisibility === 'full',
            is_driver: true,
            added_by_user_id: updatedByUserId,
          },
          { onConflict: 'conversation_id,driver_id' }
        );
    }

    // Log the visibility change
    await supabase.from('conversation_activity_log').insert({
      conversation_id: sharedConv.id,
      actor_user_id: updatedByUserId,
      action: 'visibility_changed',
      details: {
        driver_id: targetDriverId,
        new_visibility: driverVisibility,
      },
    });
  }

  return settings as LoadCommunicationSettings;
}

/**
 * Get partner communication settings
 */
export async function getPartnerCommunicationSettings(
  carrierCompanyId: string,
  partnerCompanyId: string
): Promise<PartnerCommunicationSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partner_communication_settings')
    .select('*')
    .eq('carrier_company_id', carrierCompanyId)
    .eq('partner_company_id', partnerCompanyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch partner communication settings: ${error.message}`);
  }

  return data as PartnerCommunicationSettings | null;
}

/**
 * Update partner communication settings
 */
export async function updatePartnerCommunicationSettings(
  carrierCompanyId: string,
  partnerCompanyId: string,
  settings: Partial<Omit<PartnerCommunicationSettings, 'id' | 'carrier_company_id' | 'partner_company_id' | 'created_at' | 'updated_at'>>,
  updatedByUserId: string
): Promise<PartnerCommunicationSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('partner_communication_settings')
    .upsert(
      {
        carrier_company_id: carrierCompanyId,
        partner_company_id: partnerCompanyId,
        ...settings,
        set_by_user_id: updatedByUserId,
      },
      { onConflict: 'carrier_company_id,partner_company_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update partner communication settings: ${error.message}`);
  }

  return data as PartnerCommunicationSettings;
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Get communication permissions for a load
 */
export async function getLoadCommunicationPermissions(
  loadId: string,
  userId: string
): Promise<LoadCommunicationPermissions> {
  const supabase = await createClient();

  // Get load details
  const { data: load } = await supabase
    .from('loads')
    .select('company_id, assigned_driver_id')
    .eq('id', loadId)
    .single();

  if (!load) {
    return {
      can_view_internal: false,
      can_view_shared: false,
      can_write_internal: false,
      can_write_shared: false,
      can_change_driver_visibility: false,
      driver_visibility: 'none',
      is_visibility_locked: false,
    };
  }

  // Check user's membership in the load's company
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', load.company_id)
    .single();

  // Get load communication settings
  const { data: commSettings } = await supabase
    .from('load_communication_settings')
    .select('driver_visibility')
    .eq('load_id', loadId)
    .maybeSingle();

  // Check partner lock
  const { data: partnerSettings } = await supabase
    .from('partner_communication_settings')
    .select('lock_driver_visibility')
    .eq('carrier_company_id', load.company_id)
    .maybeSingle();

  const isCompanyMember = !!membership;
  const isDispatcher = !!membership && ['owner', 'dispatcher', 'admin'].includes(membership.role);

  return {
    can_view_internal: isCompanyMember,
    can_view_shared: isCompanyMember, // Shared visibility depends on participant status
    can_write_internal: isCompanyMember,
    can_write_shared: isCompanyMember,
    can_change_driver_visibility: isDispatcher && !(partnerSettings?.lock_driver_visibility ?? false),
    driver_visibility: (commSettings?.driver_visibility as DriverVisibilityLevel) ?? 'none',
    is_visibility_locked: partnerSettings?.lock_driver_visibility ?? false,
  };
}

// ============================================================================
// DRIVER-SPECIFIC QUERIES
// ============================================================================

/**
 * Get conversations for a driver
 */
export async function getDriverConversations(
  driverId: string,
  options?: {
    type?: ConversationType;
    include_archived?: boolean;
    limit?: number;
  }
): Promise<ConversationListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('conversations')
    .select(`
      id,
      type,
      owner_company_id,
      load_id,
      trip_id,
      title,
      is_archived,
      is_muted,
      last_message_at,
      last_message_preview,
      last_message_sender_name,
      message_count,
      loads:load_id (
        id,
        load_number,
        status,
        pickup_city,
        delivery_city
      ),
      trips:trip_id (
        id,
        trip_number,
        status
      ),
      conversation_participants!inner (
        id,
        driver_id,
        can_read,
        can_write,
        unread_count,
        is_muted
      )
    `)
    .eq('conversation_participants.driver_id', driverId)
    .eq('conversation_participants.can_read', true)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (!options?.include_archived) {
    query = query.eq('is_archived', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch driver conversations: ${error.message}`);
  }

  // Transform to ConversationListItem format
  return (data ?? []).map((conv) => {
    const participant = Array.isArray(conv.conversation_participants)
      ? conv.conversation_participants[0]
      : conv.conversation_participants;

    const load = Array.isArray(conv.loads) ? conv.loads[0] : conv.loads;
    const trip = Array.isArray(conv.trips) ? conv.trips[0] : conv.trips;

    let title = conv.title ?? '';
    let subtitle = '';

    switch (conv.type as ConversationType) {
      case 'load_shared':
        title = title || `Shared - ${load?.load_number ?? 'Load'}`;
        subtitle = load ? `${load.pickup_city ?? ''} → ${load.delivery_city ?? ''}` : '';
        break;
      case 'load_internal':
        title = title || `${load?.load_number ?? 'Load'}`;
        subtitle = 'Team Chat';
        break;
      case 'trip_internal':
        title = title || `Trip ${trip?.trip_number ?? ''}`;
        subtitle = 'Team Chat';
        break;
      case 'driver_dispatch':
        title = title || 'Dispatch';
        subtitle = 'Direct message';
        break;
      default:
        title = title || 'Chat';
    }

    // Format preview with sender name
    const senderName = (conv as { last_message_sender_name?: string }).last_message_sender_name;
    const messagePreview = conv.last_message_preview
      ? (senderName ? `${senderName}: ${conv.last_message_preview}` : conv.last_message_preview)
      : undefined;

    return {
      id: conv.id,
      type: conv.type as ConversationType,
      title,
      subtitle,
      last_message_preview: messagePreview,
      last_message_at: conv.last_message_at,
      unread_count: participant?.unread_count ?? 0,
      is_muted: conv.is_muted || participant?.is_muted || false,
      participants_preview: [],
      context: {
        load_id: load?.id,
        load_number: load?.load_number,
        trip_id: trip?.id,
        trip_number: trip?.trip_number,
      },
    };
  });
}

/**
 * Check if driver has write access to a conversation
 * If not, find the appropriate internal conversation to route to
 */
export async function getDriverMessageTarget(
  driverId: string,
  conversationId: string
): Promise<{
  targetConversationId: string;
  canWrite: boolean;
  isRouted: boolean;
  routeReason?: string;
}> {
  const supabase = await createClient();

  // Get the conversation and driver's participation
  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id,
      type,
      load_id,
      trip_id,
      owner_company_id,
      conversation_participants!inner (
        can_write,
        driver_id
      )
    `)
    .eq('id', conversationId)
    .eq('conversation_participants.driver_id', driverId)
    .single();

  if (!conv) {
    throw new Error('Conversation not found or driver has no access');
  }

  const participant = Array.isArray(conv.conversation_participants)
    ? conv.conversation_participants[0]
    : conv.conversation_participants;

  // If driver can write, return the same conversation
  if (participant?.can_write) {
    return {
      targetConversationId: conversationId,
      canWrite: true,
      isRouted: false,
    };
  }

  // Driver is read-only on this conversation
  // Route to the internal conversation instead
  if (conv.type === 'load_shared' && conv.load_id) {
    // Find or create the internal load conversation
    const internalConv = await getOrCreateLoadConversation(
      conv.load_id,
      'load_internal',
      conv.owner_company_id
    );

    return {
      targetConversationId: internalConv.id,
      canWrite: false,
      isRouted: true,
      routeReason: 'You have read-only access to the shared conversation. Your message will be sent to the internal team chat.',
    };
  }

  throw new Error('Cannot determine message target for driver');
}

// ============================================================================
// PER-ENTITY UNREAD COUNT AGGREGATION
// ============================================================================

/**
 * Get aggregated unread message counts for loads
 * Returns a map of load_id -> total unread count across all conversations for that load
 */
export async function getUnreadByLoadForUser(
  userId: string,
  companyId: string
): Promise<Record<string, number>> {
  const supabase = await createClient();

  // Query conversations with load_id, joined with participant unread counts
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      load_id,
      conversation_participants!inner (
        unread_count
      )
    `)
    .not('load_id', 'is', null)
    .eq('conversation_participants.user_id', userId)
    .or(`owner_company_id.eq.${companyId},partner_company_id.eq.${companyId},carrier_company_id.eq.${companyId}`);

  if (error) {
    console.error('Failed to fetch unread by load:', error);
    return {};
  }

  // Aggregate unread counts by load_id
  const unreadByLoad: Record<string, number> = {};

  for (const conv of data || []) {
    if (!conv.load_id) continue;

    const participants = Array.isArray(conv.conversation_participants)
      ? conv.conversation_participants
      : [conv.conversation_participants];

    const totalUnread = participants.reduce(
      (sum, p) => sum + (p?.unread_count || 0),
      0
    );

    if (totalUnread > 0) {
      unreadByLoad[conv.load_id] = (unreadByLoad[conv.load_id] || 0) + totalUnread;
    }
  }

  return unreadByLoad;
}

/**
 * Get aggregated unread message counts for trips
 * Returns a map of trip_id -> total unread count across all conversations for that trip
 */
export async function getUnreadByTripForUser(
  userId: string,
  companyId: string
): Promise<Record<string, number>> {
  const supabase = await createClient();

  // Query conversations with trip_id, joined with participant unread counts
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      trip_id,
      conversation_participants!inner (
        unread_count
      )
    `)
    .not('trip_id', 'is', null)
    .eq('conversation_participants.user_id', userId)
    .or(`owner_company_id.eq.${companyId},partner_company_id.eq.${companyId},carrier_company_id.eq.${companyId}`);

  if (error) {
    console.error('Failed to fetch unread by trip:', error);
    return {};
  }

  // Aggregate unread counts by trip_id
  const unreadByTrip: Record<string, number> = {};

  for (const conv of data || []) {
    if (!conv.trip_id) continue;

    const participants = Array.isArray(conv.conversation_participants)
      ? conv.conversation_participants
      : [conv.conversation_participants];

    const totalUnread = participants.reduce(
      (sum, p) => sum + (p?.unread_count || 0),
      0
    );

    if (totalUnread > 0) {
      unreadByTrip[conv.trip_id] = (unreadByTrip[conv.trip_id] || 0) + totalUnread;
    }
  }

  return unreadByTrip;
}

/**
 * Get unread count for a specific entity (load or trip)
 * Useful for detail pages where you only need one entity's count
 */
export async function getUnreadForEntity(
  userId: string,
  companyId: string,
  entityType: 'load' | 'trip',
  entityId: string
): Promise<number> {
  const supabase = await createClient();

  const idColumn = entityType === 'load' ? 'load_id' : 'trip_id';

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      conversation_participants!inner (
        unread_count
      )
    `)
    .eq(idColumn, entityId)
    .eq('conversation_participants.user_id', userId)
    .or(`owner_company_id.eq.${companyId},partner_company_id.eq.${companyId},carrier_company_id.eq.${companyId}`);

  if (error) {
    console.error(`Failed to fetch unread for ${entityType}:`, error);
    return 0;
  }

  let totalUnread = 0;
  for (const conv of data || []) {
    const participants = Array.isArray(conv.conversation_participants)
      ? conv.conversation_participants
      : [conv.conversation_participants];

    totalUnread += participants.reduce(
      (sum, p) => sum + (p?.unread_count || 0),
      0
    );
  }

  return totalUnread;
}

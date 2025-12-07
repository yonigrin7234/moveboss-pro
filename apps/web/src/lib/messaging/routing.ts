// ============================================================================
// MOVEBOSS MESSAGE ROUTING LOGIC
// ============================================================================
// Handles intelligent message routing based on:
// - Conversation type (internal vs shared)
// - User role (driver, dispatcher, owner, partner_rep)
// - Driver visibility settings
// - Partner lock settings
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import {
  getOrCreateLoadConversation,
  getOrCreateTripConversation,
  getLoadCommunicationSettings,
  getPartnerCommunicationSettings,
  addParticipant,
} from '@/data/conversations';
import type {
  ConversationType,
  DriverVisibilityLevel,
  ConversationParticipantRole,
} from '@/lib/communication-types';

// ============================================================================
// TYPES
// ============================================================================

export interface MessageContext {
  load_id?: string;
  trip_id?: string;
  partner_company_id?: string;
  carrier_company_id?: string;
}

export interface SenderInfo {
  user_id?: string;
  driver_id?: string;
  company_id: string;
  role: ConversationParticipantRole;
}

export interface RoutingDecision {
  target_conversation_id: string;
  target_conversation_type: ConversationType;
  can_send: boolean;
  was_redirected: boolean;
  redirect_reason?: string;
  recipient_visibility: {
    driver_can_see: boolean;
    partner_can_see: boolean;
    internal_only: boolean;
  };
}

export interface ConversationSetup {
  internal_conversation_id?: string;
  shared_conversation_id?: string;
  participants_added: string[];
}

// ============================================================================
// ROUTING RULES
// ============================================================================

/**
 * Message Routing Rules:
 *
 * 1. DRIVER -> SHARED (full visibility): Direct send to shared conversation
 * 2. DRIVER -> SHARED (read-only): Redirect to internal, notify dispatch
 * 3. DRIVER -> SHARED (none): Block message (driver shouldn't see shared)
 * 4. DRIVER -> INTERNAL: Direct send to internal conversation
 *
 * 5. DISPATCHER -> INTERNAL: Direct send
 * 6. DISPATCHER -> SHARED: Direct send
 *
 * 7. OWNER -> INTERNAL: Direct send
 * 8. OWNER -> SHARED: Direct send
 *
 * 9. PARTNER_REP -> SHARED: Direct send (never to internal)
 * 10. PARTNER_REP -> INTERNAL: Block (partners can't see internal)
 *
 * Special Cases:
 * - Balance requests: Always to internal first, then AI/dispatch decides
 * - Urgent messages: Add high priority flag
 * - Document uploads: Attach to most specific context
 */

// ============================================================================
// ROUTING FUNCTIONS
// ============================================================================

/**
 * Determine the correct conversation target for a message
 */
export async function routeMessage(
  sender: SenderInfo,
  intendedConversationType: ConversationType,
  context: MessageContext
): Promise<RoutingDecision> {
  const supabase = await createClient();

  // Base decision
  const decision: RoutingDecision = {
    target_conversation_id: '',
    target_conversation_type: intendedConversationType,
    can_send: true,
    was_redirected: false,
    recipient_visibility: {
      driver_can_see: false,
      partner_can_see: false,
      internal_only: true,
    },
  };

  // Handle based on conversation type
  switch (intendedConversationType) {
    case 'load_shared':
      return routeLoadSharedMessage(sender, context, decision);

    case 'load_internal':
      return routeLoadInternalMessage(sender, context, decision);

    case 'trip_internal':
      return routeTripInternalMessage(sender, context, decision);

    case 'company_to_company':
      return routeCompanyMessage(sender, context, decision);

    case 'general':
      return routeGeneralMessage(sender, context, decision);

    default:
      decision.can_send = false;
      decision.redirect_reason = 'Unknown conversation type';
      return decision;
  }
}

/**
 * Route a message intended for a shared load conversation
 */
async function routeLoadSharedMessage(
  sender: SenderInfo,
  context: MessageContext,
  decision: RoutingDecision
): Promise<RoutingDecision> {
  if (!context.load_id) {
    decision.can_send = false;
    decision.redirect_reason = 'load_id is required for load_shared conversations';
    return decision;
  }

  // Partners can always send to shared (they never see internal)
  if (sender.role === 'partner_rep') {
    const conv = await getOrCreateLoadConversation(
      context.load_id,
      'load_shared',
      context.carrier_company_id!,
      sender.company_id
    );
    decision.target_conversation_id = conv.id;
    decision.recipient_visibility = {
      driver_can_see: true, // Will be filtered by visibility settings
      partner_can_see: true,
      internal_only: false,
    };
    return decision;
  }

  // For drivers, check visibility settings
  if (sender.role === 'driver' && sender.driver_id) {
    const settings = await getLoadCommunicationSettings(context.load_id);
    const visibility = settings?.driver_visibility ?? 'none';

    switch (visibility) {
      case 'none':
        // Driver shouldn't even see this conversation
        decision.can_send = false;
        decision.redirect_reason = 'You do not have access to the shared conversation for this load';
        return decision;

      case 'read_only':
        // Redirect to internal conversation
        const internalConv = await getOrCreateLoadConversation(
          context.load_id,
          'load_internal',
          sender.company_id
        );
        decision.target_conversation_id = internalConv.id;
        decision.target_conversation_type = 'load_internal';
        decision.was_redirected = true;
        decision.redirect_reason =
          'You have read-only access to the shared conversation. Your message has been sent to the internal team chat.';
        decision.recipient_visibility = {
          driver_can_see: true,
          partner_can_see: false,
          internal_only: true,
        };
        return decision;

      case 'full':
        // Can send directly to shared
        break;
    }
  }

  // Dispatcher/Owner can send directly to shared
  const partnerCompanyId = context.partner_company_id;
  if (!partnerCompanyId) {
    // Need to find the partner from existing conversation or load
    const supabase = await createClient();
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('partner_company_id')
      .eq('load_id', context.load_id)
      .eq('type', 'load_shared')
      .maybeSingle();

    if (!existingConv?.partner_company_id) {
      decision.can_send = false;
      decision.redirect_reason = 'No shared conversation exists for this load. Create one first or specify partner_company_id.';
      return decision;
    }
    context.partner_company_id = existingConv.partner_company_id;
  }

  const conv = await getOrCreateLoadConversation(
    context.load_id,
    'load_shared',
    sender.company_id,
    context.partner_company_id
  );
  decision.target_conversation_id = conv.id;
  decision.recipient_visibility = {
    driver_can_see: true,
    partner_can_see: true,
    internal_only: false,
  };

  return decision;
}

/**
 * Route a message intended for an internal load conversation
 */
async function routeLoadInternalMessage(
  sender: SenderInfo,
  context: MessageContext,
  decision: RoutingDecision
): Promise<RoutingDecision> {
  if (!context.load_id) {
    decision.can_send = false;
    decision.redirect_reason = 'load_id is required for load_internal conversations';
    return decision;
  }

  // Partners cannot send to internal
  if (sender.role === 'partner_rep') {
    decision.can_send = false;
    decision.redirect_reason = 'Partners cannot access internal conversations';
    return decision;
  }

  const conv = await getOrCreateLoadConversation(
    context.load_id,
    'load_internal',
    sender.company_id
  );
  decision.target_conversation_id = conv.id;
  decision.recipient_visibility = {
    driver_can_see: true,
    partner_can_see: false,
    internal_only: true,
  };

  return decision;
}

/**
 * Route a message intended for a trip conversation
 */
async function routeTripInternalMessage(
  sender: SenderInfo,
  context: MessageContext,
  decision: RoutingDecision
): Promise<RoutingDecision> {
  if (!context.trip_id) {
    decision.can_send = false;
    decision.redirect_reason = 'trip_id is required for trip_internal conversations';
    return decision;
  }

  // Partners cannot send to trip conversations
  if (sender.role === 'partner_rep') {
    decision.can_send = false;
    decision.redirect_reason = 'Partners cannot access trip conversations';
    return decision;
  }

  const conv = await getOrCreateTripConversation(context.trip_id, sender.company_id);
  decision.target_conversation_id = conv.id;
  decision.recipient_visibility = {
    driver_can_see: true,
    partner_can_see: false,
    internal_only: true,
  };

  return decision;
}

/**
 * Route a message intended for a company-to-company conversation
 */
async function routeCompanyMessage(
  sender: SenderInfo,
  context: MessageContext,
  decision: RoutingDecision
): Promise<RoutingDecision> {
  const partnerId = sender.role === 'partner_rep' ? context.carrier_company_id : context.partner_company_id;

  if (!partnerId) {
    decision.can_send = false;
    decision.redirect_reason = 'partner_company_id is required for company_to_company conversations';
    return decision;
  }

  // Drivers typically shouldn't be in company-to-company conversations
  if (sender.role === 'driver') {
    decision.can_send = false;
    decision.redirect_reason = 'Drivers cannot send company-to-company messages directly';
    return decision;
  }

  const supabase = await createClient();
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'company_to_company')
    .or(
      `and(carrier_company_id.eq.${sender.company_id},partner_company_id.eq.${partnerId}),and(carrier_company_id.eq.${partnerId},partner_company_id.eq.${sender.company_id})`
    )
    .maybeSingle();

  if (conv) {
    decision.target_conversation_id = conv.id;
  } else {
    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        type: 'company_to_company',
        owner_company_id: sender.company_id,
        carrier_company_id: sender.role === 'partner_rep' ? partnerId : sender.company_id,
        partner_company_id: sender.role === 'partner_rep' ? sender.company_id : partnerId,
      })
      .select()
      .single();

    if (newConv) {
      decision.target_conversation_id = newConv.id;
    } else {
      decision.can_send = false;
      decision.redirect_reason = 'Failed to create company conversation';
      return decision;
    }
  }

  decision.recipient_visibility = {
    driver_can_see: false,
    partner_can_see: true,
    internal_only: false,
  };

  return decision;
}

/**
 * Route a general message
 */
async function routeGeneralMessage(
  sender: SenderInfo,
  context: MessageContext,
  decision: RoutingDecision
): Promise<RoutingDecision> {
  // General messages go to a company-wide chat
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('type', 'general')
    .eq('owner_company_id', sender.company_id)
    .maybeSingle();

  if (conv) {
    decision.target_conversation_id = conv.id;
  } else {
    // Create general conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        type: 'general',
        owner_company_id: sender.company_id,
        title: 'General Chat',
      })
      .select()
      .single();

    if (newConv) {
      decision.target_conversation_id = newConv.id;
    } else {
      decision.can_send = false;
      decision.redirect_reason = 'Failed to create general conversation';
      return decision;
    }
  }

  decision.recipient_visibility = {
    driver_can_see: true,
    partner_can_see: false,
    internal_only: true,
  };

  return decision;
}

// ============================================================================
// CONVERSATION SETUP HELPERS
// ============================================================================

/**
 * Set up conversations for a new load assignment
 * Called when a load is assigned to a driver or partner
 */
export async function setupLoadConversations(
  loadId: string,
  carrierCompanyId: string,
  options: {
    driverId?: string;
    partnerCompanyId?: string;
    createdByUserId?: string;
  }
): Promise<ConversationSetup> {
  const result: ConversationSetup = {
    participants_added: [],
  };

  // Always create internal conversation
  const internalConv = await getOrCreateLoadConversation(
    loadId,
    'load_internal',
    carrierCompanyId,
    undefined,
    options.createdByUserId
  );
  result.internal_conversation_id = internalConv.id;

  // Add driver to internal if provided
  if (options.driverId) {
    await addParticipant(internalConv.id, options.createdByUserId!, {
      driver_id: options.driverId,
      company_id: carrierCompanyId,
      role: 'driver',
      can_read: true,
      can_write: true,
    });
    result.participants_added.push(`driver:${options.driverId}`);
  }

  // Create shared conversation if partner is provided
  if (options.partnerCompanyId) {
    // Check partner settings for auto-create
    const partnerSettings = await getPartnerCommunicationSettings(
      carrierCompanyId,
      options.partnerCompanyId
    );

    if (!partnerSettings || partnerSettings.auto_create_shared_conversation !== false) {
      const sharedConv = await getOrCreateLoadConversation(
        loadId,
        'load_shared',
        carrierCompanyId,
        options.partnerCompanyId,
        options.createdByUserId
      );
      result.shared_conversation_id = sharedConv.id;

      // Apply default driver visibility from partner settings
      if (options.driverId && partnerSettings?.default_driver_visibility) {
        const visibility = partnerSettings.default_driver_visibility;
        if (visibility !== 'none') {
          await addParticipant(sharedConv.id, options.createdByUserId!, {
            driver_id: options.driverId,
            company_id: carrierCompanyId,
            role: 'driver',
            can_read: true,
            can_write: visibility === 'full',
          });
          result.participants_added.push(`driver:${options.driverId}:shared`);
        }
      }
    }
  }

  return result;
}

/**
 * Update driver access to conversations when visibility changes
 */
export async function updateDriverConversationAccess(
  loadId: string,
  driverId: string,
  visibility: DriverVisibilityLevel,
  updatedByUserId: string
): Promise<void> {
  const supabase = await createClient();

  // Find the shared conversation for this load
  const { data: sharedConv } = await supabase
    .from('conversations')
    .select('id, owner_company_id')
    .eq('load_id', loadId)
    .eq('type', 'load_shared')
    .maybeSingle();

  if (!sharedConv) return;

  switch (visibility) {
    case 'none':
      // Remove driver from shared conversation
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', sharedConv.id)
        .eq('driver_id', driverId);
      break;

    case 'read_only':
      // Add/update driver with read-only access
      await addParticipant(sharedConv.id, updatedByUserId, {
        driver_id: driverId,
        company_id: sharedConv.owner_company_id,
        role: 'driver',
        can_read: true,
        can_write: false,
      });
      break;

    case 'full':
      // Add/update driver with full access
      await addParticipant(sharedConv.id, updatedByUserId, {
        driver_id: driverId,
        company_id: sharedConv.owner_company_id,
        role: 'driver',
        can_read: true,
        can_write: true,
      });
      break;
  }

  // Log the activity
  await supabase.from('conversation_activity_log').insert({
    conversation_id: sharedConv.id,
    actor_user_id: updatedByUserId,
    action: 'driver_visibility_changed',
    details: {
      driver_id: driverId,
      new_visibility: visibility,
    },
  });
}

/**
 * Get the appropriate conversation for a driver to reply to
 */
export async function getDriverReplyTarget(
  driverId: string,
  originalConversationId: string
): Promise<{
  targetConversationId: string;
  wasRedirected: boolean;
  redirectReason?: string;
}> {
  const supabase = await createClient();

  // Get the conversation details
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
    .eq('id', originalConversationId)
    .eq('conversation_participants.driver_id', driverId)
    .single();

  if (!conv) {
    throw new Error('Conversation not found or driver has no access');
  }

  const participant = Array.isArray(conv.conversation_participants)
    ? conv.conversation_participants[0]
    : conv.conversation_participants;

  // If driver can write, use the same conversation
  if (participant?.can_write) {
    return {
      targetConversationId: originalConversationId,
      wasRedirected: false,
    };
  }

  // Driver is read-only - route to internal
  if (conv.type === 'load_shared' && conv.load_id) {
    const internalConv = await getOrCreateLoadConversation(
      conv.load_id,
      'load_internal',
      conv.owner_company_id
    );

    return {
      targetConversationId: internalConv.id,
      wasRedirected: true,
      redirectReason:
        'You have read-only access to the shared conversation. Your reply has been sent to the internal team chat.',
    };
  }

  throw new Error('Cannot determine reply target');
}

// ============================================================================
// MOVEBOSS AI AGENT - COMMUNICATION TOOL DEFINITIONS
// ============================================================================
// These tools enable the AI agent to interact with the messaging system
// while respecting all permission rules and visibility constraints.
// ============================================================================

import { createClient } from '@/lib/supabase-server';
import {
  getOrCreateLoadConversation,
  getOrCreateTripConversation,
  getOrCreateCompanyConversation,
  getConversationMessages,
  sendMessage,
  getLoadCommunicationSettings,
  getDriverConversations,
  getDriverMessageTarget,
  addParticipant,
} from '@/data/conversations';
import type {
  ConversationType,
  DriverVisibilityLevel,
  MessageMetadata,
  ConversationListItem,
  MessageWithSender,
} from '@/lib/communication-types';

// ============================================================================
// TOOL SCHEMAS (JSON Schema format for AI model)
// ============================================================================

export const AI_TOOL_SCHEMAS = {
  send_message: {
    name: 'send_message',
    description: `Send a message to a conversation. The message will be sent from the AI agent and clearly marked as such.

RULES:
- Must specify the context (load_id, trip_id, or company pair)
- For load conversations, must specify if internal or shared
- Respects driver visibility settings automatically
- Never leaks internal messages to shared conversations
- For driver conversations with read-only access, routes to internal automatically`,
    parameters: {
      type: 'object',
      properties: {
        context_type: {
          type: 'string',
          enum: ['load_internal', 'load_shared', 'trip_internal', 'company_to_company'],
          description: 'The type of conversation context',
        },
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'Required for load conversations',
        },
        trip_id: {
          type: 'string',
          format: 'uuid',
          description: 'Required for trip conversations',
        },
        partner_company_id: {
          type: 'string',
          format: 'uuid',
          description: 'Required for shared/company-to-company conversations',
        },
        message: {
          type: 'string',
          description: 'The message content to send',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata (intent, context_used, etc.)',
        },
      },
      required: ['context_type', 'message'],
    },
  },

  get_conversation_for_load: {
    name: 'get_conversation_for_load',
    description: `Retrieve the conversation history for a specific load.

Returns both internal and shared conversations if the user has access.
Respects RLS and participant permissions.`,
    parameters: {
      type: 'object',
      properties: {
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'The load ID to get conversations for',
        },
        conversation_type: {
          type: 'string',
          enum: ['internal', 'shared', 'both'],
          description: 'Which conversation type to retrieve (default: both)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 50)',
        },
      },
      required: ['load_id'],
    },
  },

  get_conversation_for_trip: {
    name: 'get_conversation_for_trip',
    description: `Retrieve the internal conversation history for a specific trip.

Trip conversations are always internal (carrier team only).`,
    parameters: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          format: 'uuid',
          description: 'The trip ID to get conversation for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 50)',
        },
      },
      required: ['trip_id'],
    },
  },

  get_company_thread: {
    name: 'get_company_thread',
    description: `Get the conversation thread between two companies (carrier <-> partner).

This is for general company communication, not tied to a specific load.`,
    parameters: {
      type: 'object',
      properties: {
        partner_company_id: {
          type: 'string',
          format: 'uuid',
          description: 'The partner company ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 50)',
        },
      },
      required: ['partner_company_id'],
    },
  },

  summarize_conversation: {
    name: 'summarize_conversation',
    description: `Generate a summary of a conversation.

Useful for getting a quick overview of discussion history before responding.
Respects all permission rules.`,
    parameters: {
      type: 'object',
      properties: {
        conversation_id: {
          type: 'string',
          format: 'uuid',
          description: 'The conversation to summarize',
        },
        focus_areas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional topics to focus on (e.g., ["balance", "delivery_time", "issues"])',
        },
      },
      required: ['conversation_id'],
    },
  },

  classify_message_context: {
    name: 'classify_message_context',
    description: `Classify an incoming message to determine the appropriate context and routing.

Returns:
- suggested_context_type (load_internal, load_shared, trip_internal, etc.)
- suggested_load_id or trip_id if detectable
- urgency level
- suggested_action`,
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to classify',
        },
        sender_role: {
          type: 'string',
          enum: ['driver', 'dispatcher', 'owner', 'partner_rep'],
          description: 'The role of the message sender',
        },
        current_context: {
          type: 'object',
          description: 'Current context (load_id, trip_id) if known',
        },
      },
      required: ['message', 'sender_role'],
    },
  },

  create_balance_verification_request: {
    name: 'create_balance_verification_request',
    description: `Create a balance verification request message.

This is a special message type for confirming payment collection requirements.
The message will include structured metadata for tracking.`,
    parameters: {
      type: 'object',
      properties: {
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'The load this balance is for',
        },
        amount: {
          type: 'number',
          description: 'The balance amount to collect',
        },
        stop_type: {
          type: 'string',
          enum: ['pickup', 'delivery', 'storage'],
          description: 'Which stop this applies to',
        },
        instructions: {
          type: 'string',
          description: 'Additional instructions for the driver',
        },
      },
      required: ['load_id', 'amount', 'stop_type'],
    },
  },

  notify_driver: {
    name: 'notify_driver',
    description: `Send a notification to a driver.

This sends both a push notification and a message in the appropriate conversation.
Automatically routes to the correct conversation based on context.`,
    parameters: {
      type: 'object',
      properties: {
        driver_id: {
          type: 'string',
          format: 'uuid',
          description: 'The driver to notify',
        },
        message: {
          type: 'string',
          description: 'The notification message',
        },
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'Optional load context',
        },
        trip_id: {
          type: 'string',
          format: 'uuid',
          description: 'Optional trip context',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Notification urgency level',
        },
      },
      required: ['driver_id', 'message'],
    },
  },

  notify_dispatch: {
    name: 'notify_dispatch',
    description: `Send a notification to dispatch/operations team.

Routes to the internal conversation for the given context.`,
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The notification message',
        },
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'Optional load context',
        },
        trip_id: {
          type: 'string',
          format: 'uuid',
          description: 'Optional trip context',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Notification urgency level',
        },
        from_driver_id: {
          type: 'string',
          format: 'uuid',
          description: 'If this is relaying a message from a driver',
        },
      },
      required: ['message'],
    },
  },

  check_driver_visibility: {
    name: 'check_driver_visibility',
    description: `Check the driver visibility settings for a load.

Returns the current visibility level and whether it's locked by partner settings.`,
    parameters: {
      type: 'object',
      properties: {
        load_id: {
          type: 'string',
          format: 'uuid',
          description: 'The load to check visibility for',
        },
      },
      required: ['load_id'],
    },
  },
};

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

export interface AIToolContext {
  userId: string;
  companyId: string;
  role: string;
  driverId?: string; // If the AI is acting on behalf of a driver
}

export interface AIToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a message through the AI agent
 */
export async function aiSendMessage(
  context: AIToolContext,
  params: {
    context_type: ConversationType;
    load_id?: string;
    trip_id?: string;
    partner_company_id?: string;
    message: string;
    metadata?: MessageMetadata;
  }
): Promise<AIToolResult<{ conversation_id: string; message_id: string }>> {
  try {
    let conversationId: string;

    switch (params.context_type) {
      case 'load_internal':
        if (!params.load_id) {
          return { success: false, error: 'load_id is required for load_internal conversations' };
        }
        const internalConv = await getOrCreateLoadConversation(
          params.load_id,
          'load_internal',
          context.companyId,
          undefined,
          context.userId
        );
        conversationId = internalConv.id;
        break;

      case 'load_shared':
        if (!params.load_id || !params.partner_company_id) {
          return {
            success: false,
            error: 'load_id and partner_company_id are required for load_shared conversations',
          };
        }
        const sharedConv = await getOrCreateLoadConversation(
          params.load_id,
          'load_shared',
          context.companyId,
          params.partner_company_id,
          context.userId
        );
        conversationId = sharedConv.id;
        break;

      case 'trip_internal':
        if (!params.trip_id) {
          return { success: false, error: 'trip_id is required for trip_internal conversations' };
        }
        const tripConv = await getOrCreateTripConversation(
          params.trip_id,
          context.companyId,
          context.userId
        );
        conversationId = tripConv.id;
        break;

      case 'company_to_company':
        if (!params.partner_company_id) {
          return {
            success: false,
            error: 'partner_company_id is required for company_to_company conversations',
          };
        }
        const companyConv = await getOrCreateCompanyConversation(
          context.companyId,
          params.partner_company_id,
          context.userId
        );
        conversationId = companyConv.id;
        break;

      default:
        return { success: false, error: `Unsupported context_type: ${params.context_type}` };
    }

    // Send the message
    const message = await sendMessage(conversationId, context.userId, params.message, {
      message_type: 'ai_response',
      metadata: {
        ...params.metadata,
        ai_agent: true,
        ai_context: params.context_type,
      },
    });

    return {
      success: true,
      data: {
        conversation_id: conversationId,
        message_id: message.id,
      },
      metadata: {
        context_type: params.context_type,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get conversation messages for a load
 */
export async function aiGetConversationForLoad(
  context: AIToolContext,
  params: {
    load_id: string;
    conversation_type?: 'internal' | 'shared' | 'both';
    limit?: number;
  }
): Promise<
  AIToolResult<{
    internal?: { conversation_id: string; messages: MessageWithSender[] };
    shared?: { conversation_id: string; messages: MessageWithSender[] };
  }>
> {
  try {
    const conversationType = params.conversation_type ?? 'both';
    const limit = params.limit ?? 50;
    const result: {
      internal?: { conversation_id: string; messages: MessageWithSender[] };
      shared?: { conversation_id: string; messages: MessageWithSender[] };
    } = {};

    if (conversationType === 'internal' || conversationType === 'both') {
      try {
        const internalConv = await getOrCreateLoadConversation(
          params.load_id,
          'load_internal',
          context.companyId
        );
        const { messages } = await getConversationMessages(
          internalConv.id,
          context.userId,
          { limit }
        );
        result.internal = {
          conversation_id: internalConv.id,
          messages,
        };
      } catch {
        // User may not have access to internal
      }
    }

    if (conversationType === 'shared' || conversationType === 'both') {
      // Need to find the partner company for this load
      const supabase = await createClient();
      const { data: load } = await supabase
        .from('loads')
        .select('company_id')
        .eq('id', params.load_id)
        .single();

      if (load) {
        // Check for shared conversation
        const { data: sharedConvs } = await supabase
          .from('conversations')
          .select('id, partner_company_id')
          .eq('load_id', params.load_id)
          .eq('type', 'load_shared');

        if (sharedConvs && sharedConvs.length > 0) {
          try {
            const { messages } = await getConversationMessages(
              sharedConvs[0].id,
              context.userId,
              { limit }
            );
            result.shared = {
              conversation_id: sharedConvs[0].id,
              messages,
            };
          } catch {
            // User may not have access to shared
          }
        }
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversation',
    };
  }
}

/**
 * Get conversation messages for a trip
 */
export async function aiGetConversationForTrip(
  context: AIToolContext,
  params: {
    trip_id: string;
    limit?: number;
  }
): Promise<AIToolResult<{ conversation_id: string; messages: MessageWithSender[] }>> {
  try {
    const tripConv = await getOrCreateTripConversation(
      params.trip_id,
      context.companyId
    );
    const { messages } = await getConversationMessages(
      tripConv.id,
      context.userId,
      { limit: params.limit ?? 50 }
    );

    return {
      success: true,
      data: {
        conversation_id: tripConv.id,
        messages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trip conversation',
    };
  }
}

/**
 * Get company-to-company conversation
 */
export async function aiGetCompanyThread(
  context: AIToolContext,
  params: {
    partner_company_id: string;
    limit?: number;
  }
): Promise<AIToolResult<{ conversation_id: string; messages: MessageWithSender[] }>> {
  try {
    const companyConv = await getOrCreateCompanyConversation(
      context.companyId,
      params.partner_company_id
    );
    const { messages } = await getConversationMessages(
      companyConv.id,
      context.userId,
      { limit: params.limit ?? 50 }
    );

    return {
      success: true,
      data: {
        conversation_id: companyConv.id,
        messages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get company thread',
    };
  }
}

/**
 * Summarize a conversation
 */
export async function aiSummarizeConversation(
  context: AIToolContext,
  params: {
    conversation_id: string;
    focus_areas?: string[];
  }
): Promise<
  AIToolResult<{
    summary: string;
    key_points: string[];
    action_items: string[];
    participants: string[];
  }>
> {
  try {
    const { messages } = await getConversationMessages(
      params.conversation_id,
      context.userId,
      { limit: 100 }
    );

    // Generate summary from messages
    // In production, this would use an LLM to generate a proper summary
    // For now, we'll create a structured extraction
    const participants = new Set<string>();
    const messageTexts: string[] = [];

    for (const msg of messages) {
      if (msg.sender_profile?.full_name) {
        participants.add(msg.sender_profile.full_name);
      } else if (msg.sender_driver) {
        participants.add(`${msg.sender_driver.first_name} ${msg.sender_driver.last_name}`);
      }
      messageTexts.push(msg.body);
    }

    // Simple keyword extraction for action items and key points
    const actionKeywords = ['please', 'need', 'must', 'should', 'confirm', 'verify', 'collect', 'call'];
    const actionItems = messages
      .filter((msg) =>
        actionKeywords.some((kw) => msg.body.toLowerCase().includes(kw))
      )
      .slice(0, 5)
      .map((msg) => msg.body.slice(0, 100));

    const summary = `Conversation with ${messages.length} messages from ${participants.size} participants. ` +
      `Latest activity: ${messages[messages.length - 1]?.body?.slice(0, 100) ?? 'No messages'}`;

    return {
      success: true,
      data: {
        summary,
        key_points: messageTexts.slice(-5).map((t) => t.slice(0, 100)),
        action_items: actionItems,
        participants: Array.from(participants),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize conversation',
    };
  }
}

/**
 * Classify message context
 */
export async function aiClassifyMessageContext(
  _context: AIToolContext,
  params: {
    message: string;
    sender_role: 'driver' | 'dispatcher' | 'owner' | 'partner_rep';
    current_context?: { load_id?: string; trip_id?: string };
  }
): Promise<
  AIToolResult<{
    suggested_context_type: ConversationType;
    suggested_load_id?: string;
    suggested_trip_id?: string;
    urgency: 'low' | 'medium' | 'high';
    suggested_action: string;
  }>
> {
  const messageLower = params.message.toLowerCase();

  // Simple classification logic (in production, use LLM)
  let urgency: 'low' | 'medium' | 'high' = 'medium';
  let suggestedAction = 'respond_normally';

  // Urgency detection
  if (
    messageLower.includes('urgent') ||
    messageLower.includes('asap') ||
    messageLower.includes('emergency') ||
    messageLower.includes('immediately')
  ) {
    urgency = 'high';
  } else if (
    messageLower.includes('when you can') ||
    messageLower.includes('no rush') ||
    messageLower.includes('fyi')
  ) {
    urgency = 'low';
  }

  // Context detection
  let suggestedContextType: ConversationType = 'general';
  if (params.current_context?.load_id) {
    // If we have a load context
    if (params.sender_role === 'partner_rep' || messageLower.includes('partner') || messageLower.includes('broker')) {
      suggestedContextType = 'load_shared';
    } else {
      suggestedContextType = 'load_internal';
    }
  } else if (params.current_context?.trip_id) {
    suggestedContextType = 'trip_internal';
  }

  // Action detection
  if (messageLower.includes('balance') || messageLower.includes('collect') || messageLower.includes('payment')) {
    suggestedAction = 'verify_balance';
  } else if (messageLower.includes('eta') || messageLower.includes('arrival') || messageLower.includes('late')) {
    suggestedAction = 'provide_eta_update';
  } else if (messageLower.includes('document') || messageLower.includes('bol') || messageLower.includes('photo')) {
    suggestedAction = 'request_document';
  }

  return {
    success: true,
    data: {
      suggested_context_type: suggestedContextType,
      suggested_load_id: params.current_context?.load_id,
      suggested_trip_id: params.current_context?.trip_id,
      urgency,
      suggested_action: suggestedAction,
    },
  };
}

/**
 * Create a balance verification request
 */
export async function aiCreateBalanceVerificationRequest(
  context: AIToolContext,
  params: {
    load_id: string;
    amount: number;
    stop_type: 'pickup' | 'delivery' | 'storage';
    instructions?: string;
  }
): Promise<AIToolResult<{ conversation_id: string; message_id: string }>> {
  try {
    const internalConv = await getOrCreateLoadConversation(
      params.load_id,
      'load_internal',
      context.companyId
    );

    const message = await sendMessage(
      internalConv.id,
      context.userId,
      `Balance Verification Request:\n\nAmount to collect: $${params.amount.toFixed(2)}\nStop: ${params.stop_type}\n${params.instructions ? `\nInstructions: ${params.instructions}` : ''}`,
      {
        message_type: 'balance_request',
        metadata: {
          balance_amount: params.amount,
          balance_status: 'pending',
          stop_type: params.stop_type,
          ai_generated: true,
        },
      }
    );

    return {
      success: true,
      data: {
        conversation_id: internalConv.id,
        message_id: message.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create balance verification request',
    };
  }
}

/**
 * Check driver visibility settings for a load
 */
export async function aiCheckDriverVisibility(
  _context: AIToolContext,
  params: {
    load_id: string;
  }
): Promise<
  AIToolResult<{
    visibility: DriverVisibilityLevel;
    is_locked: boolean;
    driver_id?: string;
  }>
> {
  try {
    const settings = await getLoadCommunicationSettings(params.load_id);

    if (!settings) {
      return {
        success: true,
        data: {
          visibility: 'none',
          is_locked: false,
        },
      };
    }

    // Check for partner lock
    const supabase = await createClient();
    const { data: load } = await supabase
      .from('loads')
      .select('company_id')
      .eq('id', params.load_id)
      .single();

    let isLocked = false;
    if (load) {
      const { data: partnerSettings } = await supabase
        .from('partner_communication_settings')
        .select('lock_driver_visibility')
        .eq('carrier_company_id', load.company_id)
        .maybeSingle();

      isLocked = partnerSettings?.lock_driver_visibility ?? false;
    }

    return {
      success: true,
      data: {
        visibility: settings.driver_visibility,
        is_locked: isLocked,
        driver_id: settings.driver_id ?? undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check driver visibility',
    };
  }
}

/**
 * Get driver's conversations
 */
export async function aiGetDriverConversations(
  context: AIToolContext,
  params: {
    driver_id: string;
    limit?: number;
  }
): Promise<AIToolResult<{ conversations: ConversationListItem[] }>> {
  try {
    const conversations = await getDriverConversations(params.driver_id, {
      limit: params.limit ?? 20,
    });

    return {
      success: true,
      data: { conversations },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get driver conversations',
    };
  }
}

/**
 * Route a driver's message to the appropriate conversation
 * (handles read-only -> internal routing)
 */
export async function aiRouteDriverMessage(
  context: AIToolContext,
  params: {
    driver_id: string;
    conversation_id: string;
    message: string;
  }
): Promise<
  AIToolResult<{
    target_conversation_id: string;
    was_routed: boolean;
    route_reason?: string;
    message_id: string;
  }>
> {
  try {
    const routeInfo = await getDriverMessageTarget(
      params.driver_id,
      params.conversation_id
    );

    // Send to the appropriate conversation
    const supabase = await createClient();

    // Get driver's linked user account if any
    const { data: driver } = await supabase
      .from('drivers')
      .select('email, phone')
      .eq('id', params.driver_id)
      .single();

    let senderUserId = context.userId;
    if (driver) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${driver.email},phone.eq.${driver.phone}`)
        .maybeSingle();

      if (profile) {
        senderUserId = profile.id;
      }
    }

    // Get company for the conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('owner_company_id')
      .eq('id', routeInfo.targetConversationId)
      .single();

    const message = await sendMessage(
      routeInfo.targetConversationId,
      senderUserId,
      params.message,
      {
        message_type: 'text',
        sender_company_id: conv?.owner_company_id,
        metadata: routeInfo.isRouted
          ? {
              routed_from_conversation: params.conversation_id,
              route_reason: routeInfo.routeReason,
            }
          : undefined,
      }
    );

    return {
      success: true,
      data: {
        target_conversation_id: routeInfo.targetConversationId,
        was_routed: routeInfo.isRouted,
        route_reason: routeInfo.routeReason,
        message_id: message.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to route driver message',
    };
  }
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

export type AIToolName = keyof typeof AI_TOOL_SCHEMAS;

export async function executeAITool(
  toolName: AIToolName,
  context: AIToolContext,
  params: Record<string, unknown>
): Promise<AIToolResult> {
  switch (toolName) {
    case 'send_message':
      return aiSendMessage(context, params as Parameters<typeof aiSendMessage>[1]);

    case 'get_conversation_for_load':
      return aiGetConversationForLoad(
        context,
        params as Parameters<typeof aiGetConversationForLoad>[1]
      );

    case 'get_conversation_for_trip':
      return aiGetConversationForTrip(
        context,
        params as Parameters<typeof aiGetConversationForTrip>[1]
      );

    case 'get_company_thread':
      return aiGetCompanyThread(context, params as Parameters<typeof aiGetCompanyThread>[1]);

    case 'summarize_conversation':
      return aiSummarizeConversation(
        context,
        params as Parameters<typeof aiSummarizeConversation>[1]
      );

    case 'classify_message_context':
      return aiClassifyMessageContext(
        context,
        params as Parameters<typeof aiClassifyMessageContext>[1]
      );

    case 'create_balance_verification_request':
      return aiCreateBalanceVerificationRequest(
        context,
        params as Parameters<typeof aiCreateBalanceVerificationRequest>[1]
      );

    case 'check_driver_visibility':
      return aiCheckDriverVisibility(
        context,
        params as Parameters<typeof aiCheckDriverVisibility>[1]
      );

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// MOVEBOSS COMMUNICATION SYSTEM - TYPE DEFINITIONS
// ============================================================================

// ----------------------------------------------------------------------------
// Enums (matching database types)
// ----------------------------------------------------------------------------

export type ConversationType =
  | 'load_shared'        // Carrier <-> Partner for a specific load
  | 'load_internal'      // Internal carrier team discussion about a load
  | 'trip_internal'      // Internal carrier team discussion about a trip
  | 'company_to_company' // General carrier <-> partner communication
  | 'general';           // General company-wide or team chat

export type DriverVisibilityLevel =
  | 'none'       // Driver cannot see the shared conversation
  | 'read_only'  // Driver can see but not reply
  | 'full';      // Driver can see and reply

export type ConversationParticipantRole =
  | 'owner'
  | 'dispatcher'
  | 'driver'
  | 'helper'
  | 'partner_rep'
  | 'broker'
  | 'ai_agent';

export type MessageType =
  | 'text'
  | 'system'
  | 'ai_response'
  | 'document'
  | 'image'
  | 'voice'
  | 'location'
  | 'balance_request'
  | 'status_update';

// ----------------------------------------------------------------------------
// Database Row Types
// ----------------------------------------------------------------------------

export interface Conversation {
  id: string;
  type: ConversationType;
  owner_company_id: string;
  load_id: string | null;
  trip_id: string | null;
  carrier_company_id: string | null;
  partner_company_id: string | null;
  title: string | null;
  is_archived: boolean;
  is_muted: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string | null;
  company_id: string | null;
  driver_id: string | null;
  role: ConversationParticipantRole;
  can_read: boolean;
  can_write: boolean;
  is_driver: boolean;
  notifications_enabled: boolean;
  is_muted: boolean;
  last_read_at: string | null;
  unread_count: number;
  added_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_driver_id: string | null;
  sender_company_id: string | null;
  message_type: MessageType;
  body: string;
  attachments: MessageAttachment[];
  metadata: MessageMetadata;
  reply_to_message_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  original_body: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
  created_at: string;
}

export interface MessageAttachment {
  type: 'image' | 'document' | 'voice';
  url: string;
  name: string;
  size?: number;
  mime_type?: string;
}

export interface MessageMetadata {
  // AI message metadata
  ai_model?: string;
  intent?: string;
  confidence?: number;
  context_used?: string[];

  // System message metadata
  event_type?: string;
  related_ids?: Record<string, string>;

  // Balance request metadata
  balance_amount?: number;
  balance_status?: 'pending' | 'verified' | 'disputed';

  // Location metadata
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface LoadCommunicationSettings {
  id: string;
  load_id: string;
  driver_visibility: DriverVisibilityLevel;
  driver_id: string | null;
  allow_partner_direct_to_driver: boolean;
  auto_add_driver_to_internal: boolean;
  notes: string | null;
  set_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerCommunicationSettings {
  id: string;
  carrier_company_id: string;
  partner_company_id: string;
  default_driver_visibility: DriverVisibilityLevel;
  lock_driver_visibility: boolean;
  allow_driver_partner_direct_messages: boolean;
  auto_create_shared_conversation: boolean;
  notify_on_load_status_change: boolean;
  notify_on_driver_location_update: boolean;
  notes: string | null;
  set_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string | null;
  driver_id: string | null;
  read_at: string;
}

export interface ConversationActivityLog {
  id: string;
  conversation_id: string;
  actor_user_id: string | null;
  actor_driver_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Extended Types with Relations
// ----------------------------------------------------------------------------

export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipant[];
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipantWithProfile[];
  load?: {
    id: string;
    load_number: string;
    status: string;
    pickup_city: string | null;
    delivery_city: string | null;
  };
  trip?: {
    id: string;
    trip_number: string;
    status: string;
  };
  carrier_company?: {
    id: string;
    name: string;
  };
  partner_company?: {
    id: string;
    name: string;
  };
}

export interface ConversationParticipantWithProfile extends ConversationParticipant {
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  };
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface MessageWithSender extends Message {
  sender_profile?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  };
  sender_driver?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reply_to?: Message;
}

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface CreateConversationRequest {
  type: ConversationType;
  load_id?: string;
  trip_id?: string;
  partner_company_id?: string;
  title?: string;
  initial_participants?: {
    user_id?: string;
    driver_id?: string;
    role: ConversationParticipantRole;
    can_read?: boolean;
    can_write?: boolean;
  }[];
}

export interface CreateConversationResponse {
  conversation: Conversation;
  participants: ConversationParticipant[];
}

export interface SendMessageRequest {
  conversation_id: string;
  body: string;
  message_type?: MessageType;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  reply_to_message_id?: string;
}

export interface SendMessageResponse {
  message: Message;
}

export interface GetConversationMessagesRequest {
  conversation_id: string;
  limit?: number;
  before?: string; // Cursor for pagination (message id or timestamp)
  after?: string;
}

export interface GetConversationMessagesResponse {
  messages: MessageWithSender[];
  has_more: boolean;
  next_cursor?: string;
}

export interface UpdateDriverVisibilityRequest {
  load_id: string;
  driver_visibility: DriverVisibilityLevel;
  driver_id?: string;
}

export interface AddParticipantRequest {
  conversation_id: string;
  user_id?: string;
  driver_id?: string;
  role: ConversationParticipantRole;
  can_read?: boolean;
  can_write?: boolean;
}

export interface RemoveParticipantRequest {
  conversation_id: string;
  user_id?: string;
  driver_id?: string;
}

export interface MarkConversationReadRequest {
  conversation_id: string;
}

// ----------------------------------------------------------------------------
// UI State Types
// ----------------------------------------------------------------------------

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  title: string; // Computed display title
  subtitle: string; // Load number, trip number, or company name
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_muted: boolean;
  participants_preview: {
    name: string;
    avatar_url?: string;
  }[];
  context?: {
    load_id?: string;
    load_number?: string;
    trip_id?: string;
    trip_number?: string;
    partner_name?: string;
  };
}

export interface ChatViewState {
  conversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  is_loading: boolean;
  is_sending: boolean;
  error: string | null;
  can_write: boolean;
  is_read_only: boolean;
}

export interface DriverVisibilityOption {
  value: DriverVisibilityLevel;
  label: string;
  description: string;
  icon: string; // Emoji or icon name
}

export const DRIVER_VISIBILITY_OPTIONS: DriverVisibilityOption[] = [
  {
    value: 'none',
    label: 'Hidden',
    description: 'Driver cannot see partner messages',
    icon: '🚫',
  },
  {
    value: 'read_only',
    label: 'Read-only',
    description: 'Driver can see but not reply to partner',
    icon: '👁️',
  },
  {
    value: 'full',
    label: 'Full access',
    description: 'Driver can see and reply to partner',
    icon: '💬',
  },
];

// ----------------------------------------------------------------------------
// Event Types (for real-time subscriptions)
// ----------------------------------------------------------------------------

export interface ConversationEvent {
  type: 'message_created' | 'message_updated' | 'message_deleted' | 'participant_added' | 'participant_removed' | 'conversation_updated';
  conversation_id: string;
  payload: unknown;
}

export interface MessageCreatedEvent extends ConversationEvent {
  type: 'message_created';
  payload: Message;
}

export interface ParticipantAddedEvent extends ConversationEvent {
  type: 'participant_added';
  payload: ConversationParticipant;
}

// ----------------------------------------------------------------------------
// Permission Check Types
// ----------------------------------------------------------------------------

export interface ConversationPermissions {
  can_read: boolean;
  can_write: boolean;
  can_add_participants: boolean;
  can_remove_participants: boolean;
  can_change_settings: boolean;
  can_archive: boolean;
  is_owner: boolean;
}

export interface LoadCommunicationPermissions {
  can_view_internal: boolean;
  can_view_shared: boolean;
  can_write_internal: boolean;
  can_write_shared: boolean;
  can_change_driver_visibility: boolean;
  driver_visibility: DriverVisibilityLevel;
  is_visibility_locked: boolean;
}

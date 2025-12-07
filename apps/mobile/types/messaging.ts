// ============================================================================
// MOVEBOSS MOBILE - MESSAGING TYPES
// ============================================================================

// Conversation types
export type ConversationType =
  | 'load_shared'
  | 'load_internal'
  | 'trip_internal'
  | 'company_to_company'
  | 'general';

// Driver visibility levels
export type DriverVisibilityLevel = 'none' | 'read_only' | 'full';

// Participant roles
export type ConversationParticipantRole =
  | 'owner'
  | 'dispatcher'
  | 'driver'
  | 'helper'
  | 'partner_rep'
  | 'broker'
  | 'ai_agent';

// Message types
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

// Conversation
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
}

// Conversation participant
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
  created_at: string;
  updated_at: string;
}

// Message attachment
export interface MessageAttachment {
  type: 'image' | 'document' | 'voice';
  url: string;
  name: string;
  size?: number;
  mime_type?: string;
}

// Message metadata
export interface MessageMetadata {
  ai_model?: string;
  intent?: string;
  confidence?: number;
  context_used?: string[];
  event_type?: string;
  related_ids?: Record<string, string>;
  balance_amount?: number;
  balance_status?: 'pending' | 'verified' | 'disputed';
  latitude?: number;
  longitude?: number;
  address?: string;
  routed_from_conversation?: string;
  route_reason?: string;
}

// Message
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
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
}

// Message with sender info
export interface MessageWithSender extends Message {
  sender_profile?: {
    id: string;
    full_name: string | null;
  };
  sender_driver?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reply_to?: Message;
}

// Conversation list item (for display)
export interface ConversationListItem {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_muted: boolean;
  can_write: boolean;
  context?: {
    load_id?: string;
    load_number?: string;
    trip_id?: string;
    trip_number?: string;
    partner_name?: string;
  };
}

// Chat view state
export interface ChatViewState {
  conversation_id: string | null;
  messages: MessageWithSender[];
  is_loading: boolean;
  is_sending: boolean;
  error: string | null;
  can_write: boolean;
  is_read_only: boolean;
  was_routed: boolean;
  route_reason?: string;
}

// Send message request
export interface SendMessageRequest {
  conversation_id: string;
  body: string;
  message_type?: MessageType;
  attachments?: MessageAttachment[];
  reply_to_message_id?: string;
}

// Helper constants
export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  load_shared: 'Shared',
  load_internal: 'Team',
  trip_internal: 'Trip',
  company_to_company: 'Partner',
  general: 'General',
};

export const CONVERSATION_TYPE_COLORS: Record<ConversationType, string> = {
  load_shared: '#3B82F6', // blue
  load_internal: '#10B981', // green
  trip_internal: '#8B5CF6', // purple
  company_to_company: '#F59E0B', // amber
  general: '#6B7280', // gray
};

// Unified messaging component types

import type { ConversationType, MessageWithSender, ConversationWithDetails } from '@/lib/communication-types';

export type ConversationContext = 'load' | 'trip' | 'company' | 'driver_dispatch';

export interface ChatPanelProps {
  /** Context type for the conversation */
  context: ConversationContext;
  /** Load ID (required for load context) */
  loadId?: string;
  /** Trip ID (required for trip context) */
  tripId?: string;
  /** Driver ID (required for driver_dispatch context) */
  driverId?: string;
  /** User's company ID */
  companyId: string;
  /** Current user ID */
  userId: string;
  /** Partner company ID (for shared/company conversations) */
  partnerCompanyId?: string;
  /** Partner company name for display */
  partnerCompanyName?: string;
  /** Whether this is an internal vs shared conversation */
  isInternal?: boolean;
  /** Whether the partner is a MoveBoss member (for company-to-company) */
  isPartnerMoveBossMember?: boolean;
  /** Optional height constraint */
  height?: string | number;
  /** Whether to show minimal header */
  minimal?: boolean;
  /** Optional: use existing conversation ID instead of creating/fetching */
  conversationId?: string;
  /** Callback when conversation changes */
  onConversationChange?: (conversation: ConversationWithDetails | null) => void;
}

export interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  isLoading: boolean;
  emptyMessage?: string;
  onScrollToBottom?: () => void;
}

export interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  showSender?: boolean;
}

export interface MessageComposerProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  isSending?: boolean;
}

export interface ConversationListItemProps {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isSelected?: boolean;
  onClick: () => void;
}

export interface ConversationListProps {
  conversations: ConversationListItemProps[];
  isLoading: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyMessage?: string;
}

// Computed state from conversation API
export interface ChatState {
  conversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
  canWrite: boolean;
  isReadOnly: boolean;
}

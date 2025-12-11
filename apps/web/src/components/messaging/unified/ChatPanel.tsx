'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare, Users, Globe, Building2, Route, Loader2, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageList } from './MessageList';
import { MessageComposer, ReadOnlyComposer } from './MessageComposer';
import type { ChatPanelProps, ChatState } from './types';
import type { ConversationType, ConversationWithDetails, MessageWithSender } from '@/lib/communication-types';
import { createClient } from '@/lib/supabase-client';

/**
 * Unified ChatPanel component.
 *
 * This is the main entry point for all messaging across the platform.
 * It handles:
 * - Loading/creating conversations based on context
 * - Displaying messages with unified styling
 * - Sending messages
 * - Read-only states
 * - Error handling
 *
 * The conversation is created/fetched once on mount using a stable ref
 * to prevent RLS recursion issues from repeated API calls.
 */
export function ChatPanel({
  context,
  loadId,
  tripId,
  driverId,
  companyId,
  userId,
  partnerCompanyId,
  partnerCompanyName,
  isInternal = true,
  isPartnerMoveBossMember = true,
  height = '500px',
  minimal = false,
  onConversationChange,
}: ChatPanelProps) {
  // State
  const [state, setState] = useState<ChatState>({
    conversation: null,
    messages: [],
    isLoading: true,
    isLoadingMessages: false,
    isSending: false,
    error: null,
    canWrite: true,
    isReadOnly: false,
  });

  // Refs for preventing duplicate fetches
  const conversationFetchedRef = useRef(false);
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Compute conversation type based on context
  const conversationType: ConversationType = useMemo(() => {
    switch (context) {
      case 'load':
        return isInternal ? 'load_internal' : 'load_shared';
      case 'trip':
        return 'trip_internal';
      case 'company':
        return 'company_to_company';
      case 'driver_dispatch':
        return 'driver_dispatch';
      default:
        return 'general';
    }
  }, [context, isInternal]);

  // For company context, check if partner is a MoveBoss member
  if (context === 'company' && !isPartnerMoveBossMember) {
    return (
      <div
        className={cn(
          'flex flex-col border rounded-lg bg-card overflow-hidden',
          typeof height === 'string' ? `h-[${height}]` : ''
        )}
        style={typeof height === 'number' ? { height } : undefined}
      >
        {!minimal && <ChatHeader type="company_to_company" title={partnerCompanyName || 'Partner'} />}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Info className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Messaging Not Available</h3>
            <p className="text-sm text-muted-foreground">
              {partnerCompanyName || 'This company'} is not a MoveBoss member.
              Please contact them through email, phone, or other external channels.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch or create conversation - only runs once
  const fetchConversation = useCallback(async () => {
    if (conversationFetchedRef.current) return;
    conversationFetchedRef.current = true;

    try {
      setState(s => ({ ...s, isLoading: true, error: null }));

      // Build request body based on context
      const body: Record<string, string> = { type: conversationType };

      if (context === 'load' && loadId) {
        body.load_id = loadId;
        if (!isInternal && partnerCompanyId) {
          body.partner_company_id = partnerCompanyId;
        }
      } else if (context === 'trip' && tripId) {
        body.trip_id = tripId;
      } else if (context === 'company' && partnerCompanyId) {
        body.partner_company_id = partnerCompanyId;
      } else if (context === 'driver_dispatch' && driverId) {
        body.driver_id = driverId;
      }

      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to load conversation');
      }

      const { conversation } = await res.json();

      if (!mountedRef.current) return;

      setState(s => ({
        ...s,
        conversation,
        isLoading: false,
      }));

      onConversationChange?.(conversation);
    } catch (err) {
      if (!mountedRef.current) return;
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load conversation',
      }));
    }
  }, [context, loadId, tripId, partnerCompanyId, conversationType, isInternal, onConversationChange]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const conversationId = state.conversation?.id;
    if (!conversationId) return;

    try {
      setState(s => ({ ...s, isLoadingMessages: true }));

      const res = await fetch(`/api/messaging/messages?conversation_id=${conversationId}`);
      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      const { messages } = await res.json();

      if (!mountedRef.current) return;

      setState(s => ({
        ...s,
        messages: messages || [],
        isLoadingMessages: false,
      }));
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Failed to fetch messages:', err);
      setState(s => ({ ...s, isLoadingMessages: false }));
    }
  }, [state.conversation?.id]);

  // Send message
  const sendMessage = useCallback(async (body: string) => {
    const conversationId = state.conversation?.id;
    if (!conversationId || !body.trim()) return;

    try {
      setState(s => ({ ...s, isSending: true }));

      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send message');
      }

      if (!mountedRef.current) return;

      // Optimistically add message to state (real-time will update it with full data)
      const optimisticMessage: MessageWithSender = {
        id: 'temp-' + Date.now(), // Temporary ID
        conversation_id: conversationId,
        sender_user_id: null, // Will be set by server
        sender_driver_id: null,
        sender_company_id: null,
        message_type: 'text',
        body: body.trim(),
        attachments: [],
        metadata: {},
        reply_to_message_id: null,
        is_edited: false,
        edited_at: null,
        original_body: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by_user_id: null,
        created_at: new Date().toISOString(),
        sender_profile: undefined,
        sender_driver: undefined,
      };

      setState(s => ({
        ...s,
        messages: [...s.messages, optimisticMessage],
      }));

      // Refetch messages to get the real message with ID
      await fetchMessages();
    } catch (err) {
      if (!mountedRef.current) return;
      setState(s => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to send message',
      }));
    } finally {
      if (mountedRef.current) {
        setState(s => ({ ...s, isSending: false }));
      }
    }
  }, [state.conversation?.id, fetchMessages]);

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchConversation();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchConversation]);

  // Fetch messages when conversation is loaded
  useEffect(() => {
    if (state.conversation?.id) {
      fetchMessages();
    }
  }, [state.conversation?.id, fetchMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    const conversationId = state.conversation?.id;
    if (!conversationId) {
      console.log('⚠️ Web: No conversationId, skipping subscription setup');
      return;
    }

    console.log('🔌 Web: Setting up realtime subscription for:', conversationId, 'Supabase client:', !!supabase);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Web: Cleaning up existing subscription');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${conversationId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('🔔🔔🔔 Web: Realtime INSERT received!', {
            messageId: payload.new.id,
            conversationId: payload.new.conversation_id,
            ourConversationId: conversationId,
            senderUserId: payload.new.sender_user_id,
            senderDriverId: payload.new.sender_driver_id,
            body: payload.new.body?.substring(0, 50),
            fullPayload: payload.new,
          });
          
          // Verify this message is for our conversation
          if (payload.new.conversation_id !== conversationId) {
            console.log('⚠️ Web: Message conversation ID mismatch:', payload.new.conversation_id, 'vs', conversationId);
            return;
          }
          
          console.log('✅ Web: Message conversation ID matches, processing...');

          // Fetch the full message with sender info
          console.log('🔍 Web: Fetching message details for:', payload.new.id);
          const { data: newMsg, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender_driver:sender_driver_id (
                id,
                first_name,
                last_name
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('❌ Web: Failed to fetch new message:', error);
            console.error('❌ Web: Error details:', JSON.stringify(error, null, 2));
            // Try to add message with payload data directly as fallback
            console.log('🔄 Web: Attempting fallback - using payload data directly');
            const fallbackMessage: MessageWithSender = {
              ...payload.new as any,
              sender_profile: undefined,
              sender_driver: undefined,
            };
            setState((prev) => {
              const exists = prev.messages.some(m => m.id === fallbackMessage.id);
              if (exists) return prev;
              console.log('✅ Web: Adding message via fallback');
              return {
                ...prev,
                messages: [...prev.messages, fallbackMessage],
              };
            });
            return;
          }
          
          console.log('✅ Web: Message fetched successfully:', newMsg.id);

          if (newMsg) {
            // Get sender profile if it's a user message
            let senderProfile: { id: string; full_name: string | null } | undefined;
            if (newMsg.sender_user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', newMsg.sender_user_id)
                .maybeSingle();

              if (profile) {
                senderProfile = {
                  id: profile.id,
                  full_name: profile.full_name || profile.email || 'Unknown',
                };
              }
            }

            const senderDriver = Array.isArray(newMsg.sender_driver)
              ? newMsg.sender_driver[0]
              : newMsg.sender_driver;

            const formatted: MessageWithSender = {
              ...newMsg,
              sender_profile: senderProfile,
              sender_driver: senderDriver ?? undefined,
            };

            // Add message to state if it doesn't already exist
            setState((prev) => {
              const exists = prev.messages.some(m => m.id === formatted.id);
              if (exists) {
                console.log('⚠️ Web: Message already exists, skipping:', formatted.id, 'Current message count:', prev.messages.length);
                return prev;
              }
              console.log('✅✅✅ Web: Adding new message to state:', formatted.id, 'Previous count:', prev.messages.length, 'New count:', prev.messages.length + 1);
              console.log('✅ Web: Message details:', {
                id: formatted.id,
                body: formatted.body?.substring(0, 50),
                senderDriver: formatted.sender_driver,
                senderProfile: formatted.sender_profile,
              });
              const newState = {
                ...prev,
                messages: [...prev.messages, formatted],
              };
              console.log('✅ Web: State updated, new message count:', newState.messages.length);
              return newState;
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Web: Realtime subscription status:', status, err ? `Error: ${JSON.stringify(err)}` : '', 'Channel:', `messages:${conversationId}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Web: Realtime subscription SUBSCRIBED successfully for:', conversationId);
          // Test: Try to manually check if we can receive events
          console.log('🧪 Web: Subscription test - listening for INSERT events on messages table');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' || err) {
          console.error('❌ Web: Realtime subscription error:', status, err);
          console.error('❌ Web: Error details:', JSON.stringify(err, null, 2));
        } else {
          console.log('⚠️ Web: Unexpected subscription status:', status);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Web: Cleaning up realtime subscription for:', conversationId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      channel.unsubscribe();
    };
  }, [state.conversation?.id]); // Removed supabase from deps since it's stable via ref

  // Compute title
  const title = useMemo(() => {
    if (state.conversation?.title) return state.conversation.title;

    switch (context) {
      case 'load':
        return isInternal ? 'Team Chat' : 'Shared Chat';
      case 'trip':
        return 'Trip Chat';
      case 'company':
        return partnerCompanyName || 'Company Chat';
      default:
        return 'Chat';
    }
  }, [context, isInternal, partnerCompanyName, state.conversation?.title]);

  // Error state
  if (state.error && !state.conversation) {
    return (
      <div
        className={cn(
          'flex flex-col border rounded-lg bg-card overflow-hidden',
          typeof height === 'string' ? `h-[${height}]` : ''
        )}
        style={typeof height === 'number' ? { height } : undefined}
      >
        {!minimal && <ChatHeader type={conversationType} title={title} />}
        <div className="flex-1 flex items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg bg-card overflow-hidden',
        typeof height === 'string' ? `h-[${height}]` : ''
      )}
      style={typeof height === 'number' ? { height } : undefined}
    >
      {/* Header */}
      {!minimal && (
        <ChatHeader
          type={conversationType}
          title={title}
          subtitle={getSubtitle(context, isInternal, partnerCompanyName)}
          messageCount={state.conversation?.message_count}
        />
      )}

      {/* Inline error */}
      {state.error && state.conversation && (
        <Alert variant="destructive" className="mx-3 mt-2 py-2">
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <MessageList
        messages={state.messages}
        currentUserId={userId}
        isLoading={state.isLoading || state.isLoadingMessages}
        emptyMessage={`No messages in this ${context} chat yet`}
      />

      {/* Composer */}
      {state.canWrite && !state.isReadOnly ? (
        <MessageComposer
          onSend={sendMessage}
          disabled={state.isLoading || !state.conversation}
          isSending={state.isSending}
          placeholder="Type a message..."
        />
      ) : (
        <ReadOnlyComposer />
      )}
    </div>
  );
}

/**
 * Chat header component
 */
function ChatHeader({
  type,
  title,
  subtitle,
  messageCount,
}: {
  type: ConversationType;
  title: string;
  subtitle?: string;
  messageCount?: number;
}) {
  return (
    <div className="px-4 py-3 border-b bg-background/50">
      <div className="flex items-center gap-3">
        <ConversationIcon type={type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            {messageCount !== undefined && messageCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {messageCount}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Conversation type icon
 */
function ConversationIcon({ type }: { type: ConversationType }) {
  const className = 'h-5 w-5 text-muted-foreground';

  switch (type) {
    case 'load_internal':
    case 'trip_internal':
      return <Users className={className} />;
    case 'load_shared':
      return <Globe className={className} />;
    case 'company_to_company':
      return <Building2 className={className} />;
    default:
      return <MessageSquare className={className} />;
  }
}

/**
 * Get subtitle based on context
 */
function getSubtitle(context: string, isInternal: boolean, partnerName?: string): string {
  switch (context) {
    case 'load':
      return isInternal ? 'Internal team discussion' : `Shared with ${partnerName || 'partner'}`;
    case 'trip':
      return 'Trip coordination';
    case 'company':
      return 'Company-to-company chat';
    default:
      return '';
  }
}

export default ChatPanel;

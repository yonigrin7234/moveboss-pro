import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import {
  ConversationListItem,
  MessageWithSender,
  ConversationType,
  SendMessageRequest,
  ChatViewState,
} from '../types/messaging';
import { dataLogger } from '../lib/logger';

// ============================================================================
// DRIVER CONVERSATIONS HOOK
// ============================================================================

interface UseDriverConversationsOptions {
  type?: ConversationType;
  loadId?: string;
  tripId?: string;
  limit?: number;
}

export function useDriverConversations(options: UseDriverConversationsOptions = {}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id || isFetching.current) return;

    try {
      isFetching.current = true;
      setError(null);

      // First get the driver record
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        setConversations([]);
        return;
      }

      // Build query for conversations the driver is a participant of
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
        .eq('conversation_participants.driver_id', driver.id)
        .eq('conversation_participants.can_read', true)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.loadId) {
        query = query.eq('load_id', options.loadId);
      }

      if (options.tripId) {
        query = query.eq('trip_id', options.tripId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Transform to ConversationListItem
      const items: ConversationListItem[] = (data ?? []).map((conv) => {
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

        return {
          id: conv.id,
          type: conv.type as ConversationType,
          title,
          subtitle,
          last_message_preview: conv.last_message_preview,
          last_message_at: conv.last_message_at,
          unread_count: participant?.unread_count ?? 0,
          is_muted: conv.is_muted || participant?.is_muted || false,
          can_write: participant?.can_write ?? false,
          context: {
            load_id: load?.id,
            load_number: load?.load_number,
            trip_id: trip?.id,
            trip_number: trip?.trip_number,
          },
        };
      });

      setConversations(items);
      dataLogger.info(`Loaded ${items.length} conversations for driver`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      dataLogger.error('Conversations fetch failed', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user?.id, options.type, options.loadId, options.tripId, options.limit]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const refetch = useCallback(() => {
    isFetching.current = false;
    fetchConversations();
  }, [fetchConversations]);

  return useMemo(
    () => ({ conversations, loading, error, refetch }),
    [conversations, loading, error, refetch]
  );
}

// ============================================================================
// CONVERSATION MESSAGES HOOK
// ============================================================================

interface UseConversationMessagesOptions {
  limit?: number;
}

export function useConversationMessages(
  conversationId: string | null,
  options: UseConversationMessagesOptions = {}
) {
  const { user } = useAuth();
  const [state, setState] = useState<ChatViewState>({
    conversation_id: conversationId,
    messages: [],
    is_loading: true,
    is_sending: false,
    error: null,
    can_write: false,
    is_read_only: false,
    was_routed: false,
  });
  const isFetching = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id || isFetching.current) return;

    try {
      isFetching.current = true;
      setState((prev) => ({ ...prev, is_loading: true, error: null }));

      // Get driver ID
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      // Check driver's participation
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('can_read, can_write')
        .eq('conversation_id', conversationId)
        .eq('driver_id', driver?.id)
        .single();

      if (!participant?.can_read) {
        setState((prev) => ({
          ...prev,
          is_loading: false,
          error: 'You do not have access to this conversation',
        }));
        return;
      }

      // Fetch messages (without sender_user_id join since it references auth.users which PostgREST can't access)
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_driver:sender_driver_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(options.limit ?? 100);

      // If there are messages from users (not drivers), fetch their profiles separately
      const userIds = [...new Set((messages ?? []).map(m => m.sender_user_id).filter(Boolean))] as string[];
      let profilesMap = new Map<string, { id: string; full_name: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          profiles.forEach(p => profilesMap.set(p.id, p));
        }
      }

      if (msgError) {
        throw msgError;
      }

      const formattedMessages: MessageWithSender[] = (messages ?? []).map((msg) => {
        const senderDriver = Array.isArray(msg.sender_driver)
          ? msg.sender_driver[0]
          : msg.sender_driver;
        const senderProfile = msg.sender_user_id ? profilesMap.get(msg.sender_user_id) : undefined;

        return {
          ...msg,
          sender_profile: senderProfile ?? undefined,
          sender_driver: senderDriver ?? undefined,
        };
      });

      setState((prev) => ({
        ...prev,
        messages: formattedMessages,
        is_loading: false,
        can_write: participant.can_write,
        is_read_only: !participant.can_write,
      }));

      // Mark conversation as read
      await supabase
        .from('conversation_participants')
        .update({ unread_count: 0, last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('driver_id', driver?.id);

      dataLogger.info(`Loaded ${formattedMessages.length} messages`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      dataLogger.error('Messages fetch failed', err);
      setState((prev) => ({ ...prev, is_loading: false, error: errorMessage }));
    } finally {
      isFetching.current = false;
    }
  }, [conversationId, user?.id, options.limit]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          dataLogger.debug('New message received', payload);

          // Fetch the full message with sender info (without sender_user_id join)
          const { data: newMsg } = await supabase
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

          if (newMsg) {
            const senderDriver = Array.isArray(newMsg.sender_driver)
              ? newMsg.sender_driver[0]
              : newMsg.sender_driver;

            // Fetch profile separately if sender is a user
            let senderProfile: { id: string; full_name: string | null } | undefined;
            if (newMsg.sender_user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', newMsg.sender_user_id)
                .single();
              senderProfile = profile ?? undefined;
            }

            const formatted: MessageWithSender = {
              ...newMsg,
              sender_profile: senderProfile ?? undefined,
              sender_driver: senderDriver ?? undefined,
            };

            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, formatted],
            }));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message function
  const sendMessage = useCallback(
    async (body: string, replyToId?: string) => {
      if (!conversationId || !user?.id) return null;

      try {
        setState((prev) => ({ ...prev, is_sending: true, error: null }));

        // Get driver ID
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!driver) {
          throw new Error('Driver profile not found');
        }

        // Check if we need to route the message (read-only on shared)
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('can_write')
          .eq('conversation_id', conversationId)
          .eq('driver_id', driver.id)
          .single();

        let targetConversationId = conversationId;
        let wasRouted = false;
        let routeReason: string | undefined;

        if (!participant?.can_write) {
          // Driver is read-only - route to internal conversation
          const { data: conv } = await supabase
            .from('conversations')
            .select('load_id, owner_company_id')
            .eq('id', conversationId)
            .single();

          if (conv?.load_id) {
            // Find or get the internal conversation
            const { data: internalConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('load_id', conv.load_id)
              .eq('type', 'load_internal')
              .eq('owner_company_id', conv.owner_company_id)
              .single();

            if (internalConv) {
              targetConversationId = internalConv.id;
              wasRouted = true;
              routeReason = 'Message sent to internal team chat (you have read-only access to shared chat)';
            }
          }
        }

        // Get company ID from conversation
        const { data: convData } = await supabase
          .from('conversations')
          .select('owner_company_id')
          .eq('id', targetConversationId)
          .single();

        // Send the message
        const { data: message, error: sendError } = await supabase
          .from('messages')
          .insert({
            conversation_id: targetConversationId,
            sender_driver_id: driver.id,
            sender_company_id: convData?.owner_company_id,
            body,
            message_type: 'text',
            reply_to_message_id: replyToId,
            metadata: wasRouted
              ? { routed_from_conversation: conversationId, route_reason: routeReason }
              : {},
          })
          .select()
          .single();

        if (sendError) {
          throw sendError;
        }

        setState((prev) => ({
          ...prev,
          is_sending: false,
          was_routed: wasRouted,
          route_reason: routeReason,
        }));

        dataLogger.info('Message sent successfully');
        return message;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        dataLogger.error('Send message failed', err);
        setState((prev) => ({ ...prev, is_sending: false, error: errorMessage }));
        return null;
      }
    },
    [conversationId, user?.id]
  );

  const refetch = useCallback(() => {
    isFetching.current = false;
    fetchMessages();
  }, [fetchMessages]);

  return useMemo(
    () => ({
      ...state,
      sendMessage,
      refetch,
    }),
    [state, sendMessage, refetch]
  );
}

// ============================================================================
// LOAD CONVERSATIONS HOOK (for load detail screen)
// ============================================================================

export function useLoadConversations(loadId: string | null) {
  const { user } = useAuth();
  const [internalConversation, setInternalConversation] = useState<ConversationListItem | null>(null);
  const [sharedConversation, setSharedConversation] = useState<ConversationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!loadId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get driver ID
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!driver) {
        setError('Driver profile not found');
        setLoading(false);
        return;
      }

      // Fetch conversations for this load that the driver has access to
      const { data: conversations, error: queryError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          owner_company_id,
          load_id,
          title,
          is_muted,
          last_message_at,
          last_message_preview,
          message_count,
          loads:load_id (
            id,
            load_number,
            pickup_city,
            delivery_city
          ),
          conversation_participants!inner (
            can_read,
            can_write,
            unread_count
          )
        `)
        .eq('load_id', loadId)
        .eq('conversation_participants.driver_id', driver.id)
        .eq('conversation_participants.can_read', true);

      if (queryError) {
        throw queryError;
      }

      for (const conv of conversations ?? []) {
        const participant = Array.isArray(conv.conversation_participants)
          ? conv.conversation_participants[0]
          : conv.conversation_participants;
        const load = Array.isArray(conv.loads) ? conv.loads[0] : conv.loads;

        const item: ConversationListItem = {
          id: conv.id,
          type: conv.type as ConversationType,
          title: conv.type === 'load_shared' ? 'Shared Chat' : 'Team Chat',
          subtitle: load ? `${load.pickup_city ?? ''} → ${load.delivery_city ?? ''}` : '',
          last_message_preview: conv.last_message_preview,
          last_message_at: conv.last_message_at,
          unread_count: participant?.unread_count ?? 0,
          is_muted: conv.is_muted,
          can_write: participant?.can_write ?? false,
          context: {
            load_id: load?.id,
            load_number: load?.load_number,
          },
        };

        if (conv.type === 'load_internal') {
          setInternalConversation(item);
        } else if (conv.type === 'load_shared') {
          setSharedConversation(item);
        }
      }

      dataLogger.info(`Loaded conversations for load ${loadId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      dataLogger.error('Load conversations fetch failed', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadId, user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return useMemo(
    () => ({
      internalConversation,
      sharedConversation,
      loading,
      error,
      refetch: fetchConversations,
    }),
    [internalConversation, sharedConversation, loading, error, fetchConversations]
  );
}

// ============================================================================
// DISPATCH CONVERSATION HOOK (for direct driver-dispatch messaging)
// ============================================================================

export function useDispatchConversation() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchOrCreateConversation = useCallback(async () => {
    if (!user?.id || isFetching.current) return;

    try {
      isFetching.current = true;
      setError(null);
      setLoading(true);

      // Get driver ID and company
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, company_id, first_name, last_name')
        .eq('auth_user_id', user.id)
        .single();

      dataLogger.info('Driver lookup:', { driver: driver?.id, error: driverError?.message });

      if (driverError || !driver) {
        setError('Driver profile not found');
        setLoading(false);
        return;
      }

      // Check for existing driver_dispatch conversation
      // First try to find by driver_id on conversation (works even without participant)
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id, type, owner_company_id, driver_id, title, is_muted, last_message_at, last_message_preview, message_count')
        .eq('type', 'driver_dispatch')
        .eq('driver_id', driver.id)
        .eq('owner_company_id', driver.company_id)
        .maybeSingle();

      dataLogger.info('Dispatch conversation check:', { existingConv, convError });

      // If conversation exists, check for participant separately
      let existing: typeof existingConv & { conversation_participants?: { can_read: boolean; can_write: boolean; unread_count: number } | null } | null = null;

      if (existingConv) {
        // Check if driver has a participant record
        const { data: participant, error: partError } = await supabase
          .from('conversation_participants')
          .select('can_read, can_write, unread_count')
          .eq('conversation_id', existingConv.id)
          .eq('driver_id', driver.id)
          .maybeSingle();

        dataLogger.info('Participant check:', { participant, partError });

        if (!participant) {
          // No participant record - need to create one
          dataLogger.info('Creating missing participant record for driver');
          const { error: insertError } = await supabase.from('conversation_participants').insert({
            conversation_id: existingConv.id,
            driver_id: driver.id,
            company_id: driver.company_id,
            role: 'driver',
            can_read: true,
            can_write: true,
            is_driver: true,
          });

          if (insertError) {
            dataLogger.error('Failed to create participant:', insertError);
          } else {
            existing = {
              ...existingConv,
              conversation_participants: { can_read: true, can_write: true, unread_count: 0 },
            };
          }
        } else {
          existing = {
            ...existingConv,
            conversation_participants: participant,
          };
        }
      }

      if (existing) {
        const participant = Array.isArray(existing.conversation_participants)
          ? existing.conversation_participants[0]
          : existing.conversation_participants;

        setConversation({
          id: existing.id,
          type: 'driver_dispatch',
          title: existing.title || 'Dispatch',
          subtitle: 'Direct message with dispatch',
          last_message_preview: existing.last_message_preview,
          last_message_at: existing.last_message_at,
          unread_count: participant?.unread_count ?? 0,
          is_muted: existing.is_muted || false,
          can_write: participant?.can_write ?? true,
        });
        dataLogger.info('Found existing dispatch conversation');
      } else {
        // Create new conversation
        const driverName = `${driver.first_name} ${driver.last_name}`;
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            type: 'driver_dispatch',
            owner_company_id: driver.company_id,
            driver_id: driver.id,
            title: `${driverName} - Dispatch`,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Add driver as participant
        await supabase.from('conversation_participants').insert({
          conversation_id: newConv.id,
          driver_id: driver.id,
          company_id: driver.company_id,
          role: 'driver',
          can_read: true,
          can_write: true,
          is_driver: true,
        });

        setConversation({
          id: newConv.id,
          type: 'driver_dispatch',
          title: 'Dispatch',
          subtitle: 'Direct message with dispatch',
          last_message_preview: null,
          last_message_at: null,
          unread_count: 0,
          is_muted: false,
          can_write: true,
        });
        dataLogger.info('Created new dispatch conversation');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dispatch conversation';
      dataLogger.error('Dispatch conversation fetch failed', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrCreateConversation();
  }, [fetchOrCreateConversation]);

  return useMemo(
    () => ({
      conversation,
      loading,
      error,
      refetch: fetchOrCreateConversation,
    }),
    [conversation, loading, error, fetchOrCreateConversation]
  );
}

// ============================================================================
// TOTAL UNREAD COUNT HOOK
// ============================================================================

export function useTotalUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      // Get driver ID
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!driver) return;

      // Sum up unread counts
      const { data } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('driver_id', driver.id)
        .eq('can_read', true);

      const total = (data ?? []).reduce((sum, p) => sum + (p.unread_count ?? 0), 0);
      setUnreadCount(total);
    };

    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return unreadCount;
}

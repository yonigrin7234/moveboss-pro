/**
 * Owner/Dispatcher Messaging Hooks
 * For users (not drivers) to access conversations
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useOwner } from '../providers/OwnerProvider';
import {
  ConversationListItem,
  MessageWithSender,
  ConversationType,
  ChatViewState,
} from '../types/messaging';

// ============================================================================
// OWNER CONVERSATIONS HOOK
// ============================================================================

interface UseOwnerConversationsOptions {
  type?: ConversationType;
  loadId?: string;
  tripId?: string;
  driverId?: string;
  limit?: number;
}

export function useOwnerConversations(options: UseOwnerConversationsOptions = {}) {
  const { user } = useAuth();
  const { company } = useOwner();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id || !company?.id || isFetching.current) return;

    try {
      isFetching.current = true;
      setError(null);

      // Build query for conversations owned by this company
      let query = supabase
        .from('conversations')
        .select(`
          id,
          type,
          owner_company_id,
          load_id,
          trip_id,
          driver_id,
          partner_company_id,
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
          drivers:driver_id (
            id,
            first_name,
            last_name
          ),
          partner:partner_company_id (
            id,
            name
          ),
          conversation_participants!inner (
            id,
            user_id,
            can_read,
            can_write,
            unread_count,
            is_muted
          )
        `)
        .eq('owner_company_id', company.id)
        .eq('conversation_participants.user_id', user.id)
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

      if (options.driverId) {
        query = query.eq('driver_id', options.driverId);
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
        const driver = Array.isArray(conv.drivers) ? conv.drivers[0] : conv.drivers;
        const partner = Array.isArray(conv.partner) ? conv.partner[0] : conv.partner;

        let title = conv.title ?? '';
        let subtitle = '';

        switch (conv.type as ConversationType) {
          case 'load_shared':
            title = title || `${load?.load_number ?? 'Load'} - Shared`;
            subtitle = partner?.name || (load ? `${load.pickup_city ?? ''} → ${load.delivery_city ?? ''}` : '');
            break;
          case 'load_internal':
            title = title || `${load?.load_number ?? 'Load'} - Team`;
            subtitle = load ? `${load.pickup_city ?? ''} → ${load.delivery_city ?? ''}` : '';
            break;
          case 'trip_internal':
            title = title || `Trip ${trip?.trip_number ?? ''}`;
            subtitle = driver ? `${driver.first_name} ${driver.last_name}` : 'Team Chat';
            break;
          case 'company_to_company':
            title = title || partner?.name || 'Partner';
            subtitle = 'Company Chat';
            break;
          case 'driver_dispatch':
            title = title || (driver ? `${driver.first_name} ${driver.last_name}` : 'Driver');
            subtitle = 'Direct Message';
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
          can_write: participant?.can_write ?? true,
          context: {
            load_id: load?.id,
            load_number: load?.load_number,
            trip_id: trip?.id,
            trip_number: trip?.trip_number,
            partner_name: partner?.name,
          },
        };
      });

      setConversations(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user?.id, company?.id, options.type, options.loadId, options.tripId, options.driverId, options.limit]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('owner-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `owner_company_id=eq.${company.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, fetchConversations]);

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
// OWNER CONVERSATION MESSAGES HOOK
// ============================================================================

interface UseOwnerMessagesOptions {
  limit?: number;
}

export function useOwnerMessages(
  conversationId: string | null,
  options: UseOwnerMessagesOptions = {}
) {
  const { user } = useAuth();
  const { company } = useOwner();
  const [state, setState] = useState<ChatViewState>({
    conversation_id: conversationId,
    messages: [],
    is_loading: true,
    is_sending: false,
    error: null,
    can_write: true,
    is_read_only: false,
    was_routed: false,
  });
  const isFetching = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setState((prev) => ({ ...prev, is_loading: true, error: null }));

      // Check participant permissions
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('can_read, can_write')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!participant?.can_read) {
        setState((prev) => ({
          ...prev,
          is_loading: false,
          error: 'You do not have access to this conversation',
        }));
        return;
      }

      // Fetch messages
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

      if (msgError) {
        throw msgError;
      }

      // Get unique sender user IDs
      const userIds = [...new Set((messages ?? []).map(m => m.sender_user_id).filter(Boolean))] as string[];
      const profilesMap = new Map<string, { id: string; full_name: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        (profiles ?? []).forEach(p => {
          const displayName = p.full_name || p.email?.split('@')[0] || 'User';
          profilesMap.set(p.id, { id: p.id, full_name: displayName });
        });
      }

      // Format messages with sender info
      const formattedMessages: MessageWithSender[] = (messages ?? []).map((msg) => {
        const senderDriver = Array.isArray(msg.sender_driver)
          ? msg.sender_driver[0]
          : msg.sender_driver;

        const senderProfile = msg.sender_user_id
          ? profilesMap.get(msg.sender_user_id) ?? { id: msg.sender_user_id, full_name: 'User' }
          : undefined;

        return {
          ...msg,
          sender_profile: senderProfile,
          sender_driver: senderDriver ?? undefined,
        };
      });

      setState((prev) => ({
        ...prev,
        messages: formattedMessages,
        is_loading: false,
        can_write: participant?.can_write ?? true,
        is_read_only: !participant?.can_write,
        error: null,
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setState((prev) => ({
        ...prev,
        is_loading: false,
        error: errorMessage,
      }));
    } finally {
      isFetching.current = false;
    }
  }, [conversationId, user?.id, options.limit]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`owner-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
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

            // Get sender profile if needed
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
                  full_name: profile.full_name || profile.email?.split('@')[0] || 'User'
                };
              }
            }

            const formatted: MessageWithSender = {
              ...newMsg,
              sender_profile: senderProfile,
              sender_driver: senderDriver ?? undefined,
            };

            setState((prev) => {
              const exists = prev.messages.some(m => m.id === formatted.id);
              if (exists) return prev;
              return {
                ...prev,
                messages: [...prev.messages, formatted],
              };
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message function
  const sendMessage = useCallback(
    async (body: string, replyToId?: string) => {
      if (!conversationId || !user?.id || !company?.id) return null;

      try {
        setState((prev) => ({ ...prev, is_sending: true, error: null }));

        // Send the message
        const { data: message, error: sendError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_user_id: user.id,
            sender_company_id: company.id,
            body,
            message_type: 'text',
            reply_to_message_id: replyToId,
          })
          .select()
          .single();

        if (sendError) {
          throw sendError;
        }

        // Get user profile for optimistic update
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        const optimisticMessage: MessageWithSender = {
          ...message,
          sender_profile: profile ? {
            id: profile.id,
            full_name: profile.full_name || profile.email?.split('@')[0] || 'You',
          } : { id: user.id, full_name: 'You' },
          sender_driver: undefined,
        };

        setState((prev) => {
          const exists = prev.messages.some(m => m.id === optimisticMessage.id);
          if (exists) {
            return { ...prev, is_sending: false };
          }
          return {
            ...prev,
            messages: [...prev.messages, optimisticMessage],
            is_sending: false,
          };
        });

        // Trigger push notifications
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
          if (apiUrl) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              await fetch(`${apiUrl}/api/messaging/notify-message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  conversation_id: conversationId,
                  sender_user_id: user.id,
                  message_preview: body,
                }),
              }).catch(() => {});
            }
          }
        } catch {
          // Non-critical
        }

        return message;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setState((prev) => ({ ...prev, is_sending: false, error: errorMessage }));
        return null;
      }
    },
    [conversationId, user?.id, company?.id]
  );

  const refetch = useCallback(() => {
    isFetching.current = false;
    fetchMessages();
  }, [fetchMessages]);

  return useMemo(() => ({
    ...state,
    sendMessage,
    refetch,
  }), [state, sendMessage, refetch]);
}

// ============================================================================
// GET OR CREATE CONVERSATION HOOKS
// ============================================================================

export function useGetOrCreateDriverConversation(initialDriverId?: string | null) {
  const { user } = useAuth();
  const { company } = useOwner();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDriverId, setLoadingDriverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getOrCreate = useCallback(async (driverIdParam?: string) => {
    const driverId = driverIdParam || initialDriverId;
    if (!driverId || !user?.id || !company?.id) return null;

    try {
      setLoading(true);
      setLoadingDriverId(driverId);
      setError(null);

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'driver_dispatch')
        .eq('driver_id', driverId)
        .eq('owner_company_id', company.id)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        return existing.id;
      }

      // Get driver name for title
      const { data: driver } = await supabase
        .from('drivers')
        .select('first_name, last_name')
        .eq('id', driverId)
        .single();

      const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'driver_dispatch',
          owner_company_id: company.id,
          driver_id: driverId,
          title: `${driverName} - Dispatch`,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add user as participant
      await supabase.from('conversation_participants').insert({
        conversation_id: newConv.id,
        user_id: user.id,
        company_id: company.id,
        role: 'dispatcher',
        can_read: true,
        can_write: true,
        is_driver: false,
      });

      // Add driver as participant
      await supabase.from('conversation_participants').insert({
        conversation_id: newConv.id,
        driver_id: driverId,
        company_id: company.id,
        role: 'driver',
        can_read: true,
        can_write: true,
        is_driver: true,
      });

      setConversationId(newConv.id);
      return newConv.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get/create conversation';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
      setLoadingDriverId(null);
    }
  }, [initialDriverId, user?.id, company?.id]);

  return { conversationId, loading, loadingDriverId, error, getOrCreate };
}

export function useGetOrCreateLoadConversation(loadId: string | null, type: 'load_internal' | 'load_shared' = 'load_internal') {
  const { user } = useAuth();
  const { company } = useOwner();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOrCreate = useCallback(async () => {
    if (!loadId || !user?.id || !company?.id) return null;

    try {
      setLoading(true);
      setError(null);

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', type)
        .eq('load_id', loadId)
        .eq('owner_company_id', company.id)
        .maybeSingle();

      if (existing) {
        // Ensure user is a participant
        await supabase.from('conversation_participants').upsert({
          conversation_id: existing.id,
          user_id: user.id,
          company_id: company.id,
          role: 'dispatcher',
          can_read: true,
          can_write: true,
          is_driver: false,
        }, { onConflict: 'conversation_id,user_id' });

        setConversationId(existing.id);
        return existing.id;
      }

      // Get load number for title
      const { data: load } = await supabase
        .from('loads')
        .select('load_number')
        .eq('id', loadId)
        .single();

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          type,
          owner_company_id: company.id,
          load_id: loadId,
          title: `${load?.load_number || 'Load'} - ${type === 'load_internal' ? 'Team' : 'Shared'}`,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add user as participant
      await supabase.from('conversation_participants').insert({
        conversation_id: newConv.id,
        user_id: user.id,
        company_id: company.id,
        role: 'dispatcher',
        can_read: true,
        can_write: true,
        is_driver: false,
      });

      setConversationId(newConv.id);
      return newConv.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get/create conversation';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadId, type, user?.id, company?.id]);

  return { conversationId, loading, error, getOrCreate };
}

// ============================================================================
// TOTAL UNREAD COUNT HOOK (for owner)
// ============================================================================

export function useOwnerUnreadCount() {
  const { user } = useAuth();
  const { company } = useOwner();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !company?.id) return;

    const fetchUnreadCount = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('user_id', user.id)
        .eq('can_read', true);

      const total = (data ?? []).reduce((sum, p) => sum + (p.unread_count ?? 0), 0);
      setUnreadCount(total);
    };

    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel(`owner-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, company?.id]);

  return unreadCount;
}

// ============================================================================
// MARK CONVERSATION AS READ
// ============================================================================

export function useMarkAsRead() {
  const { user } = useAuth();

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id || !conversationId) return;

    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [user?.id]);

  return markAsRead;
}

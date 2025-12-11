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
  conversationType?: ConversationType;
}

export function useConversationMessages(
  conversationId: string | null,
  options: UseConversationMessagesOptions = {}
) {
  // #region agent log
  useEffect(() => {
    if (conversationId) {
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:useConversationMessages:CONVERSATION_ID',message:'useConversationMessages called with conversationId',data:{conversationId,conversationType:options.conversationType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
  }, [conversationId, options.conversationType]);
  // #endregion
  const { user } = useAuth();
  // IMPORTANT: Default can_write to TRUE for driver apps - drivers should always be able to respond
  // For driver_dispatch, ALWAYS start with can_write: true
  const isDriverDispatchType = options.conversationType === 'driver_dispatch';
  const [state, setState] = useState<ChatViewState>({
    conversation_id: conversationId,
    messages: [],
    is_loading: true,
    is_sending: false,
    error: null,
    can_write: isDriverDispatchType ? true : true, // ALWAYS true, especially for driver_dispatch
    is_read_only: false,
    was_routed: false,
  });
  const isFetching = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const driverIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Use ref to track latest state for real-time callbacks (avoid stale closures)
  const stateRef = useRef(state);
  
  // Keep stateRef updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Helper function to get sender display name
  const getSenderDisplayName = (profile: { full_name?: string | null; email?: string | null } | null | undefined): string => {
    if (!profile) return 'Dispatcher';
    if (profile.full_name && profile.full_name.trim()) return profile.full_name;
    if (profile.email) return profile.email.split('@')[0];
    return 'Dispatcher';
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    if (isFetching.current) {
      dataLogger.debug('fetchMessages skipped - already fetching');
      return;
    }

    try {
      isFetching.current = true;
      setState((prev) => ({ ...prev, is_loading: true, error: null }));

      dataLogger.info('fetchMessages starting', { conversationId, userId: user.id });

      // Get driver ID and company_id
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, company_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        dataLogger.error('Driver lookup failed:', driverError);
        setState((prev) => ({
          ...prev,
          is_loading: false,
          can_write: true, // Still allow writing even if driver lookup fails
          error: null,
        }));
        return;
      }

      driverIdRef.current = driver.id;
      dataLogger.info('Driver found:', { driverId: driver.id, companyId: driver.company_id });

      // Fetch messages directly - don't block on participant check
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

      dataLogger.info('Messages fetched:', { count: messages?.length ?? 0, error: msgError?.message });

      if (msgError) {
        // Even on error, allow writing
        setState((prev) => ({
          ...prev,
          is_loading: false,
          can_write: true,
          error: `Failed to load messages: ${msgError.message}`,
        }));
        return;
      }

      // Get unique sender user IDs (non-driver senders)
      const userIds = [...new Set((messages ?? []).map(m => m.sender_user_id).filter(Boolean))] as string[];
      const profilesMap = new Map<string, { id: string; full_name: string | null }>();

      dataLogger.info('Sender userIds to fetch:', { userIds, driverCompanyId: driver.company_id });

      // For all user senders, default to "Dispatcher" first
      userIds.forEach(id => {
        profilesMap.set(id, { id, full_name: 'Dispatcher' });
      });

      // Try to fetch actual profiles
      if (userIds.length > 0) {
        try {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          dataLogger.info('Profiles fetched:', { profiles, error: profileError?.message });

          if (profiles && profiles.length > 0) {
            profiles.forEach(p => {
              const displayName = getSenderDisplayName(p);
              profilesMap.set(p.id, { id: p.id, full_name: displayName });
            });
          }
        } catch (profileErr) {
          dataLogger.warn('Profile fetch failed, using fallback:', profileErr);
          // Keep the "Dispatcher" fallbacks
        }
      }

      // Format messages with sender info
      const formattedMessages: MessageWithSender[] = (messages ?? []).map((msg) => {
        const senderDriver = Array.isArray(msg.sender_driver)
          ? msg.sender_driver[0]
          : msg.sender_driver;

        // Get profile from map (defaults to "Dispatcher" if not found)
        let senderProfile = msg.sender_user_id
          ? profilesMap.get(msg.sender_user_id) ?? { id: msg.sender_user_id, full_name: 'Dispatcher' }
          : undefined;

        return {
          ...msg,
          sender_profile: senderProfile,
          sender_driver: senderDriver ?? undefined,
        };
      });

      // Update state - ALWAYS set can_write to true for driver_dispatch
      // For driver_dispatch conversations, drivers should ALWAYS be able to write
      const isDriverDispatch = options.conversationType === 'driver_dispatch';
      setState((prev) => {
        // Force can_write to true for driver_dispatch, otherwise keep true (default for drivers)
        const newCanWrite = isDriverDispatch ? true : true; // Always true for mobile app drivers
        return {
          ...prev,
          messages: formattedMessages,
          is_loading: false,
          can_write: newCanWrite,
          is_read_only: false,
          error: null,
        };
      });

      dataLogger.info(`Loaded ${formattedMessages.length} messages, can_write: true`);

      // Try to ensure participant exists (fire and forget, don't block UI)
      supabase.from('conversation_participants')
        .upsert({
          conversation_id: conversationId,
          driver_id: driver.id,
          role: 'driver',
          can_read: true,
          can_write: true,
          is_driver: true,
        }, { onConflict: 'conversation_id,driver_id' })
        .then(({ error }) => {
          if (error) dataLogger.warn('Participant upsert failed:', error);
          else dataLogger.debug('Participant upserted successfully');
        });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      dataLogger.error('Messages fetch failed:', err);
      // Even on error, set can_write to true (especially for driver_dispatch)
      const isDriverDispatch = options.conversationType === 'driver_dispatch';
      setState((prev) => ({
        ...prev,
        is_loading: false,
        can_write: isDriverDispatch ? true : true, // Always true for mobile app drivers
        error: errorMessage
      }));
    } finally {
      isFetching.current = false;
    }
  }, [conversationId, user?.id, options.limit, options.conversationType]);

  // Subscribe to new messages with proper status tracking
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_EFFECT',message:'Realtime subscription effect triggered',data:{conversationId,hasConversationId:!!conversationId,conversationType:options.conversationType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (!conversationId) {
      dataLogger.debug('Realtime subscription skipped - no conversationId');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_SKIPPED',message:'Realtime subscription skipped - no conversationId',data:{conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Clean up existing subscription
    if (subscriptionRef.current) {
      dataLogger.debug('Cleaning up existing subscription');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    dataLogger.info('Setting up realtime subscription for:', conversationId);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_SUBSCRIBE_SETUP',message:'Setting up realtime subscription',data:{conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_INSERT_RECEIVED',message:'Mobile realtime INSERT received',data:{messageId:payload.new.id,payloadConversationId:payload.new.conversation_id,ourConversationId:conversationId,matches:payload.new.conversation_id===conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          dataLogger.info('🔔 Realtime INSERT received:', { messageId: payload.new.id, conversationId: payload.new.conversation_id });
          console.log('🔔 Realtime INSERT received:', payload.new.id, 'for conversation:', payload.new.conversation_id, 'our conversation:', conversationId);
          
          // Verify this message is for our conversation
          const payloadConvId = payload.new.conversation_id;
          if (payloadConvId !== conversationId) {
            dataLogger.warn('Realtime message for different conversation, ignoring:', {
              messageConversationId: payloadConvId,
              ourConversationId: conversationId
            });
            console.log('⚠️ Message conversation ID mismatch:', payloadConvId, 'vs', conversationId);
            return;
          }
          
          console.log('✅ Message conversation ID matches, processing message:', payload.new.id, 'sender_user_id:', payload.new.sender_user_id, 'sender_driver_id:', payload.new.sender_driver_id);

          try {
            // Fetch the full message with sender info
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
              console.error('❌ Error fetching message details:', error);
            }

            if (error) {
              dataLogger.error('Failed to fetch new message:', error);
              return;
            }

            if (newMsg) {
              const senderDriver = Array.isArray(newMsg.sender_driver)
                ? newMsg.sender_driver[0]
                : newMsg.sender_driver;

              // Get sender profile with fallback
              let senderProfile: { id: string; full_name: string | null } | undefined;
              if (newMsg.sender_user_id) {
                // Default to Dispatcher
                senderProfile = { id: newMsg.sender_user_id, full_name: 'Dispatcher' };

                // Try to fetch actual profile
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('id', newMsg.sender_user_id)
                    .maybeSingle();

                  if (profile) {
                    senderProfile = { id: profile.id, full_name: getSenderDisplayName(profile) };
                  }
                } catch {
                  // Keep "Dispatcher" fallback
                }
              }

              const formatted: MessageWithSender = {
                ...newMsg,
                sender_profile: senderProfile,
                sender_driver: senderDriver ?? undefined,
              };

              // Check if message already exists to prevent duplicates
              // Use functional setState to ensure we're working with latest state
              setState((prev) => {
                const exists = prev.messages.some(m => m.id === formatted.id);
                if (exists) {
                  dataLogger.debug('Message already exists, skipping:', formatted.id);
                  console.log('⚠️ Message already exists in state (likely optimistic), skipping:', formatted.id);
                  // Update the existing message with full data (in case optimistic was incomplete)
                  const updatedMessages = prev.messages.map(m => 
                    m.id === formatted.id ? formatted : m
                  );
                  return {
                    ...prev,
                    messages: updatedMessages,
                  };
                }
                dataLogger.info('Adding new message to state:', formatted.id);
                console.log('✅ Adding new message from real-time to state:', formatted.id, 'Previous count:', prev.messages.length, 'New count:', prev.messages.length + 1);
                // Update stateRef immediately for next callback
                const newState = {
                  ...prev,
                  messages: [...prev.messages, formatted],
                };
                stateRef.current = newState;
                return newState;
              });
            }
          } catch (err) {
            dataLogger.error('Error processing realtime message:', err);
          }
        }
      )
      .subscribe(async (status, err) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_SUBSCRIBE_STATUS',message:'Mobile realtime subscription status',data:{status,error:err?.message,conversationId,channelName:`messages:${conversationId}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        dataLogger.info('📡 Realtime subscription status:', status);
        console.log('📡 Realtime subscription status:', status, 'for conversation:', conversationId, err ? `Error: ${err}` : '');
        // If subscription failed, log it
        if (status === 'SUBSCRIBED') {
          dataLogger.info('✅ Realtime subscription active for:', conversationId);
          console.log('✅ Realtime subscription SUBSCRIBED for:', conversationId);
          // Stop polling if subscription succeeds
          if (pollingIntervalRef.current) {
            console.log('✅ Stopping fallback polling - subscription active');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' || err) {
          dataLogger.error('❌ Realtime subscription error:', { status, conversationId, error: err });
          console.error('❌ Realtime subscription error:', status, 'for conversation:', conversationId, err);
          // Only start polling if not already polling (prevent multiple intervals)
          if (!pollingIntervalRef.current) {
            console.log('🔄 Starting fallback polling due to subscription failure');
            pollingIntervalRef.current = setInterval(() => {
              console.log('🔄 Fallback: Refetching messages due to subscription failure');
              fetchMessages();
            }, 10000); // Refetch every 10 seconds if subscription fails (less aggressive)
          }
        }
      });

    subscriptionRef.current = channel;

    // Log subscription attempt
    console.log('🔌 Attempting to subscribe to realtime channel:', `messages:${conversationId}`);

    return () => {
      dataLogger.info('Cleaning up realtime subscription for:', conversationId);
      // Clean up polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      channel.unsubscribe();
    };
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // REMOVED: Aggressive polling fallback - relying on real-time subscription instead
  // Polling is only used as a last resort if subscription fails (see subscription error handler)

  // Send message function
  const sendMessage = useCallback(
    async (body: string, replyToId?: string) => {
      if (!conversationId || !user?.id) {
        console.error('❌ Cannot send message - missing conversationId or user.id', { conversationId, userId: user?.id });
        return null;
      }

      console.log('📤 Sending message:', { body, conversationId, replyToId });

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
        console.log('📤 Inserting message into database:', { 
          targetConversationId, 
          originalConversationId: conversationId,
          driverId: driver.id,
          wasRouted 
        });
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
          console.error('❌ Error sending message:', sendError);
          throw sendError;
        }

        console.log('✅ Message inserted successfully:', message.id, 'to conversation:', targetConversationId);

        // Trigger push notifications for other participants
        // This ensures notifications are sent even when messages are inserted directly (bypassing API route)
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 
            (process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || '');
          
          if (apiUrl) {
            const notifyUrl = `${apiUrl}/api/messaging/notify-message`;
            
            // Get session token for auth
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              await fetch(notifyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  conversation_id: targetConversationId,
                  sender_driver_id: driver.id,
                  sender_user_id: null,
                  message_preview: body,
                }),
              }).catch((err) => {
                console.warn('⚠️ Failed to trigger notifications (non-critical):', err);
              });
            }
          }
        } catch (notifyError) {
          // Non-critical: notifications will be handled by database trigger as fallback
          console.warn('⚠️ Failed to trigger notifications (non-critical):', notifyError);
        }

          // Optimistically add message to local state immediately
        // This ensures the message appears right away, even if real-time is slow
        // IMPORTANT: Only add if message was sent to the CURRENT conversation (not routed)
        if (message && targetConversationId === conversationId) {
          // Get driver info for optimistic message
          const { data: driverData } = await supabase
            .from('drivers')
            .select('id, first_name, last_name')
            .eq('id', driver.id)
            .single();

          const optimisticMessage: MessageWithSender = {
            ...message,
            sender_driver: driverData ? {
              id: driverData.id,
              first_name: driverData.first_name,
              last_name: driverData.last_name,
            } : undefined,
            sender_profile: undefined, // Driver messages don't have user profiles
          };

          setState((prev) => {
            // Check if message already exists (from real-time)
            const exists = prev.messages.some(m => m.id === optimisticMessage.id);
            if (exists) {
              // Message already added by real-time, just update sending state
              console.log('✅ Message already in state (from real-time), updating state only');
              return {
                ...prev,
                is_sending: false,
                was_routed: wasRouted,
                route_reason: routeReason,
              };
            }
            // Add optimistic message
            console.log('✅ Adding optimistic message to state:', optimisticMessage.id, 'Previous count:', prev.messages.length);
            return {
              ...prev,
              messages: [...prev.messages, optimisticMessage],
              is_sending: false,
              was_routed: wasRouted,
              route_reason: routeReason,
            };
          });
        } else {
          // Message was routed to different conversation, don't add optimistically
          console.log('⚠️ Message routed to different conversation, not adding optimistically:', { targetConversationId, conversationId });
          setState((prev) => ({
            ...prev,
            is_sending: false,
            was_routed: wasRouted,
            route_reason: routeReason,
          }));
        }

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

  // Use useMemo with stable options reference
  const conversationTypeRef = useRef(options.conversationType);
  conversationTypeRef.current = options.conversationType;
  
  return useMemo(() => {
    // Ensure can_write is ALWAYS true for driver_dispatch conversations
    const isDriverDispatch = conversationTypeRef.current === 'driver_dispatch';
    
    // ALWAYS force can_write to true for driver_dispatch, no matter what state says
    const finalCanWrite = isDriverDispatch ? true : state.can_write;
    const finalIsReadOnly = isDriverDispatch ? false : state.is_read_only;
    
    // Create new state object if values changed
    const finalState = (finalCanWrite !== state.can_write || finalIsReadOnly !== state.is_read_only)
      ? { ...state, can_write: finalCanWrite, is_read_only: finalIsReadOnly }
      : state;
    
    return {
      ...finalState,
      sendMessage,
      refetch,
    };
  }, [state, sendMessage, refetch]);
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
      // Use order + limit to handle duplicates (get the one with most recent activity)
      const { data: existingConvs, error: convError } = await supabase
        .from('conversations')
        .select('id, type, owner_company_id, driver_id, title, is_muted, last_message_at, last_message_preview, message_count')
        .eq('type', 'driver_dispatch')
        .eq('driver_id', driver.id)
        .eq('owner_company_id', driver.company_id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1);

      const existingConv = existingConvs?.[0] ?? null;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:useDispatchConversation:CONVERSATION_CHECK',message:'Checking for dispatch conversation',data:{driverId:driver.id,companyId:driver.company_id,existingConvId:existingConv?.id,existingConvType:existingConv?.type,foundCount:existingConvs?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:useDispatchConversation:SETTING_CONVERSATION',message:'Setting dispatch conversation',data:{conversationId:existing.id,driverId:driver.id,companyId:driver.company_id,hasParticipant:!!participant},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:fetchUnreadCount:ENTRY',message:'Fetching unread count',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Get driver ID
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:fetchUnreadCount:DRIVER_QUERY',message:'Driver query result',data:{driverId:driver?.id,driverError:driverError?.message,hasDriver:!!driver},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!driver) return;

      // Sum up unread counts
      const { data, error: queryError } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('driver_id', driver.id)
        .eq('can_read', true);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:fetchUnreadCount:QUERY_RESULT',message:'Unread count query result',data:{driverId:driver.id,participantCount:data?.length||0,participants:data?.map(p=>({unread_count:p.unread_count})),queryError:queryError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const total = (data ?? []).reduce((sum, p) => sum + (p.unread_count ?? 0), 0);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:fetchUnreadCount:SETTING_COUNT',message:'Setting unread count state',data:{total,previousCount:unreadCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      setUnreadCount(total);
    };

    fetchUnreadCount();

    // Subscribe to changes for this specific driver
    // Listen to all conversation_participants changes and filter by driver_id in callback
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const setupSubscription = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!driver) return;

      channel = supabase
        .channel(`unread-count-${driver.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_participants',
          },
          (payload) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_CALLBACK',message:'Realtime callback fired',data:{event:payload.eventType,driverId:driver.id,newDriverId:(payload.new as any)?.driver_id,oldDriverId:(payload.old as any)?.driver_id,newUnreadCount:(payload.new as any)?.unread_count,oldUnreadCount:(payload.old as any)?.unread_count,matches:payload.new?(payload.new as any).driver_id===driver.id:payload.old?(payload.old as any).driver_id===driver.id:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // Only update if this change affects our driver
            if (payload.new && (payload.new as any).driver_id === driver.id) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_MATCH_NEW',message:'Realtime match - new record',data:{driverId:driver.id,unreadCount:(payload.new as any)?.unread_count},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              // Debounce rapid updates
              if (debounceTimer) {
                clearTimeout(debounceTimer);
              }
              debounceTimer = setTimeout(() => {
                fetchUnreadCount();
                debounceTimer = null;
              }, 300);
            } else if (payload.old && (payload.old as any).driver_id === driver.id) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_MATCH_OLD',message:'Realtime match - old record',data:{driverId:driver.id,unreadCount:(payload.old as any)?.unread_count},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              // Also handle deletes/updates where old record was for our driver
              if (debounceTimer) {
                clearTimeout(debounceTimer);
              }
              debounceTimer = setTimeout(() => {
                fetchUnreadCount();
                debounceTimer = null;
              }, 300);
            } else {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_NO_MATCH',message:'Realtime callback - no match for driver',data:{driverId:driver.id,newDriverId:(payload.new as any)?.driver_id,oldDriverId:(payload.old as any)?.driver_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
            }
          }
        )
        .subscribe((status) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useMessaging.ts:REALTIME_SUBSCRIBE',message:'Realtime subscription status',data:{status,driverId:driver.id,channelName:`unread-count-${driver.id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        });
    };

    setupSubscription();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user?.id]);

  return unreadCount;
}

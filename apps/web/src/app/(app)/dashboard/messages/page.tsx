'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  MessageSquare,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  LayoutList,
  Layers,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  ConversationList,
  MessageList,
  MessageComposer,
  ConversationTypeIcon,
} from '@/components/messaging/unified';
import type {
  ConversationType,
  ConversationWithDetails,
  MessageWithSender,
} from '@/lib/communication-types';
import type { ConversationListItemProps } from '@/components/messaging/unified';
import { createClient } from '@/lib/supabase-client';

type ConversationFilter = 'all' | 'load' | 'trip' | 'company';

export default function MessagesPage() {
  // State
  const [conversations, setConversations] = useState<ConversationListItemProps[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isGrouped, setIsGrouped] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Get current user ID
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUserId(data.user?.id || null))
      .catch(() => setUserId(null));
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all') {
        const typeMap: Record<ConversationFilter, string> = {
          all: '',
          load: 'load_internal,load_shared',
          trip: 'trip_internal',
          company: 'company_to_company',
        };
        params.set('type', typeMap[filter]);
      }

      const res = await fetch(`/api/messaging/conversations?${params}`);
      if (!res.ok) {
        throw new Error('Failed to load conversations');
      }

      const { conversations: data } = await res.json();

      // Transform to list item format
      // Exclude driver_dispatch conversations - those belong in the Dispatch console
      const items: ConversationListItemProps[] = (data || [])
        .filter((conv: ConversationWithDetails) => conv.type !== 'driver_dispatch')
        .map((conv: ConversationWithDetails) => ({
          id: conv.id,
          type: conv.type,
          title: getConversationTitle(conv),
          subtitle: getConversationSubtitle(conv),
          lastMessage: conv.last_message_preview,
          lastMessageAt: conv.last_message_at,
          unreadCount: conv.unread_count ?? 0,
          isSelected: false,
          onClick: () => {},
        }));

      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [filter]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConversationId) return;

    try {
      setIsLoadingMessages(true);
      setError(null);
      const res = await fetch(`/api/messaging/messages?conversation_id=${selectedConversationId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load messages');
      }

      const { messages: data, conversation } = await res.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessagesPage.tsx:fetchMessages:MESSAGES_FETCHED',message:'Messages fetched for conversation',data:{conversationId:selectedConversationId,conversationType:conversation?.type,driverId:conversation?.driver_id,messageCount:data?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      setMessages(data || []);

      // Always set conversation even if minimal - prevent infinite loading
      if (conversation) {
        setSelectedConversation(conversation);
      } else {
        // Fallback: create minimal conversation from list item
        const listItem = conversations.find(c => c.id === selectedConversationId);
        setSelectedConversation({
          id: selectedConversationId,
          type: listItem?.type || 'general',
          title: listItem?.title || 'Conversation',
          message_count: data?.length || 0,
        } as ConversationWithDetails);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      // Still set a minimal conversation to show error state, not spinner
      const listItem = conversations.find(c => c.id === selectedConversationId);
      if (listItem) {
        setSelectedConversation({
          id: selectedConversationId,
          type: listItem.type,
          title: listItem.title,
        } as ConversationWithDetails);
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, [selectedConversationId, conversations]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages();
    } else {
      setMessages([]);
      setSelectedConversation(null);
    }
  }, [selectedConversationId, fetchMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    const conversationId = selectedConversationId;
    if (!conversationId) {
      console.log('⚠️ MessagesPage: No conversationId, skipping subscription setup');
      return;
    }

    console.log('🔌 MessagesPage: Setting up realtime subscription for:', conversationId);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 MessagesPage: Cleaning up existing subscription');
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
          console.log('🔔🔔🔔 MessagesPage: Realtime INSERT received!', {
            messageId: payload.new.id,
            conversationId: payload.new.conversation_id,
            ourConversationId: conversationId,
            senderUserId: payload.new.sender_user_id,
            senderDriverId: payload.new.sender_driver_id,
            body: payload.new.body?.substring(0, 50),
          });
          
          // Verify this message is for our conversation
          if (payload.new.conversation_id !== conversationId) {
            console.log('⚠️ MessagesPage: Message conversation ID mismatch:', payload.new.conversation_id, 'vs', conversationId);
            return;
          }
          
          console.log('✅ MessagesPage: Message conversation ID matches, processing...');

          // Fetch the full message with sender info
          console.log('🔍 MessagesPage: Fetching message details for:', payload.new.id);
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
            console.error('❌ MessagesPage: Failed to fetch new message:', error);
            console.error('❌ MessagesPage: Error details:', JSON.stringify(error, null, 2));
            // Try to add message with payload data directly as fallback
            console.log('🔄 MessagesPage: Attempting fallback - using payload data directly');
            const fallbackMessage: MessageWithSender = {
              ...payload.new as any,
              sender_profile: undefined,
              sender_driver: undefined,
            };
            setMessages((prev) => {
              const exists = prev.some(m => m.id === fallbackMessage.id);
              if (exists) return prev;
              console.log('✅ MessagesPage: Adding message via fallback');
              return [...prev, fallbackMessage];
            });
            return;
          }
          
          console.log('✅ MessagesPage: Message fetched successfully:', newMsg.id);

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
            setMessages((prev) => {
              const exists = prev.some(m => m.id === formatted.id);
              if (exists) {
                console.log('⚠️ MessagesPage: Message already exists, skipping:', formatted.id, 'Current message count:', prev.length);
                return prev;
              }
              console.log('✅✅✅ MessagesPage: Adding new message to state:', formatted.id, 'Previous count:', prev.length, 'New count:', prev.length + 1);
              console.log('✅ MessagesPage: Message details:', {
                id: formatted.id,
                body: formatted.body?.substring(0, 50),
                senderDriver: formatted.sender_driver,
                senderProfile: formatted.sender_profile,
              });
              const newMessages = [...prev, formatted];
              console.log('✅ MessagesPage: State updated, new message count:', newMessages.length);
              return newMessages;
            });

            // Update conversation list with new message info (timestamp, preview, unread count)
            const messagePreview = formatted.body?.length > 50
              ? formatted.body.substring(0, 50) + '...'
              : formatted.body;
            const isFromOther = formatted.sender_user_id !== userId;

            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== conversationId) return conv;
                return {
                  ...conv,
                  lastMessage: messagePreview,
                  lastMessageAt: formatted.created_at,
                  // Don't increment unread if we're viewing this conversation
                  unreadCount: isFromOther && conversationId !== selectedConversationId
                    ? (conv.unreadCount || 0) + 1
                    : conv.unreadCount,
                };
              })
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 MessagesPage: Realtime subscription status:', status, err ? `Error: ${JSON.stringify(err)}` : '', 'Channel:', `messages:${conversationId}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ MessagesPage: Realtime subscription SUBSCRIBED successfully for:', conversationId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED' || err) {
          console.error('❌ MessagesPage: Realtime subscription error:', status, err);
          console.error('❌ MessagesPage: Error details:', JSON.stringify(err, null, 2));
        } else {
          console.log('⚠️ MessagesPage: Unexpected subscription status:', status);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 MessagesPage: Cleaning up realtime subscription for:', conversationId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      channel.unsubscribe();
    };
  }, [selectedConversationId]);

  // Global subscription to update conversation list when ANY message arrives (for any conversation)
  const globalSubscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!userId || conversations.length === 0) return;

    // Get conversation IDs we care about
    const conversationIds = new Set(conversations.map(c => c.id));

    // Clean up existing subscription
    if (globalSubscriptionRef.current) {
      globalSubscriptionRef.current.unsubscribe();
      globalSubscriptionRef.current = null;
    }

    const channel = supabase
      .channel('global-messages-list-update')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender_user_id: string | null;
            sender_driver_id: string | null;
            body: string;
            created_at: string;
          };

          // Only process if this is for a conversation in our list
          if (!conversationIds.has(newMessage.conversation_id)) return;

          // Skip if this is the selected conversation (already handled by other subscription)
          if (newMessage.conversation_id === selectedConversationId) return;

          const messagePreview = newMessage.body?.length > 50
            ? newMessage.body.substring(0, 50) + '...'
            : newMessage.body;
          const isFromOther = newMessage.sender_user_id !== userId;

          // Update conversation list
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== newMessage.conversation_id) return conv;
              return {
                ...conv,
                lastMessage: messagePreview,
                lastMessageAt: newMessage.created_at,
                unreadCount: isFromOther ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
              };
            })
          );
        }
      )
      .subscribe();

    globalSubscriptionRef.current = channel;

    return () => {
      if (globalSubscriptionRef.current) {
        globalSubscriptionRef.current.unsubscribe();
        globalSubscriptionRef.current = null;
      }
    };
  }, [userId, conversations.length, selectedConversationId]);

  // Send message
  const handleSendMessage = useCallback(async (body: string) => {
    if (!selectedConversationId || !body.trim()) return;

    try {
      setIsSending(true);
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }

      // Refetch messages
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [selectedConversationId, fetchMessages]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query) ||
      conv.subtitle.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Select a conversation and mark as read
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setIsMobileThreadOpen(true);

    // Mark conversation as read
    fetch(`/api/messaging/conversations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' }),
    }).then(() => {
      // Update local unread count to 0
      setConversations(prev => prev.map(conv =>
        conv.id === id ? { ...conv, unreadCount: 0 } : conv
      ));
    }).catch((err) => {
      console.error('Failed to mark conversation as read:', err);
    });
  }, []);

  // Go back (mobile)
  const handleBack = useCallback(() => {
    setIsMobileThreadOpen(false);
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main content - two column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Conversation list */}
        <div
          className={cn(
            'w-full md:w-[380px] border-r flex flex-col bg-background',
            isMobileThreadOpen && 'hidden md:flex'
          )}
        >
          {/* Search and filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as ConversationFilter)}>
                <SelectTrigger className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conversations</SelectItem>
                  <SelectItem value="load">Load Messages</SelectItem>
                  <SelectItem value="trip">Trip Messages</SelectItem>
                  <SelectItem value="company">Company Threads</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={isGrouped ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsGrouped(!isGrouped)}
                title={isGrouped ? 'Show flat list' : 'Group by type'}
              >
                {isGrouped ? <Layers className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Conversation list */}
          <ConversationList
            conversations={filteredConversations.map(c => ({
              ...c,
              isSelected: c.id === selectedConversationId,
              onClick: () => handleSelectConversation(c.id),
            }))}
            isLoading={isLoadingConversations}
            selectedId={selectedConversationId ?? undefined}
            onSelect={handleSelectConversation}
            emptyMessage="No conversations found"
            grouped={isGrouped}
          />
        </div>

        {/* Right column - Thread view */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-card min-h-0 overflow-hidden',
            !isMobileThreadOpen && 'hidden md:flex'
          )}
        >
          {selectedConversationId && selectedConversation ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-background/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <ConversationTypeIcon type={selectedConversation.type} />
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">
                    {getConversationTitle(selectedConversation)}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {getConversationSubtitle(selectedConversation)}
                  </p>
                </div>
              </div>

              {/* Messages - scrollable area */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                <MessageList
                  messages={messages}
                  currentUserId={userId || ''}
                  isLoading={isLoadingMessages}
                  emptyMessage="No messages yet"
                />
              </div>

              {/* Input area */}
              <MessageComposer
                onSend={handleSendMessage}
                isSending={isSending}
                placeholder="Type a message..."
              />
            </>
          ) : selectedConversationId ? (
            // Loading state
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            // Empty state
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm text-center mt-1">
                Choose a conversation from the list to view messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getConversationTitle(conv: ConversationWithDetails): string {
  if (conv.title) return conv.title;

  switch (conv.type) {
    case 'load_internal':
      return conv.load ? `Load ${conv.load.load_number} - Team` : 'Load Discussion';
    case 'load_shared':
      return conv.load ? `Load ${conv.load.load_number}` : 'Load Discussion';
    case 'trip_internal':
      return conv.trip ? `Trip ${conv.trip.trip_number}` : 'Trip Discussion';
    case 'company_to_company':
      return conv.partner_company?.name || 'Partner Discussion';
    default:
      return 'Conversation';
  }
}

function getConversationSubtitle(conv: ConversationWithDetails): string {
  switch (conv.type) {
    case 'load_internal':
      return 'Internal team discussion';
    case 'load_shared':
      return conv.partner_company ? `Shared with ${conv.partner_company.name}` : 'Shared with partner';
    case 'trip_internal':
      return 'Trip coordination';
    case 'company_to_company':
      return 'Company thread';
    default:
      return '';
  }
}

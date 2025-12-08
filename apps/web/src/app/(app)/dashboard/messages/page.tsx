'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  MessageSquare,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
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
  const [userId, setUserId] = useState<string | null>(null);

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
      const items: ConversationListItemProps[] = (data || []).map((conv: ConversationWithDetails) => ({
        id: conv.id,
        type: conv.type,
        title: getConversationTitle(conv),
        subtitle: getConversationSubtitle(conv),
        lastMessage: conv.last_message_preview,
        lastMessageAt: conv.last_message_at,
        unreadCount: 0,
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
      const res = await fetch(`/api/messaging/messages?conversation_id=${selectedConversationId}`);
      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      const { messages: data, conversation } = await res.json();
      setMessages(data || []);
      setSelectedConversation(conversation || null);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [selectedConversationId]);

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

  // Select a conversation
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setIsMobileThreadOpen(true);
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
            <Select value={filter} onValueChange={(v) => setFilter(v as ConversationFilter)}>
              <SelectTrigger className="w-full">
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
          />
        </div>

        {/* Right column - Thread view */}
        <div
          className={cn(
            'flex-1 flex flex-col bg-card',
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

              {/* Messages */}
              <MessageList
                messages={messages}
                currentUserId={userId || ''}
                isLoading={isLoadingMessages}
                emptyMessage="No messages yet"
              />

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

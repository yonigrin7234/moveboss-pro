'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import {
  MessageSquare,
  Search,
  Filter,
  Loader2,
  Users,
  Globe,
  Building2,
  Package,
  Route,
  Send,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type {
  ConversationType,
  ConversationWithDetails,
  MessageWithSender,
} from '@/lib/communication-types';

type ConversationFilter = 'all' | 'load' | 'trip' | 'company';

interface ConversationListItemData {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  load?: { id: string; load_number: string };
  trip?: { id: string; trip_number: string };
  partner_company?: { id: string; name: string };
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationListItemData[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

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

      // Transform to list items
      const items: ConversationListItemData[] = (data || []).map((conv: ConversationWithDetails) => ({
        id: conv.id,
        type: conv.type,
        title: getConversationTitle(conv),
        subtitle: getConversationSubtitle(conv),
        lastMessage: conv.last_message_preview,
        lastMessageAt: conv.last_message_at,
        unreadCount: 0, // TODO: Get from participant data
        load: conv.load,
        trip: conv.trip,
        partner_company: conv.partner_company,
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageInput.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: messageInput.trim(),
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }

      setMessageInput('');
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(query) ||
      conv.subtitle.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  // Select a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsMobileThreadOpen(true);
  };

  // Go back (mobile)
  const handleBack = () => {
    setIsMobileThreadOpen(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main content - two column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Conversation list */}
        <div
          className={cn(
            'w-full md:w-[360px] border-r flex flex-col',
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
          <ScrollArea className="flex-1">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={conv.id === selectedConversationId}
                    onClick={() => handleSelectConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right column - Thread view */}
        <div
          className={cn(
            'flex-1 flex flex-col',
            !isMobileThreadOpen && 'hidden md:flex'
          )}
        >
          {selectedConversationId ? (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">
                    {selectedConversation
                      ? getConversationTitle(selectedConversation)
                      : 'Loading...'}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedConversation
                      ? getConversationSubtitle(selectedConversation)
                      : ''}
                  </p>
                </div>
                <ConversationTypeIcon type={selectedConversation?.type} />
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);
                      return (
                        <React.Fragment key={message.id}>
                          {showDateHeader && <DateHeader date={message.created_at} />}
                          <MessageBubble message={message} />
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSending || !messageInput.trim()}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper components

interface ConversationListItemProps {
  conversation: ConversationListItemData;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationListItem({ conversation, isSelected, onClick }: ConversationListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-3">
        <ConversationTypeIcon type={conversation.type} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate">{conversation.title}</span>
            {conversation.lastMessageAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatMessageTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{conversation.subtitle}</p>
          {conversation.lastMessage && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {conversation.lastMessage}
            </p>
          )}
        </div>
        {conversation.unreadCount > 0 && (
          <Badge variant="default" className="shrink-0">
            {conversation.unreadCount}
          </Badge>
        )}
      </div>
    </button>
  );
}

function ConversationTypeIcon({
  type,
  className,
}: {
  type?: ConversationType;
  className?: string;
}) {
  const iconClass = cn('h-5 w-5 text-muted-foreground', className);

  switch (type) {
    case 'load_internal':
      return <Users className={iconClass} />;
    case 'load_shared':
      return <Globe className={iconClass} />;
    case 'trip_internal':
      return <Route className={iconClass} />;
    case 'company_to_company':
      return <Building2 className={iconClass} />;
    default:
      return <MessageSquare className={iconClass} />;
  }
}

function shouldShowDateHeader(
  current: MessageWithSender,
  previous: MessageWithSender | undefined
): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

function DateHeader({ date }: { date: string }) {
  const dateObj = new Date(date);
  let label: string;

  if (isToday(dateObj)) {
    label = 'Today';
  } else if (isYesterday(dateObj)) {
    label = 'Yesterday';
  } else {
    label = format(dateObj, 'MMMM d, yyyy');
  }

  return (
    <div className="flex justify-center my-4">
      <span className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithSender;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const senderName =
    message.sender_profile?.full_name ||
    (message.sender_driver
      ? `${message.sender_driver.first_name} ${message.sender_driver.last_name}`
      : 'Unknown');

  const isAI = message.message_type === 'ai_response';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground italic">{message.body}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isAI ? 'bg-green-50 border border-green-200' : 'bg-muted'
        )}
      >
        <p className={cn('text-xs font-medium mb-1', isAI ? 'text-green-600' : 'text-muted-foreground')}>
          {isAI ? 'AI Assistant' : senderName}
        </p>
        <p className="text-sm text-foreground">{message.body}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(message.created_at), 'h:mm a')}
          {message.is_edited && ' (edited)'}
        </p>
      </div>
    </div>
  );
}

// Helper functions

function getConversationTitle(conv: ConversationWithDetails | ConversationListItemData): string {
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

function getConversationSubtitle(conv: ConversationWithDetails | ConversationListItemData): string {
  switch (conv.type) {
    case 'load_internal':
      return 'Internal team discussion';
    case 'load_shared':
      return conv.partner_company ? `with ${conv.partner_company.name}` : 'Shared with partner';
    case 'trip_internal':
      return 'Trip coordination';
    case 'company_to_company':
      return 'Company thread';
    default:
      return '';
  }
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
}

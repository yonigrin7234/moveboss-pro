'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Send, MessageSquare, Building2, AlertCircle, Loader2, Info } from 'lucide-react';
import type { MessageWithSender, ConversationWithDetails } from '@/lib/communication-types';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface CompanyConversationPanelProps {
  myCompanyId: string;
  partnerCompanyId: string;
  partnerCompanyName: string;
  isPartnerMoveBossMember: boolean;
  userId: string;
}

export function CompanyConversationPanel({
  myCompanyId,
  partnerCompanyId,
  partnerCompanyName,
  isPartnerMoveBossMember,
  userId,
}: CompanyConversationPanelProps) {
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // If partner is not a MoveBoss member, show informational message
  if (!isPartnerMoveBossMember) {
    return (
      <div className="flex flex-col h-full border rounded-lg bg-white dark:bg-card">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Messages - {partnerCompanyName}</span>
          </div>
        </div>

        {/* Info message */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Messaging Not Available</h3>
            <p className="text-muted-foreground text-sm">
              {partnerCompanyName} is not a MoveBoss member, so in-app messaging is not available.
              Please contact them through email, phone, or other external channels.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch conversation
  const fetchConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'company_to_company',
          partner_company_id: partnerCompanyId,
        }),
      });

      if (res.ok) {
        const { conversation } = await res.json();
        setConversation(conversation);
      } else {
        const { error } = await res.json();
        throw new Error(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [myCompanyId, partnerCompanyId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversation?.id) return;

    try {
      const res = await fetch(`/api/messaging/messages?conversation_id=${conversation.id}`);
      if (res.ok) {
        const { messages } = await res.json();
        setMessages(messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [conversation?.id]);

  // Initial load
  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Fetch messages when conversation loads
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!conversation?.id || !messageInput.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          body: messageInput.trim(),
        }),
      });

      if (res.ok) {
        setMessageInput('');
        fetchMessages();
      } else {
        const { error } = await res.json();
        throw new Error(error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white dark:bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Messages - {partnerCompanyName}</span>
          {conversation?.message_count ? (
            <Badge variant="secondary" className="ml-1">
              {conversation.message_count}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          <Building2 className="h-4 w-4 inline mr-1" />
          Company-to-company chat
        </p>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 h-[400px] p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation with {partnerCompanyName}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_user_id === userId;
              const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);

              return (
                <React.Fragment key={message.id}>
                  {showDateHeader && <DateHeader date={message.created_at} />}
                  <MessageBubble message={message} isOwn={isOwn} />
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
            disabled={isSending || !conversation}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !messageInput.trim() || !conversation}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Helper components
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
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
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
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : isAI
              ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-muted'
        )}
      >
        {!isOwn && (
          <p
            className={cn(
              'text-xs font-medium mb-1',
              isAI ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            )}
          >
            {isAI ? 'AI Assistant' : senderName}
          </p>
        )}
        <p className={cn('text-sm', isOwn ? 'text-primary-foreground' : 'text-foreground')}>
          {message.body}
        </p>
        <p
          className={cn(
            'text-xs mt-1',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {format(new Date(message.created_at), 'h:mm a')}
          {message.is_edited && ' (edited)'}
        </p>
      </div>
    </div>
  );
}

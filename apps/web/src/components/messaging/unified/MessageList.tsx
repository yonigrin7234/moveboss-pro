'use client';

import React, { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import type { MessageWithSender } from '@/lib/communication-types';
import type { MessageListProps } from './types';

/**
 * Unified message list component.
 * Handles scrolling, date separators, loading states, and empty states.
 */
export function MessageList({
  messages,
  currentUserId,
  isLoading,
  emptyMessage = 'No messages yet',
  onScrollToBottom,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
      onScrollToBottom?.();
    }
  }, [messages, onScrollToBottom]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-10 w-10 opacity-40" />
          <p className="text-sm">{emptyMessage}</p>
          <p className="text-xs opacity-70">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 space-y-1">
        {messages.map((message, index) => {
          const isOwn = message.sender_user_id === currentUserId;
          const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);
          const showSender = shouldShowSender(message, messages[index - 1], isOwn);

          return (
            <React.Fragment key={message.id}>
              {showDateHeader && <DateSeparator date={message.created_at} />}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showSender={showSender}
              />
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}

/**
 * Date separator component - shows date headers between message groups
 */
function DateSeparator({ date }: { date: string }) {
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
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}

/**
 * Determines if a date header should be shown between messages
 */
function shouldShowDateHeader(
  current: MessageWithSender,
  previous: MessageWithSender | undefined
): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

/**
 * Determines if sender info should be shown (collapse consecutive messages from same sender)
 */
function shouldShowSender(
  current: MessageWithSender,
  previous: MessageWithSender | undefined,
  isOwn: boolean
): boolean {
  // Always show sender for first message or own messages don't need sender
  if (!previous || isOwn) return !isOwn;

  // Show sender if different from previous
  const currentSender = current.sender_user_id || current.sender_driver_id;
  const previousSender = previous.sender_user_id || previous.sender_driver_id;

  if (currentSender !== previousSender) return true;

  // Show sender if more than 5 minutes since last message
  const currentTime = new Date(current.created_at).getTime();
  const previousTime = new Date(previous.created_at).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  return currentTime - previousTime > fiveMinutes;
}

export default MessageList;

'use client';

import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, Users, Globe, Building2, Route, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConversationType } from '@/lib/communication-types';
import type { ConversationListProps, ConversationListItemProps } from './types';

/**
 * Unified conversation list component for inbox-style views.
 */
export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  emptyMessage = 'No conversations found',
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            {...conversation}
            isSelected={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Individual conversation list item
 */
export function ConversationListItem({
  id,
  type,
  title,
  subtitle,
  lastMessage,
  lastMessageAt,
  unreadCount,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-muted',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="mt-0.5 shrink-0">
          <ConversationTypeIcon type={type} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              'font-medium truncate text-sm',
              unreadCount > 0 && 'font-semibold'
            )}>
              {title}
            </span>
            {lastMessageAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatMessageTime(lastMessageAt)}
              </span>
            )}
          </div>

          {/* Subtitle */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </p>

          {/* Last message preview */}
          {lastMessage && (
            <p className={cn(
              'text-xs truncate mt-1',
              unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {lastMessage}
            </p>
          )}
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <Badge variant="default" className="shrink-0 h-5 min-w-[20px] px-1.5 text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    </button>
  );
}

/**
 * Conversation type icon component
 */
export function ConversationTypeIcon({
  type,
  className,
}: {
  type: ConversationType;
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

/**
 * Format message timestamp for list display
 */
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

export default ConversationList;

'use client';

import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, Users, Globe, Building2, Route, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConversationType } from '@/lib/communication-types';
import type { ConversationListProps, ConversationListItemProps } from './types';

// Group labels for conversation types
const TYPE_GROUP_LABELS: Record<string, string> = {
  load: 'Load Conversations',
  trip: 'Trip Conversations',
  company: 'Company Threads',
  other: 'Other',
};

// Map conversation types to groups
function getTypeGroup(type: ConversationType): string {
  if (type === 'load_internal' || type === 'load_shared') return 'load';
  if (type === 'trip_internal') return 'trip';
  if (type === 'company_to_company') return 'company';
  return 'other';
}

/**
 * Unified conversation list component for inbox-style views.
 */
export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  emptyMessage = 'No conversations found',
  grouped = false,
}: ConversationListProps & { grouped?: boolean }) {
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

  // Sort conversations: unread first, then by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    // Unread first
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((b.unreadCount || 0) > 0 && (a.unreadCount || 0) === 0) return 1;

    // Then by last message time
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });

  // Group conversations if requested
  if (grouped) {
    const groups = new Map<string, ConversationListItemProps[]>();

    sortedConversations.forEach((conv) => {
      const group = getTypeGroup(conv.type);
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(conv);
    });

    // Order groups: load, trip, company, other
    const orderedGroups = ['load', 'trip', 'company', 'other']
      .filter(g => groups.has(g))
      .map(g => ({ key: g, label: TYPE_GROUP_LABELS[g], conversations: groups.get(g)! }));

    return (
      <ScrollArea className="flex-1">
        {orderedGroups.map((group) => (
          <div key={group.key}>
            <div className="px-4 py-2 bg-muted/50 border-b sticky top-0 z-10">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </span>
            </div>
            <div className="divide-y divide-border">
              {group.conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  {...conversation}
                  isSelected={conversation.id === selectedId}
                  onClick={() => onSelect(conversation.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {sortedConversations.map((conversation) => (
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
        {/* Type icon with colored background */}
        <div className="shrink-0">
          <ConversationTypeIcon type={type} withBackground />
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

// Color scheme for conversation types
const CONVERSATION_TYPE_COLORS: Record<ConversationType, { bg: string; icon: string }> = {
  load_internal: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  load_shared: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  trip_internal: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  company_to_company: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  driver_dispatch: { bg: 'bg-rose-100', icon: 'text-rose-600' },
  general: { bg: 'bg-gray-100', icon: 'text-gray-600' },
};

/**
 * Conversation type icon component with colored background
 */
export function ConversationTypeIcon({
  type,
  className,
  withBackground = false,
}: {
  type: ConversationType;
  className?: string;
  withBackground?: boolean;
}) {
  const colors = CONVERSATION_TYPE_COLORS[type] || CONVERSATION_TYPE_COLORS.general;
  const iconClass = cn('h-5 w-5', withBackground ? colors.icon : 'text-muted-foreground', className);

  const icon = (() => {
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
  })();

  if (withBackground) {
    return (
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', colors.bg)}>
        {icon}
      </div>
    );
  }

  return icon;
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

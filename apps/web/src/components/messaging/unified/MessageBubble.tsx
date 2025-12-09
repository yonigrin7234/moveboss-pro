'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import type { MessageBubbleProps } from './types';

/**
 * Unified message bubble component with Slack/Intercom-style design.
 * - Clean, subtle rounded rectangles (not pill bubbles)
 * - Own messages right-aligned, others left-aligned
 * - Sender name and company shown unobtrusively
 */
export function MessageBubble({ message, isOwn, showSender = true }: MessageBubbleProps) {
  const personName = message.sender_profile?.full_name ||
    (message.sender_driver
      ? `${message.sender_driver.first_name} ${message.sender_driver.last_name}`
      : null);

  const companyName = message.sender_company?.name;

  // Format: "Person Name • Company" or just "Company" or just "Person Name"
  const senderDisplay = personName && companyName
    ? `${personName} • ${companyName}`
    : personName || companyName || 'Unknown';

  const isAI = message.message_type === 'ai_response';
  const isSystem = message.message_type === 'system';
  const timestamp = format(new Date(message.created_at), 'h:mm a');

  // System messages - centered, subtle
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground/70 italic px-3 py-1">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full mb-1 group',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] min-w-[120px]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name - only for non-own messages */}
        {!isOwn && showSender && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            {isAI && <Bot className="h-3 w-3 text-emerald-500" />}
            <span
              className={cn(
                'text-xs font-medium',
                isAI ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {isAI ? 'AI Assistant' : senderDisplay}
            </span>
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm leading-relaxed',
            // Own messages - primary color, right-aligned
            isOwn && 'bg-primary text-primary-foreground',
            // Other messages - muted background
            !isOwn && !isAI && 'bg-muted text-foreground',
            // AI messages - subtle green tint
            isAI && 'bg-emerald-50 dark:bg-emerald-950/30 text-foreground border border-emerald-200 dark:border-emerald-800/50'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>

        {/* Timestamp - subtle, appears on hover or always visible */}
        <div
          className={cn(
            'flex items-center gap-1 mt-0.5 px-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span className="text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
            {timestamp}
            {message.is_edited && (
              <span className="ml-1 opacity-70">(edited)</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;

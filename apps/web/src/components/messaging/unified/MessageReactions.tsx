'use client';

import React, { useState, useCallback } from 'react';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ReactionSummary } from '@/lib/communication-types';

// Common quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

interface MessageReactionsProps {
  messageId: string;
  reactions?: ReactionSummary[];
  onReact: (messageId: string, emoji: string, action: 'add' | 'remove') => void;
  className?: string;
}

/**
 * Display and manage reactions on a message
 */
export function MessageReactions({
  messageId,
  reactions = [],
  onReact,
  className,
}: MessageReactionsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleReactionClick = useCallback(
    (emoji: string, alreadyReacted: boolean) => {
      onReact(messageId, emoji, alreadyReacted ? 'remove' : 'add');
    },
    [messageId, onReact]
  );

  const handleQuickReaction = useCallback(
    (emoji: string) => {
      // Check if already reacted with this emoji
      const existing = reactions.find(r => r.emoji === emoji);
      onReact(messageId, emoji, existing?.reacted_by_me ? 'remove' : 'add');
      setIsPickerOpen(false);
    },
    [messageId, reactions, onReact]
  );

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.reacted_by_me)}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors',
            'hover:bg-muted/80',
            reaction.reacted_by_me
              ? 'bg-primary/10 border border-primary/30 text-primary'
              : 'bg-muted border border-transparent'
          )}
          title={reaction.users.map(u => u.name).join(', ')}
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 1 && (
            <span className="text-muted-foreground">{reaction.count}</span>
          )}
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="sr-only">Add reaction</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" side="top">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors',
                  reactions.find(r => r.emoji === emoji)?.reacted_by_me && 'bg-primary/10'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MessageReactions;

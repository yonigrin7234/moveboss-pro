'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MessageComposerProps } from './types';

/**
 * Unified message composer component.
 * Clean, minimal input with send button.
 */
export function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  isSending = false,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle typing state changes
  useEffect(() => {
    const isTyping = message.trim().length > 0;
    if (isTyping && !wasTypingRef.current) {
      wasTypingRef.current = true;
      onTypingStart?.();
    } else if (!isTyping && wasTypingRef.current) {
      wasTypingRef.current = false;
      onTypingStop?.();
    }
  }, [message, onTypingStart, onTypingStop]);

  // Stop typing indicator when component unmounts or message is sent
  useEffect(() => {
    return () => {
      if (wasTypingRef.current) {
        onTypingStop?.();
      }
    };
  }, [onTypingStop]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled || isSending) return;

    // Stop typing indicator before sending
    if (wasTypingRef.current) {
      wasTypingRef.current = false;
      onTypingStop?.();
    }

    setMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSend(trimmed);
  }, [message, disabled, isSending, onSend, onTypingStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSend = message.trim().length > 0 && !disabled && !isSending;

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background">
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[40px] max-h-[120px]'
            )}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className={cn(
            'h-10 w-10 shrink-0 rounded-lg transition-all',
            canSend && 'bg-primary hover:bg-primary/90',
            !canSend && 'bg-muted text-muted-foreground'
          )}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Read-only state indicator for when user cannot write
 */
export function ReadOnlyComposer({ reason = 'You cannot send messages in this conversation' }: { reason?: string }) {
  return (
    <div className="border-t bg-muted/30 p-3">
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <span>{reason}</span>
      </div>
    </div>
  );
}

export default MessageComposer;

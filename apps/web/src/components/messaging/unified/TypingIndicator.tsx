'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
  currentUserName?: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * Typing indicator component that shows who is typing.
 * Uses Supabase Realtime Broadcast for ephemeral typing state.
 */
export function TypingIndicator({
  conversationId,
  currentUserId,
  currentUserName = 'Someone',
}: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Create a broadcast channel for typing events
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
      },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, userName, isTyping } = payload.payload as {
          userId: string;
          userName: string;
          isTyping: boolean;
        };

        // Don't show our own typing
        if (userId === currentUserId) return;

        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, { userId, userName, timestamp: Date.now() });
          } else {
            next.delete(userId);
          }
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;

    // Clean up stale typing indicators
    const cleanupInterval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        for (const [userId, user] of prev) {
          if (now - user.timestamp > TYPING_TIMEOUT) {
            next.delete(userId);
          }
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(cleanupInterval);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, currentUserId, supabase]);

  // Get list of typing users (excluding current user)
  const typingList = Array.from(typingUsers.values());

  if (typingList.length === 0) {
    return null;
  }

  // Format the typing message
  const typingMessage =
    typingList.length === 1
      ? `${typingList[0].userName} is typing...`
      : typingList.length === 2
      ? `${typingList[0].userName} and ${typingList[1].userName} are typing...`
      : `${typingList[0].userName} and ${typingList.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground">
      <TypingDots />
      <span>{typingMessage}</span>
    </div>
  );
}

/**
 * Animated typing dots
 */
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
    </div>
  );
}

/**
 * Hook to broadcast typing state
 */
export function useTypingBroadcast(
  conversationId: string | undefined,
  currentUserId: string,
  currentUserName: string
) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;

    // Create channel if not exists
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      // Send stop typing when unmounting
      if (isTypingRef.current && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUserId,
            userName: currentUserName,
            isTyping: false,
          },
        });
      }
      channel.unsubscribe();
      channelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId, currentUserName, supabase]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Only send if state changed
      if (isTypingRef.current !== isTyping) {
        isTypingRef.current = isTyping;
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: currentUserId,
            userName: currentUserName,
            isTyping,
          },
        });
      }

      // Auto-stop typing after timeout
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          if (isTypingRef.current) {
            isTypingRef.current = false;
            channelRef.current?.send({
              type: 'broadcast',
              event: 'typing',
              payload: {
                userId: currentUserId,
                userName: currentUserName,
                isTyping: false,
              },
            });
          }
        }, TYPING_TIMEOUT);
      }
    },
    [currentUserId, currentUserName]
  );

  const startTyping = useCallback(() => sendTyping(true), [sendTyping]);
  const stopTyping = useCallback(() => sendTyping(false), [sendTyping]);

  return { startTyping, stopTyping };
}

export default TypingIndicator;

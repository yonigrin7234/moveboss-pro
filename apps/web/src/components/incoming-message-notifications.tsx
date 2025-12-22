'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { toast } from '@/hooks/use-toast';
import { useNotificationSound, useNotificationSoundPreference } from '@/hooks/use-notification-sound';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface IncomingMessageNotificationsProps {
  userId?: string;
  companyId?: string;
}

/**
 * Global component that listens for incoming messages and shows toast notifications.
 * Should be mounted once at the layout level.
 */
export function IncomingMessageNotifications({ userId, companyId }: IncomingMessageNotificationsProps) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const participantConversationsRef = useRef<Set<string>>(new Set());
  const { getPreference } = useNotificationSoundPreference();
  const { playDoubleBeep, initAudioContext } = useNotificationSound({
    enabled: getPreference(),
  });

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudioContext();
      // Remove listener after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudioContext]);

  // Fetch conversations the user participates in
  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;

    const fetchParticipantConversations = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .eq('can_read', true);

      if (data) {
        participantConversationsRef.current = new Set(data.map(p => p.conversation_id));
      }
    };

    fetchParticipantConversations();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`user-participants-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchParticipantConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Subscribe to incoming messages
  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`web-message-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender_user_id: string | null;
            sender_driver_id: string | null;
            body: string;
            created_at: string;
          };

          // Skip if this message is from the current user
          if (newMessage.sender_user_id === userId) {
            return;
          }

          // Skip if not in a conversation the user participates in
          if (!participantConversationsRef.current.has(newMessage.conversation_id)) {
            return;
          }

          // Fetch sender info
          let senderName = 'Someone';

          if (newMessage.sender_driver_id) {
            const { data: driver } = await supabase
              .from('drivers')
              .select('first_name, last_name')
              .eq('id', newMessage.sender_driver_id)
              .single();

            if (driver) {
              senderName = `${driver.first_name} ${driver.last_name}`;
            }
          } else if (newMessage.sender_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newMessage.sender_user_id)
              .single();

            if (profile) {
              senderName = profile.full_name || profile.email?.split('@')[0] || 'User';
            }
          }

          // Truncate preview
          const preview = newMessage.body.length > 60
            ? newMessage.body.substring(0, 60) + '...'
            : newMessage.body;

          // Play notification sound
          if (getPreference()) {
            playDoubleBeep();
          }

          // Show toast notification
          toast({
            title: senderName,
            description: preview,
            duration: 5000,
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Web: Incoming message notifications subscribed');
        } else if (err) {
          console.error('❌ Web: Incoming message notifications error:', err);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId, playDoubleBeep, getPreference]);

  // This component doesn't render anything visible
  return null;
}

export default IncomingMessageNotifications;

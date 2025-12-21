/**
 * Chat Screen - View and send messages in a conversation
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwnerMessages, useMarkAsRead } from '../../../hooks/useOwnerMessaging';
import { ChatView } from '../../../components/messaging/ChatView';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing } from '../../../lib/theme';
import {
  ConversationType,
  CONVERSATION_TYPE_LABELS,
  CONVERSATION_TYPE_COLORS,
} from '../../../types/messaging';

interface ConversationInfo {
  id: string;
  type: ConversationType;
  title: string | null;
  load_id: string | null;
  trip_id: string | null;
  driver_id: string | null;
  load?: {
    load_number: string;
    pickup_city: string | null;
    delivery_city: string | null;
  } | null;
  trip?: {
    trip_number: string;
  } | null;
  driver?: {
    first_name: string;
    last_name: string;
  } | null;
  partner?: {
    name: string;
  } | null;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const markAsRead = useMarkAsRead();

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation-info', id],
    queryFn: async (): Promise<ConversationInfo | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          title,
          load_id,
          trip_id,
          driver_id,
          load:load_id (
            load_number,
            pickup_city,
            delivery_city
          ),
          trip:trip_id (
            trip_number
          ),
          driver:driver_id (
            first_name,
            last_name
          ),
          partner:partner_company_id (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        return null;
      }

      return {
        ...data,
        type: data.type as ConversationType,
        load: Array.isArray(data.load) ? data.load[0] : data.load,
        trip: Array.isArray(data.trip) ? data.trip[0] : data.trip,
        driver: Array.isArray(data.driver) ? data.driver[0] : data.driver,
        partner: Array.isArray(data.partner) ? data.partner[0] : data.partner,
      };
    },
    enabled: !!id,
  });

  // Use owner messages hook
  const {
    messages,
    is_loading,
    is_sending,
    can_write,
    is_read_only,
    was_routed,
    route_reason,
    error,
    sendMessage,
    refetch,
  } = useOwnerMessages(id || null);

  // Mark as read when viewing
  useEffect(() => {
    if (id) {
      markAsRead(id);
    }
  }, [id, markAsRead]);

  // Get conversation title
  const getTitle = (): string => {
    if (!conversation) return 'Chat';
    if (conversation.title) return conversation.title;

    switch (conversation.type) {
      case 'driver_dispatch':
        return conversation.driver
          ? `${conversation.driver.first_name} ${conversation.driver.last_name}`
          : 'Driver';
      case 'load_internal':
      case 'load_shared':
        return conversation.load?.load_number || 'Load';
      case 'trip_internal':
        return `Trip ${conversation.trip?.trip_number || ''}`;
      case 'company_to_company':
        return conversation.partner?.name || 'Partner';
      default:
        return 'Chat';
    }
  };

  // Get subtitle
  const getSubtitle = (): string | null => {
    if (!conversation) return null;

    switch (conversation.type) {
      case 'driver_dispatch':
        return 'Direct Message';
      case 'load_internal':
        return conversation.load
          ? `${conversation.load.pickup_city || ''} → ${conversation.load.delivery_city || ''} • Team`
          : 'Team Chat';
      case 'load_shared':
        return conversation.load
          ? `${conversation.load.pickup_city || ''} → ${conversation.load.delivery_city || ''} • Shared`
          : 'Shared Chat';
      case 'trip_internal':
        return 'Trip Chat';
      case 'company_to_company':
        return 'Company Chat';
      default:
        return CONVERSATION_TYPE_LABELS[conversation.type];
    }
  };

  const typeColor = conversation
    ? CONVERSATION_TYPE_COLORS[conversation.type] || colors.primary
    : colors.primary;

  if (conversationLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Icon name="chevron-left" size="md" color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="chevron-left" size="md" color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getTitle()}
          </Text>
          {getSubtitle() && (
            <View style={styles.subtitleRow}>
              <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
              <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
            </View>
          )}
        </View>

        {/* Info button */}
        <Pressable style={styles.infoButton}>
          <Icon name="info" size="md" color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Chat View */}
      <ChatView
        conversationId={id || ''}
        conversationType={conversation?.type || 'general'}
        messages={messages}
        isLoading={is_loading}
        isSending={is_sending}
        canWrite={can_write}
        isReadOnly={is_read_only}
        wasRouted={was_routed}
        routeReason={route_reason}
        error={error}
        onSendMessage={sendMessage}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

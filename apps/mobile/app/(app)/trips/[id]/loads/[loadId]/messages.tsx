import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadConversations, useConversationMessages } from '../../../../../../hooks/useMessaging';
import { ChatView } from '../../../../../../components/messaging/ChatView';
import { ConversationListItem } from '../../../../../../types/messaging';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';
import { ErrorState, Icon } from '../../../../../../components/ui';

export default function LoadMessagesScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const insets = useSafeAreaInsets();

  // Fetch conversations for this load
  const {
    internalConversation,
    sharedConversation,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useLoadConversations(loadId ?? null);

  // Build conversations array from internal and shared
  const conversations = useMemo(() => {
    const convs: ConversationListItem[] = [];
    if (internalConversation) convs.push(internalConversation);
    if (sharedConversation) convs.push(sharedConversation);
    return convs;
  }, [internalConversation, sharedConversation]);

  // Selected conversation state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Get messages for selected conversation
  const {
    messages,
    is_loading: messagesLoading,
    is_sending: isSending,
    can_write: canWrite,
    is_read_only: isReadOnly,
    was_routed: wasRouted,
    route_reason: routeReason,
    error: messagesError,
    sendMessage,
    refetch: refetchMessages,
  } = useConversationMessages(selectedConversationId);

  // Find selected conversation details
  const selectedConversation = useMemo(
    () => conversations.find(c => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  // Handle conversation selection
  const handleSelectConversation = useCallback((conv: ConversationListItem) => {
    setSelectedConversationId(conv.id);
  }, []);

  // Handle back from chat
  const handleBack = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  // If no conversations found
  if (!conversationsLoading && conversations.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Load Messages',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={[styles.container, styles.centered]}>
          <Icon name="message-circle" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Messages</Text>
          <Text style={styles.emptyText}>
            You don't have access to any conversations for this load yet.
          </Text>
        </View>
      </>
    );
  }

  // If a conversation is selected, show the chat view
  if (selectedConversationId && selectedConversation) {
    return (
      <>
        <Stack.Screen
          options={{
            title: selectedConversation.title,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
                <Icon name="chevron-left" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <ChatView
          conversationId={selectedConversationId}
          conversationType={selectedConversation.type}
          messages={messages}
          isLoading={messagesLoading}
          isSending={isSending}
          canWrite={canWrite}
          isReadOnly={isReadOnly}
          wasRouted={wasRouted}
          routeReason={routeReason}
          error={messagesError}
          onSendMessage={sendMessage}
          onRefresh={refetchMessages}
        />
      </>
    );
  }

  // Show conversation list
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Load Messages',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={styles.container}>
        {conversationsLoading ? (
          <View style={[styles.container, styles.centered]}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversationsError ? (
          <View style={{ padding: spacing.sectionGap }}>
            <ErrorState title="Unable to load conversations" message={conversationsError} actionLabel="Retry" onAction={refetchConversations} />
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => handleSelectConversation(conv)}
              >
                <View style={styles.conversationIcon}>
                  <Icon
                    name={conv.type === 'load_internal' ? 'users' : 'globe'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationTitle}>{conv.title}</Text>
                    {conv.unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conv.unread_count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.conversationSubtitle}>{conv.subtitle}</Text>
                  {conv.last_message_preview && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conv.last_message_preview}
                    </Text>
                  )}
                </View>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sectionGap,
  },
  headerButton: {
    marginLeft: spacing.xs,
    padding: spacing.xs,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyTitle: {
    ...typography.headline,
    marginTop: spacing.lg,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sectionGap,
  },
  list: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.cardPadding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationTitle: {
    ...typography.subheadline,
    fontWeight: '600',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  conversationSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  lastMessage: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

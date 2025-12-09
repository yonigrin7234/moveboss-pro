import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useDispatchConversation, useConversationMessages } from '../../hooks/useMessaging';
import { ChatView } from '../../components/messaging/ChatView';
import { colors, typography, spacing } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState } from '../../components/ui';

export default function DispatchScreen() {
  // Get or create the dispatch conversation
  const {
    conversation,
    loading: conversationLoading,
    error: conversationError,
  } = useDispatchConversation();

  // Get messages for the conversation
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
  } = useConversationMessages(conversation?.id ?? null);

  // Loading state
  if (conversationLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Dispatch',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Connecting to dispatch...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (conversationError || !conversation) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Dispatch',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={[styles.container, styles.centered]}>
          <ErrorState
            title="Connection Error"
            message={conversationError || 'Unable to connect to dispatch'}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Dispatch',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={styles.container}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="headset-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Direct message with your dispatch team
          </Text>
        </View>

        {/* Chat View */}
        <ChatView
          conversationId={conversation.id}
          conversationType="driver_dispatch"
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  errorTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sectionGap,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
});

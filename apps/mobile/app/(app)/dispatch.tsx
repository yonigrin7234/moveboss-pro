import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useDispatchConversation, useConversationMessages } from '../../hooks/useMessaging';
import { ChatView } from '../../components/messaging/ChatView';
import { colors, typography, spacing } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState } from '../../components/ui';
import { dataLogger } from '../../lib/logger';

export default function DispatchScreen() {
  // Get or create the dispatch conversation
  const {
    conversation,
    loading: conversationLoading,
    error: conversationError,
  } = useDispatchConversation();

  // Get messages for the conversation
  // IMPORTANT: Pass conversationType to ensure can_write is always true for driver_dispatch
  const messagesResult = useConversationMessages(conversation?.id ?? null, { conversationType: 'driver_dispatch' });
  
  // FORCE canWrite to always be true for driver_dispatch conversations
  // This is a safety override in case the hook doesn't properly enforce it
  const {
    messages,
    is_loading: messagesLoading,
    is_sending: isSending,
    can_write: _canWrite,
    is_read_only: _isReadOnly,
    was_routed: wasRouted,
    route_reason: routeReason,
    error: messagesError,
    sendMessage,
    refetch: refetchMessages,
  } = messagesResult;
  
  // Override canWrite and isReadOnly - ALWAYS allow writing for driver_dispatch
  const canWrite = true; // FORCE to true for driver_dispatch
  const isReadOnly = false; // FORCE to false for driver_dispatch
  
  // #region agent log
  useEffect(() => {
    console.log('🔧 DispatchScreen: FORCING canWrite override', { hookCanWrite: _canWrite, forcedCanWrite: canWrite, conversationId: conversation?.id });
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch.tsx:39',message:'FORCING canWrite override',data:{hookCanWrite:_canWrite,forcedCanWrite:canWrite,conversationId:conversation?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'A'})}).catch(()=>{});
  }, [_canWrite, canWrite, conversation?.id]);
  // #endregion

  // Refetch messages when screen comes into focus (fallback for real-time)
  useFocusEffect(
    useCallback(() => {
      if (conversation?.id) {
        console.log('🔄 Screen focused, refetching messages as fallback');
        refetchMessages();
      }
    }, [conversation?.id, refetchMessages])
  );

  // Debug logging
  useEffect(() => {
    dataLogger.info('🖥️ DispatchScreen render:', {
      conversationId: conversation?.id,
      messagesLoading,
      messagesCount: messages.length,
      canWrite,
      isReadOnly,
      messagesError,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/584681c2-ae98-462f-910a-f83be0dad71e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dispatch.tsx:35',message:'DispatchScreen render with canWrite',data:{conversationId:conversation?.id,canWrite,isReadOnly,messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, [conversation?.id, messagesLoading, messages.length, canWrite, isReadOnly, messagesError]);

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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { MessageWithSender, ConversationType } from '../../types/messaging';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatViewProps {
  conversationId: string;
  conversationType: ConversationType;
  messages: MessageWithSender[];
  isLoading: boolean;
  isSending: boolean;
  canWrite: boolean;
  isReadOnly: boolean;
  wasRouted: boolean;
  routeReason?: string;
  error: string | null;
  onSendMessage: (body: string, replyToId?: string) => Promise<unknown>;
  onRefresh: () => void;
}

export function ChatView({
  conversationId,
  conversationType,
  messages,
  isLoading,
  isSending,
  canWrite,
  isReadOnly,
  wasRouted,
  routeReason,
  error,
  onSendMessage,
  onRefresh,
}: ChatViewProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Show route notification if message was routed
  useEffect(() => {
    if (wasRouted && routeReason) {
      Alert.alert('Message Routed', routeReason, [{ text: 'OK' }]);
    }
  }, [wasRouted, routeReason]);

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isSending) return;

    setInputText('');
    setReplyTo(null);

    await onSendMessage(trimmedText, replyTo?.id);

    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, isSending, replyTo, onSendMessage]);

  const handleLongPress = useCallback((message: MessageWithSender) => {
    if (!canWrite) return;

    Alert.alert('Message Options', undefined, [
      {
        text: 'Reply',
        onPress: () => setReplyTo(message),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }, [canWrite]);

  const renderMessage = useCallback(
    ({ item, index }: { item: MessageWithSender; index: number }) => {
      const isOwnMessage =
        item.sender_user_id === user?.id ||
        item.sender_driver_id !== null; // Assume driver messages are own messages

      const previousMessage = index > 0 ? messages[index - 1] : null;
      const showDateHeader = shouldShowDateHeader(item, previousMessage);

      return (
        <>
          {showDateHeader && <DateHeader date={item.created_at} />}
          <MessageBubble
            message={item}
            isOwn={isOwnMessage}
            onLongPress={() => handleLongPress(item)}
          />
        </>
      );
    },
    [user?.id, messages, handleLongPress]
  );

  const keyExtractor = useCallback((item: MessageWithSender) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Read-only banner */}
      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="eye-outline" size={16} color="#9CA3AF" />
          <Text style={styles.readOnlyText}>
            You have read-only access to this conversation
          </Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              {canWrite ? 'Start the conversation!' : 'Messages will appear here'}
            </Text>
          </View>
        }
      />

      {/* Reply preview */}
      {replyTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>Replying to:</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyTo.body}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input area */}
      {canWrite ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyInput}>
          <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
          <Text style={styles.readOnlyInputText}>
            You cannot send messages in this conversation
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// Helper to determine if we should show a date header
function shouldShowDateHeader(
  current: MessageWithSender,
  previous: MessageWithSender | null
): boolean {
  if (!previous) return true;

  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();

  return currentDate !== previousDate;
}

// Date header component
function DateHeader({ date }: { date: string }) {
  const dateObj = new Date(date);
  let label: string;

  if (isToday(dateObj)) {
    label = 'Today';
  } else if (isYesterday(dateObj)) {
    label = 'Yesterday';
  } else {
    label = format(dateObj, 'MMMM d, yyyy');
  }

  return (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{label}</Text>
    </View>
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  onLongPress: () => void;
}

function MessageBubble({ message, isOwn, onLongPress }: MessageBubbleProps) {
  const senderName = message.sender_profile?.full_name ||
    (message.sender_driver
      ? `${message.sender_driver.first_name} ${message.sender_driver.last_name}`
      : 'Unknown');

  const isAI = message.message_type === 'ai_response';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemMessageText}>{message.body}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.messageBubble,
        isOwn ? styles.ownMessage : styles.otherMessage,
        isAI && styles.aiMessage,
      ]}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {!isOwn && (
        <Text style={[styles.senderName, isAI && styles.aiSenderName]}>
          {isAI ? 'AI Assistant' : senderName}
        </Text>
      )}

      <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
        {message.body}
      </Text>

      <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
        {format(new Date(message.created_at), 'h:mm a')}
        {message.is_edited && ' (edited)'}
      </Text>
    </TouchableOpacity>
  );
}

// Slack/Intercom-style enterprise messaging design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117', // Dark background matching MoveBoss theme
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0D1117',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B949E',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F87171',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B22',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
    gap: 6,
  },
  readOnlyText: {
    fontSize: 13,
    color: '#8B949E',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#8B949E',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6E7681',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B949E',
    backgroundColor: '#21262D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Slack-style message bubbles - cleaner rectangles, not pills
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 8, // Smaller radius for enterprise look
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1F6FEB', // Blue for own messages
    borderColor: '#388BFD',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#21262D', // Dark gray for others
    borderColor: '#30363D',
  },
  aiMessage: {
    backgroundColor: '#0D1F12', // Dark green tint
    borderWidth: 1,
    borderColor: '#238636',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#58A6FF', // Blue accent for names
    marginBottom: 4,
  },
  aiSenderName: {
    color: '#3FB950', // Green for AI
  },
  messageText: {
    fontSize: 15,
    color: '#E6EDF3', // Light text
    lineHeight: 21,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#6E7681',
    marginTop: 6,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#6E7681',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    padding: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
  },
  replyContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6',
    paddingLeft: 10,
  },
  replyLabel: {
    fontSize: 11,
    color: '#8B949E',
    fontWeight: '600',
  },
  replyText: {
    fontSize: 13,
    color: '#C9D1D9',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: '#30363D',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0D1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#E6EDF3',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#238636',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#21262D',
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: '#30363D',
    gap: 8,
  },
  readOnlyInputText: {
    fontSize: 14,
    color: '#6E7681',
  },
});

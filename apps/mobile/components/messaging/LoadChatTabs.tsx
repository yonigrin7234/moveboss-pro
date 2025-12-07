import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLoadConversations, useConversationMessages } from '../../hooks/useMessaging';
import { ChatView } from './ChatView';
import { ConversationType } from '../../types/messaging';

interface LoadChatTabsProps {
  loadId: string;
}

type TabType = 'internal' | 'shared';

export function LoadChatTabs({ loadId }: LoadChatTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('internal');
  const {
    internalConversation,
    sharedConversation,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useLoadConversations(loadId);

  const activeConversation = activeTab === 'internal' ? internalConversation : sharedConversation;
  const {
    messages,
    is_loading: messagesLoading,
    is_sending: messagesSending,
    can_write: canWrite,
    is_read_only: isReadOnly,
    was_routed: wasRouted,
    route_reason: routeReason,
    error: messagesError,
    sendMessage,
    refetch: refetchMessages,
  } = useConversationMessages(activeConversation?.id ?? null);

  const handleSendMessage = useCallback(
    async (body: string, replyToId?: string) => {
      return sendMessage(body, replyToId);
    },
    [sendMessage]
  );

  // Calculate if we should show the shared tab
  const hasSharedAccess = sharedConversation !== null;

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Team Chat"
          icon="people-outline"
          isActive={activeTab === 'internal'}
          unreadCount={internalConversation?.unread_count ?? 0}
          onPress={() => setActiveTab('internal')}
        />

        {hasSharedAccess && (
          <TabButton
            label="Shared Chat"
            icon="globe-outline"
            isActive={activeTab === 'shared'}
            unreadCount={sharedConversation?.unread_count ?? 0}
            isReadOnly={sharedConversation?.can_write === false}
            onPress={() => setActiveTab('shared')}
          />
        )}
      </View>

      {/* Active conversation info */}
      {activeTab === 'shared' && sharedConversation && !sharedConversation.can_write && (
        <View style={styles.readOnlyNotice}>
          <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.readOnlyNoticeText}>
            You can view partner messages but replies go to Team Chat
          </Text>
        </View>
      )}

      {/* Chat content */}
      {activeConversation ? (
        <ChatView
          conversationId={activeConversation.id}
          conversationType={activeConversation.type}
          messages={messages}
          isLoading={messagesLoading}
          isSending={messagesSending}
          canWrite={canWrite}
          isReadOnly={isReadOnly}
          wasRouted={wasRouted}
          routeReason={routeReason}
          error={messagesError}
          onSendMessage={handleSendMessage}
          onRefresh={refetchMessages}
        />
      ) : (
        <View style={styles.noConversation}>
          {conversationsLoading ? (
            <>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noConversationText}>Loading chats...</Text>
            </>
          ) : conversationsError ? (
            <>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.noConversationError}>{conversationsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetchConversations}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noConversationText}>
                {activeTab === 'internal'
                  ? 'No team chat available for this load'
                  : 'No shared chat available for this load'}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// Tab button component
interface TabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  unreadCount: number;
  isReadOnly?: boolean;
  onPress: () => void;
}

function TabButton({
  label,
  icon,
  isActive,
  unreadCount,
  isReadOnly,
  onPress,
}: TabButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tabContent}>
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? '#3B82F6' : '#6B7280'}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {label}
        </Text>

        {isReadOnly && (
          <View style={styles.readOnlyIcon}>
            <Ionicons name="eye-outline" size={12} color="#9CA3AF" />
          </View>
        )}

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3B82F6',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  readOnlyIcon: {
    marginLeft: 2,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    padding: 8,
    gap: 6,
  },
  readOnlyNoticeText: {
    fontSize: 12,
    color: '#92400E',
  },
  noConversation: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noConversationText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  noConversationError: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

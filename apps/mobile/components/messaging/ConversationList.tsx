import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ConversationListItem,
  CONVERSATION_TYPE_LABELS,
  CONVERSATION_TYPE_COLORS,
} from '../../types/messaging';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: ConversationListItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyMessage?: string;
}

export function ConversationList({
  conversations,
  loading,
  error,
  onRefresh,
  emptyMessage = 'No conversations yet',
}: ConversationListProps) {
  const router = useRouter();

  const handlePress = useCallback(
    (conversation: ConversationListItem) => {
      router.push({
        pathname: '/(app)/messages/[id]',
        params: { id: conversation.id },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationItem conversation={item} onPress={() => handlePress(item)} />
    ),
    [handlePress]
  );

  const keyExtractor = useCallback((item: ConversationListItem) => item.id, []);

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
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

  if (conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#3B82F6" />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// Individual conversation item
interface ConversationItemProps {
  conversation: ConversationListItem;
  onPress: () => void;
}

function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const typeColor = CONVERSATION_TYPE_COLORS[conversation.type];
  const typeLabel = CONVERSATION_TYPE_LABELS[conversation.type];

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemContent}>
        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>

        {/* Main content */}
        <View style={styles.itemMain}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {conversation.title}
            </Text>
            {conversation.last_message_at && (
              <Text style={styles.itemTime}>
                {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
              </Text>
            )}
          </View>

          {conversation.subtitle && (
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {conversation.subtitle}
            </Text>
          )}

          {conversation.last_message_preview && (
            <Text style={styles.itemPreview} numberOfLines={2}>
              {conversation.last_message_preview}
            </Text>
          )}
        </View>

        {/* Indicators */}
        <View style={styles.itemIndicators}>
          {conversation.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Text>
            </View>
          )}

          {!conversation.can_write && (
            <View style={styles.readOnlyBadge}>
              <Ionicons name="eye-outline" size={12} color="#6B7280" />
            </View>
          )}

          {conversation.is_muted && (
            <Ionicons name="notifications-off-outline" size={16} color="#9CA3AF" />
          )}

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Slack/Intercom-style enterprise theme
const styles = StyleSheet.create({
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
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6E7681',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#238636',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 4,
    backgroundColor: '#0D1117',
  },
  separator: {
    height: 1,
    backgroundColor: '#21262D',
    marginHorizontal: 16,
  },
  itemContainer: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemMain: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E6EDF3',
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontSize: 11,
    color: '#6E7681',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#8B949E',
    marginBottom: 4,
  },
  itemPreview: {
    fontSize: 14,
    color: '#6E7681',
    lineHeight: 20,
  },
  itemIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#58A6FF',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  readOnlyBadge: {
    backgroundColor: '#21262D',
    borderRadius: 4,
    padding: 4,
  },
});

/**
 * Messages Inbox - List of all conversations for owner/dispatcher
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerConversations, useMarkAsRead } from '../../../hooks/useOwnerMessaging';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';
import {
  ConversationListItem,
  ConversationType,
  CONVERSATION_TYPE_LABELS,
  CONVERSATION_TYPE_COLORS,
} from '../../../types/messaging';

type FilterType = 'all' | 'drivers' | 'loads' | 'trips' | 'partners';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'loads', label: 'Loads' },
  { key: 'trips', label: 'Trips' },
  { key: 'partners', label: 'Partners' },
];

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  // Map filter to conversation type
  const getTypeFromFilter = (): ConversationType | undefined => {
    switch (filter) {
      case 'drivers':
        return 'driver_dispatch';
      case 'loads':
        return undefined; // Will show both load_internal and load_shared
      case 'trips':
        return 'trip_internal';
      case 'partners':
        return 'company_to_company';
      default:
        return undefined;
    }
  };

  const { conversations, loading, error, refetch } = useOwnerConversations({
    type: getTypeFromFilter(),
    limit: 50,
  });

  // Filter conversations for loads (both internal and shared)
  const filteredConversations = filter === 'loads'
    ? conversations.filter(c => c.type === 'load_internal' || c.type === 'load_shared')
    : conversations;

  const markAsRead = useMarkAsRead();

  const handleConversationPress = (conversation: ConversationListItem) => {
    haptics.selection();
    // Mark as read when opening
    if (conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
    router.push(`/(owner)/messages/${conversation.id}`);
  };

  const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTypeIcon = (type: ConversationType): string => {
    switch (type) {
      case 'driver_dispatch':
        return 'user';
      case 'load_internal':
      case 'load_shared':
        return 'package';
      case 'trip_internal':
        return 'truck';
      case 'company_to_company':
        return 'building';
      default:
        return 'message-circle';
    }
  };

  const renderConversation = ({ item }: { item: ConversationListItem }) => {
    const hasUnread = item.unread_count > 0;
    const typeColor = CONVERSATION_TYPE_COLORS[item.type] || colors.textMuted;

    return (
      <Pressable
        style={[styles.conversationCard, hasUnread && styles.conversationCardUnread]}
        onPress={() => handleConversationPress(item)}
      >
        {/* Avatar/Icon */}
        <View style={[styles.avatar, { backgroundColor: typeColor + '20' }]}>
          <Icon
            name={getTypeIcon(item.type) as any}
            size="md"
            color={typeColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.title, hasUnread && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTimeAgo(item.last_message_at)}</Text>
          </View>

          <View style={styles.middleRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>
                {CONVERSATION_TYPE_LABELS[item.type]}
              </Text>
            </View>
            {item.subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>

          {item.last_message_preview && (
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread]}
              numberOfLines={1}
            >
              {item.last_message_preview}
            </Text>
          )}
        </View>

        {/* Unread badge */}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterButton,
                filter === item.key && styles.filterButtonActive,
              ]}
              onPress={() => {
                haptics.selection();
                setFilter(item.key);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Conversations List */}
      {loading && filteredConversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="message-circle" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all'
                  ? 'Start messaging your team, drivers, or partners'
                  : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} conversations`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxxl + 80,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  conversationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  typeText: {
    ...typography.label,
    fontSize: 10,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
  },
  previewUnread: {
    color: colors.textSecondary,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadText: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

/**
 * LoadSuggestions Component
 * Displays smart load suggestions for drivers
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Truck, DollarSign, Star, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '../lib/theme';
import { useLoadSuggestions, LoadSuggestion } from '../hooks/useLoadSuggestions';
import * as Haptics from 'expo-haptics';

interface LoadSuggestionsProps {
  tripId: string;
  onSuggestionPress?: (suggestion: LoadSuggestion) => void;
}

const SUGGESTION_TYPE_LABELS: Record<LoadSuggestion['suggestion_type'], string> = {
  near_delivery: 'Near Delivery',
  backhaul: 'Backhaul',
  capacity_fit: 'Perfect Fit',
  high_profit: 'High Profit',
  partner_load: 'Partner',
};

const SUGGESTION_TYPE_COLORS: Record<LoadSuggestion['suggestion_type'], string> = {
  near_delivery: colors.info,
  backhaul: colors.primary,
  capacity_fit: colors.success,
  high_profit: colors.warning,
  partner_load: colors.primary,
};

export function LoadSuggestions({ tripId, onSuggestionPress }: LoadSuggestionsProps) {
  const { suggestions, isLoading, error, refresh, markAsViewed } =
    useLoadSuggestions(tripId);

  const handlePress = useCallback(
    async (suggestion: LoadSuggestion) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark as viewed if pending
      if (suggestion.status === 'pending') {
        await markAsViewed(suggestion.id);
      }

      if (onSuggestionPress) {
        onSuggestionPress(suggestion);
      }
    },
    [markAsViewed, onSuggestionPress]
  );

  const renderSuggestion = useCallback(
    ({ item, index }: { item: LoadSuggestion; index: number }) => {
      const typeColor = SUGGESTION_TYPE_COLORS[item.suggestion_type];
      const typeLabel = SUGGESTION_TYPE_LABELS[item.suggestion_type];
      const companyName = item.load.company?.company_name || item.load.company?.name || 'Unknown';

      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          <TouchableOpacity
            style={styles.suggestionCard}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
              </View>
              <View style={styles.scoreContainer}>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={styles.scoreText}>{Math.round(item.match_score)}</Text>
              </View>
            </View>

            {/* Route */}
            <View style={styles.routeContainer}>
              <View style={styles.locationRow}>
                <MapPin size={16} color={colors.success} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.load.pickup_city}, {item.load.pickup_state}
                </Text>
              </View>
              <View style={styles.routeArrow}>
                <ArrowRight size={16} color={colors.textMuted} />
              </View>
              <View style={styles.locationRow}>
                <MapPin size={16} color={colors.error} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.load.delivery_city}, {item.load.delivery_state}
                </Text>
              </View>
            </View>

            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Truck size={14} color={colors.textMuted} />
                <Text style={styles.metricValue}>
                  {Math.round(item.distance_to_pickup_miles)} mi
                </Text>
                <Text style={styles.metricLabel}>to pickup</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{item.load.cubic_feet || '-'}</Text>
                <Text style={styles.metricLabel}>CUFT</Text>
              </View>
              <View style={styles.metric}>
                <DollarSign size={14} color={colors.success} />
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  ${Math.round(item.profit_estimate)}
                </Text>
                <Text style={styles.metricLabel}>est. profit</Text>
              </View>
            </View>

            {/* Company */}
            <Text style={styles.companyText}>{companyName}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [handlePress]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Finding matching loads...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Truck size={32} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Suggestions Yet</Text>
        <Text style={styles.emptyText}>
          Load suggestions will appear here based on your route and capacity.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Suggested Loads</Text>
        <Text style={styles.headerSubtitle}>{suggestions.length} matches found</Text>
      </View>
      <FlatList
        data={suggestions}
        renderItem={renderSuggestion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  routeArrow: {
    paddingHorizontal: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metric: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  companyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 250,
  },
});

/**
 * Driver Detail Screen - View driver info and message
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useGetOrCreateDriverConversation } from '../../../hooks/useOwnerMessaging';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getOrCreate, loading: messageLoading } = useGetOrCreateDriverConversation();

  const { data: driver, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['driver-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          status,
          location_sharing_enabled,
          created_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching driver:', error);
        return null;
      }

      return data;
    },
    enabled: !!id,
  });

  const handleMessage = useCallback(async () => {
    if (!id) return;
    haptics.selection();
    const conversationId = await getOrCreate(id);
    if (conversationId) {
      router.push(`/(owner)/messages/${conversationId}`);
    }
  }, [id, getOrCreate, router]);

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'available': return colors.success;
      case 'on_trip': return colors.primary;
      case 'off_duty': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const formatStatus = (status: string | null): string => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="user-x" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Driver not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>
            {driver.first_name?.[0]}{driver.last_name?.[0]}
          </Text>
        </View>
        <Text style={styles.driverName}>
          {driver.first_name} {driver.last_name}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(driver.status) + '20' },
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(driver.status) },
          ]} />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(driver.status) },
          ]}>
            {formatStatus(driver.status)}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionButton}
          onPress={handleMessage}
          disabled={messageLoading}
        >
          {messageLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="message-circle" size="md" color={colors.primary} />
          )}
          <Text style={styles.actionText}>Message</Text>
        </Pressable>

        {driver.phone && (
          <Pressable style={styles.actionButton}>
            <Icon name="phone" size="md" color={colors.primary} />
            <Text style={styles.actionText}>Call</Text>
          </Pressable>
        )}

        {driver.location_sharing_enabled && (
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/(owner)/drivers/map')}
          >
            <Icon name="map-pin" size="md" color={colors.primary} />
            <Text style={styles.actionText}>Location</Text>
          </Pressable>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.card}>
          {driver.phone && (
            <View style={styles.infoRow}>
              <Icon name="phone" size="sm" color={colors.textMuted} />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{driver.phone}</Text>
            </View>
          )}
          {driver.email && (
            <View style={styles.infoRow}>
              <Icon name="mail" size="sm" color={colors.textMuted} />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{driver.email}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Icon name="map-pin" size="sm" color={colors.textMuted} />
            <Text style={styles.infoLabel}>Location Sharing</Text>
            <Text style={styles.infoValue}>
              {driver.location_sharing_enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.screenPadding,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarTextLarge: {
    ...typography.title,
    color: colors.primary,
  },
  driverName: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minWidth: 80,
    ...shadows.sm,
  },
  actionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
});

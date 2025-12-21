/**
 * Load Requests Screen - View and manage load requests from carriers
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useOwner } from '../../../providers/OwnerProvider';
import { useRequestActions } from '../../../hooks/useRequestActions';
import { Icon } from '../../../components/ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../../lib/theme';
import { haptics } from '../../../lib/haptics';

interface LoadRequest {
  id: string;
  load_id: string;
  carrier_id: string;
  status: string;
  created_at: string;
  carrier_rate: number | null;
  carrier_rate_type: string | null;
  load: {
    id: string;
    load_number: string;
    origin_city: string;
    origin_state: string;
    destination_city: string;
    destination_state: string;
    cuft: number;
    rate_per_cuft: number | null;
  };
  carrier: {
    id: string;
    name: string;
    dba_name: string | null;
  };
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { company } = useOwner();
  const { acceptRequest, declineRequest, isAccepting, isDeclining } = useRequestActions();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data: requests, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['load-requests', company?.id],
    queryFn: async (): Promise<LoadRequest[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('load_requests')
        .select(`
          id,
          load_id,
          carrier_id,
          status,
          created_at,
          carrier_rate,
          carrier_rate_type,
          load:loads!inner(
            id,
            load_number,
            origin_city,
            origin_state,
            destination_city,
            destination_state,
            cuft,
            rate_per_cuft
          ),
          carrier:companies!load_requests_carrier_id_fkey(
            id,
            name,
            dba_name
          )
        `)
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        load: Array.isArray(item.load) ? item.load[0] : item.load,
        carrier: Array.isArray(item.carrier) ? item.carrier[0] : item.carrier,
      })) as LoadRequest[];
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  const handleAccept = async (request: LoadRequest) => {
    haptics.selection();
    const carrierName = request.carrier?.dba_name || request.carrier?.name || 'this carrier';

    Alert.alert(
      'Accept Request',
      `Accept ${carrierName} for load ${request.load?.load_number}?\n\nAll other pending requests for this load will be declined.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActioningId(request.id);
            try {
              await acceptRequest({
                requestId: request.id,
                loadId: request.load_id,
                carrierId: request.carrier_id,
                carrierRate: request.carrier_rate,
                carrierRateType: request.carrier_rate_type || undefined,
                cubicFeetEstimate: request.load?.cuft,
              });
              haptics.success();
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request. Please try again.');
              haptics.error();
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  const handleDecline = async (request: LoadRequest) => {
    haptics.selection();
    const carrierName = request.carrier?.dba_name || request.carrier?.name || 'this carrier';

    Alert.alert(
      'Decline Request',
      `Decline request from ${carrierName}?\n\nThe carrier will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActioningId(request.id);
            try {
              await declineRequest({
                requestId: request.id,
                loadId: request.load_id,
              });
              haptics.success();
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request. Please try again.');
              haptics.error();
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  const isActioning = (id: string) => actioningId === id && (isAccepting || isDeclining);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Load Requests</Text>
        <Text style={styles.subtitle}>
          {requests?.length || 0} pending request{(requests?.length || 0) !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {requests?.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <Pressable
              style={styles.requestContent}
              onPress={() => router.push(`/(owner)/requests/${request.id}`)}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.carrierName}>
                  {request.carrier?.dba_name || request.carrier?.name || 'Unknown Carrier'}
                </Text>
                <Text style={styles.timeAgo}>{formatAge(request.created_at)}</Text>
              </View>

              <Text style={styles.loadNumber}>{request.load?.load_number}</Text>

              <View style={styles.routeRow}>
                <Icon name="map-pin" size="sm" color={colors.textMuted} />
                <Text style={styles.routeText}>
                  {request.load?.origin_city}, {request.load?.origin_state}
                </Text>
                <Icon name="arrow-right" size="sm" color={colors.textMuted} />
                <Text style={styles.routeText}>
                  {request.load?.destination_city}, {request.load?.destination_state}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailText}>
                  {request.load?.cuft} CF
                </Text>
                {request.carrier_rate && (
                  <Text style={styles.rateText}>
                    ${request.carrier_rate}{request.carrier_rate_type === 'per_cuft' ? '/cf' : ' flat'}
                  </Text>
                )}
              </View>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleDecline(request)}
                disabled={isActioning(request.id)}
              >
                {isActioning(request.id) && isDeclining ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <>
                    <Icon name="x" size="sm" color={colors.textSecondary} />
                    <Text style={styles.declineText}>Decline</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAccept(request)}
                disabled={isActioning(request.id)}
              >
                {isActioning(request.id) && isAccepting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Icon name="check" size="sm" color={colors.white} />
                    <Text style={styles.acceptText}>Accept</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ))}

        {!isLoading && (!requests || requests.length === 0) && (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptySubtitle}>
              New requests from carriers will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatAge(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxxl + 80,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  requestContent: {
    padding: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  carrierName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeAgo: {
    ...typography.caption,
    color: colors.textMuted,
  },
  loadNumber: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  routeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rateText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  declineButton: {
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  declineText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  acceptText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  emptyState: {
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
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

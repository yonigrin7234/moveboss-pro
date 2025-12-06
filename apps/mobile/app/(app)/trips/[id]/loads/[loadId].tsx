import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadDetail } from '../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../hooks/useLoadActions';
import { StatusBadge } from '../../../../../components/StatusBadge';
import { DamageDocumentation } from '../../../../../components/DamageDocumentation';
import { WorkflowActionCard, DocumentsSection, TimelineItem } from '../../../../../components/load';
import { DamageItem } from '../../../../../types';
import { colors, typography, spacing, radius } from '../../../../../lib/theme';

export default function LoadDetailScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const insets = useSafeAreaInsets();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Load Details' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </>
    );
  }

  if (!load && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Load Details' }} />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Load not found</Text>
          </View>
        </View>
      </>
    );
  }

  const getPickupAddress = () => {
    const parts = [
      load?.pickup_address_line1,
      load?.pickup_city,
      load?.pickup_state,
    ].filter(Boolean);
    return parts.join(', ') || 'Not set';
  };

  const getDeliveryAddress = () => {
    const parts = [
      load?.dropoff_address_line1 || load?.delivery_address_line1,
      load?.dropoff_city || load?.delivery_city,
      load?.dropoff_state || load?.delivery_state,
    ].filter(Boolean);
    return parts.join(', ') || 'Not set';
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.apple.com/?q=${encoded}`);
  };

  const handleCall = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleText = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`sms:${phone}`);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: load?.job_number || load?.load_number || 'Load Details',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sectionGap }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {load && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                {load.job_number && (
                  <View style={styles.jobNumberRow}>
                    <Text style={styles.jobNumberLabel}>Job #</Text>
                    <Text style={styles.jobNumber}>{load.job_number}</Text>
                  </View>
                )}
                {load.load_number && (
                  <View style={styles.loadNumberRow}>
                    <Text style={styles.loadNumberLabel}>Load #</Text>
                    <Text style={styles.loadNumberValue}>{load.load_number}</Text>
                  </View>
                )}
                {!load.job_number && !load.load_number && (
                  <Text style={styles.jobNumber}>Load</Text>
                )}
                {load.companies?.name && (
                  <Text style={styles.companyName}>{load.companies.name}</Text>
                )}
              </View>
              <StatusBadge status={load.load_status} />
            </View>

            {/* Action Card */}
            <WorkflowActionCard
              loadId={loadId}
              tripId={tripId}
              loadStatus={load.load_status}
              loadSource={load.load_source}
              postingType={load.posting_type}
              pickupCompletedAt={load.pickup_completed_at}
              actions={actions}
              balanceDue={load.balance_due_on_delivery}
              company={load.companies}
              deliveryOrder={load.delivery_order}
              loadUpdatedAt={load.updated_at}
            />

            {/* Contact Company Card */}
            {load.companies?.phone && (
              <View style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Contact Dispatcher</Text>
                  <Text style={styles.contactName}>{load.companies.name}</Text>
                  <Text style={styles.contactPhone}>{load.companies.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleCall(load.companies?.phone || null)}
                  >
                    <Text style={styles.contactButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleText(load.companies?.phone || null)}
                  >
                    <Text style={styles.contactButtonText}>Text</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Pickup Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Pickup</Text>
                {load.pickup_date && (
                  <Text style={styles.cardDate}>{formatDate(load.pickup_date)}</Text>
                )}
              </View>
              <Text style={styles.address}>{getPickupAddress()}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openMaps(getPickupAddress())}
                >
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
                {load.pickup_contact_phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(load.pickup_contact_phone)}
                  >
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
              {load.pickup_contact_name && (
                <Text style={styles.contactName}>Contact: {load.pickup_contact_name}</Text>
              )}
            </View>

            {/* Delivery Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Delivery</Text>
                {load.delivery_date && (
                  <Text style={styles.cardDate}>{formatDate(load.delivery_date)}</Text>
                )}
              </View>
              <Text style={styles.address}>{getDeliveryAddress()}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openMaps(getDeliveryAddress())}
                >
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Load Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Load Information</Text>
              <View style={styles.infoGrid}>
                {load.cubic_feet && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Estimated CUFT</Text>
                    <Text style={styles.infoValue}>{load.cubic_feet}</Text>
                  </View>
                )}
                {load.actual_cuft_loaded && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Actual CUFT</Text>
                    <Text style={styles.infoValue}>{load.actual_cuft_loaded}</Text>
                  </View>
                )}
                {load.weight_lbs_estimate && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Weight (lbs)</Text>
                    <Text style={styles.infoValue}>{load.weight_lbs_estimate.toLocaleString()}</Text>
                  </View>
                )}
                {load.pieces_count && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Pieces</Text>
                    <Text style={styles.infoValue}>{load.pieces_count}</Text>
                  </View>
                )}
              </View>
              {load.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.description}>{load.description}</Text>
                </View>
              )}
            </View>

            {/* Pre-Existing Damages - Read Only */}
            {(load.load_status === 'in_transit' || load.load_status === 'delivered') &&
              load.pre_existing_damages &&
              (load.pre_existing_damages as DamageItem[]).length > 0 && (
              <View style={styles.card}>
                <DamageDocumentation loadId={loadId} readonly />
              </View>
            )}

            {/* Financial Info */}
            {(load.balance_due_on_delivery || load.amount_collected_on_delivery) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment</Text>
                <View style={styles.infoGrid}>
                  {load.balance_due_on_delivery && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Balance Due</Text>
                      <Text style={styles.infoValueLarge}>
                        {formatCurrency(load.balance_due_on_delivery)}
                      </Text>
                    </View>
                  )}
                  {load.amount_collected_on_delivery && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Collected</Text>
                      <Text style={[styles.infoValueLarge, styles.collected]}>
                        {formatCurrency(load.amount_collected_on_delivery)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Timeline */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timeline</Text>
              <View style={styles.timeline}>
                <TimelineItem label="Accepted" time={formatDate(load.accepted_at)} />
                <TimelineItem label="Loading Started" time={formatDate(load.loading_started_at)} />
                <TimelineItem label="Loading Finished" time={formatDate(load.loading_finished_at)} />
                <TimelineItem label="In Transit" time={formatDate(load.delivery_started_at)} />
                <TimelineItem label="Delivered" time={formatDate(load.delivery_finished_at)} />
              </View>
            </View>

            {/* Documents Section */}
            <DocumentsSection loadId={loadId} />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sectionGap,
  },
  headerInfo: {
    flex: 1,
  },
  jobNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  jobNumberLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  jobNumber: {
    ...typography.title,
    color: colors.textPrimary,
  },
  loadNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  loadNumberLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  loadNumberValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  companyName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  cardDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.itemGap,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  actionButton: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  // Contact Card
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contactName: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contactPhone: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  contactButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoValueLarge: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  collected: {
    color: colors.success,
  },
  descriptionSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Timeline
  timeline: {
    gap: spacing.lg,
  },
  // States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    margin: spacing.screenPadding,
  },
  errorText: {
    ...typography.bodySmall,
    color: '#991b1b',
  },
});

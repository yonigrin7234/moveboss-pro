import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBadge } from '../StatusBadge';
import { WorkflowActionCard } from './WorkflowActionCard';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { formatCompanyName } from '../../lib/nameFormatting';
import type { LoadActions, LoadDetail } from '../../types';

type LoadHeaderProps = {
  load: LoadDetail;
  loadId: string;
  tripId: string;
  actions: LoadActions;
  onCall: (phone: string | null) => void;
  onText: (phone: string | null) => void;
};

export function LoadHeader({ load, loadId, tripId, actions, onCall, onText }: LoadHeaderProps) {
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          {load.load_number && (
            <View style={styles.loadNumberRow}>
              <Text style={styles.loadNumberLabel}>Load #</Text>
              <Text style={styles.loadNumberValue}>{load.load_number}</Text>
            </View>
          )}
          {load.internal_reference && (
            <View style={styles.jobNumberRow}>
              <Text style={styles.jobNumberLabel}>Ref #</Text>
              <Text style={styles.jobNumber}>{load.internal_reference}</Text>
            </View>
          )}
          {!load.load_number && <Text style={styles.jobNumber}>Load</Text>}
          {load.companies?.name && <Text style={styles.companyName}>{formatCompanyName(load.companies.name)}</Text>}
        </View>
        <StatusBadge status={load.load_status} />
      </View>

      <WorkflowActionCard
        loadId={loadId}
        tripId={tripId}
        loadStatus={load.load_status}
        loadSource={load.load_source}
        postingType={load.posting_type}
        pickupCompletedAt={load.pickup_completed_at}
        arrivedAtDelivery={load.arrived_at_delivery}
        actions={actions}
        balanceDue={load.balance_due_on_delivery}
        company={load.companies}
        deliveryOrder={load.delivery_order}
        loadUpdatedAt={load.updated_at}
      />

      {load.companies?.phone && (
        <View style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Contact Dispatcher</Text>
            <Text style={styles.contactName}>{formatCompanyName(load.companies.name)}</Text>
            <Text style={styles.contactPhone}>{load.companies.phone}</Text>
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.contactButton} onPress={() => onCall(load.companies?.phone || null)}>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={() => onText(load.companies?.phone || null)}>
              <Text style={styles.contactButtonText}>Text</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});

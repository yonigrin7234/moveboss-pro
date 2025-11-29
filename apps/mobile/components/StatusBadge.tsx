import { View, Text, StyleSheet } from 'react-native';
import { TripStatus, LoadStatus } from '../types';

type StatusType = TripStatus | LoadStatus;

const statusColors: Record<StatusType, { bg: string; text: string }> = {
  // Trip statuses
  planned: { bg: '#fef3c7', text: '#92400e' },
  active: { bg: '#d1fae5', text: '#065f46' },
  en_route: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#e2e8f0', text: '#334155' },
  settled: { bg: '#ede9fe', text: '#5b21b6' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
  // Load statuses
  pending: { bg: '#fef3c7', text: '#92400e' },
  accepted: { bg: '#dbeafe', text: '#1e40af' },
  loading: { bg: '#ede9fe', text: '#5b21b6' },
  loaded: { bg: '#d1fae5', text: '#065f46' },
  in_transit: { bg: '#dbeafe', text: '#1e40af' },
  delivered: { bg: '#d1fae5', text: '#065f46' },
  storage_completed: { bg: '#ede9fe', text: '#5b21b6' },
};

const statusLabels: Record<StatusType, string> = {
  planned: 'Planned',
  active: 'Active',
  en_route: 'En Route',
  completed: 'Completed',
  settled: 'Settled',
  cancelled: 'Cancelled',
  pending: 'Pending',
  accepted: 'Accepted',
  loading: 'Loading',
  loaded: 'Loaded',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  storage_completed: 'Storage',
};

interface StatusBadgeProps {
  status: StatusType;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const colors = statusColors[status] || { bg: '#e2e8f0', text: '#334155' };
  const label = statusLabels[status] || status;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg },
      size === 'small' && styles.badgeSmall,
    ]}>
      <Text style={[
        styles.text,
        { color: colors.text },
        size === 'small' && styles.textSmall,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 12,
  },
});

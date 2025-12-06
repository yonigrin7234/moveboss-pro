/**
 * DocumentRow Component
 *
 * Individual document row showing type, expiry, and status.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { VehicleDocument, DocumentStatus } from '../../types';
import { Icon, IconName, StatusIcon } from '../ui';
import { colors, typography, spacing } from '../../lib/theme';

const STATUS_COLORS: Record<DocumentStatus, string> = {
  valid: colors.success,
  expiring: colors.warning,
  expired: colors.error,
  missing: colors.textMuted,
};

const DOC_ICONS: Record<string, IconName> = {
  registration: 'file-text',
  insurance: 'shield-check',
  ifta: 'receipt',
  inspection: 'clipboard-check',
  permit: 'clipboard-list',
};

type DocStatusType = 'success' | 'warning' | 'error' | 'neutral';
const STATUS_TYPE_MAP: Record<DocumentStatus, DocStatusType> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'error',
  missing: 'neutral',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

interface DocumentRowProps {
  document: VehicleDocument;
  onPress: () => void;
}

export function DocumentRow({ document, onPress }: DocumentRowProps) {
  const icon = DOC_ICONS[document.type] || 'file-text';
  const statusType = STATUS_TYPE_MAP[document.status];
  const statusColor = STATUS_COLORS[document.status];

  return (
    <TouchableOpacity style={styles.documentRow} onPress={onPress}>
      <View style={styles.documentInfo}>
        <Icon name={icon} size="md" color={colors.textSecondary} />
        <Text style={styles.documentLabel}>{document.label}</Text>
      </View>
      <View style={styles.documentStatus}>
        {document.expiry && document.status !== 'missing' ? (
          <Text style={[styles.expiryText, { color: statusColor }]}>
            Exp: {formatDate(document.expiry)}
          </Text>
        ) : (
          <Text style={styles.notUploadedText}>Not uploaded</Text>
        )}
        <StatusIcon status={statusType} size="sm" showBackground={false} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: 44,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    ...typography.caption,
    marginRight: spacing.sm,
  },
  notUploadedText: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
});

export default DocumentRow;

/**
 * DocumentViewerModal Component
 *
 * Modal for viewing document images with expiry info.
 */

import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { VehicleDocument, DocumentStatus } from '../../types';
import { Icon } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const STATUS_COLORS: Record<DocumentStatus, string> = {
  valid: colors.success,
  expiring: colors.warning,
  expired: colors.error,
  missing: colors.textMuted,
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

interface DocumentViewerModalProps {
  visible: boolean;
  document: VehicleDocument | null;
  vehicleInfo: string;
  onClose: () => void;
}

export function DocumentViewerModal({ visible, document, vehicleInfo, onClose }: DocumentViewerModalProps) {
  if (!document) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{document.label}</Text>
              <Text style={styles.modalSubtitle}>{vehicleInfo}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {document.url ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: document.url }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Icon name="file-text" size={48} color={colors.textMuted} />
              <Text style={styles.noImageText}>Document not uploaded</Text>
            </View>
          )}

          {document.expiry && (
            <View style={styles.expiryBadge}>
              <Text style={styles.expiryBadgeLabel}>Expires:</Text>
              <Text style={[styles.expiryBadgeValue, { color: STATUS_COLORS[document.status] }]}>
                {formatDate(document.expiry)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth - 40,
    maxHeight: screenHeight - 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: screenHeight * 0.5,
    backgroundColor: colors.background,
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  noImageText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.itemGap,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  expiryBadgeLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  expiryBadgeValue: {
    ...typography.body,
    fontWeight: '600',
  },
});

export default DocumentViewerModal;

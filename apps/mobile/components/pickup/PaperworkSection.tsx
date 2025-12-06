/**
 * PaperworkSection Component
 *
 * Handles document capture for pickup completion:
 * - Contract/BOL photo
 * - Inventory photos (multiple)
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Icon } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface PaperworkSectionProps {
  contractPhoto: string | null;
  onTakeContractPhoto: () => Promise<void>;
  inventoryPhotos: string[];
  onTakeInventoryPhoto: () => Promise<void>;
  disabled?: boolean;
}

export function PaperworkSection({
  contractPhoto,
  onTakeContractPhoto,
  inventoryPhotos,
  onTakeInventoryPhoto,
  disabled = false,
}: PaperworkSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Paperwork</Text>

      <TouchableOpacity
        style={styles.documentButton}
        onPress={onTakeContractPhoto}
        disabled={disabled}
      >
        {contractPhoto ? (
          <View style={styles.documentCaptured}>
            <Image source={{ uri: contractPhoto }} style={styles.documentThumbnail} />
            <Text style={styles.documentCapturedText}>Contract/BOL captured</Text>
          </View>
        ) : (
          <>
            <Icon name="file-text" size="lg" color={colors.textSecondary} />
            <Text style={styles.documentButtonText}>Scan Contract/BOL</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.documentButton}
        onPress={onTakeInventoryPhoto}
        disabled={disabled}
      >
        {inventoryPhotos.length > 0 ? (
          <View style={styles.documentCaptured}>
            <View style={styles.inventoryThumbnails}>
              {inventoryPhotos.slice(0, 3).map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.inventoryThumb} />
              ))}
              {inventoryPhotos.length > 3 && (
                <View style={styles.moreIndicator}>
                  <Text style={styles.moreText}>+{inventoryPhotos.length - 3}</Text>
                </View>
              )}
            </View>
            <Text style={styles.documentCapturedText}>
              {inventoryPhotos.length} inventory photo(s)
            </Text>
          </View>
        ) : (
          <>
            <Icon name="clipboard-list" size="lg" color={colors.textSecondary} />
            <Text style={styles.documentButtonText}>Scan Inventory</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  documentButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPaddingLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.itemGap,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    minHeight: 44,
  },
  documentButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.itemGap,
  },
  documentCaptured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.itemGap,
  },
  documentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  documentCapturedText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '500',
  },
  inventoryThumbnails: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  inventoryThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  moreIndicator: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default PaperworkSection;

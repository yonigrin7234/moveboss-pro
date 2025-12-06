/**
 * VehicleDocumentsCard Component
 *
 * Card showing vehicle info and list of documents.
 */

import { View, Text, StyleSheet } from 'react-native';
import { VehicleDocument } from '../../types';
import { Icon, IconName } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { DocumentRow } from './DocumentRow';

interface VehicleDocumentsCardProps {
  type: 'truck' | 'trailer';
  unitNumber: string;
  subtitle?: string;
  plateNumber?: string | null;
  plateState?: string | null;
  documents: VehicleDocument[];
  onDocumentPress: (document: VehicleDocument) => void;
}

export function VehicleDocumentsCard({
  type,
  unitNumber,
  subtitle,
  plateNumber,
  plateState,
  documents,
  onDocumentPress,
}: VehicleDocumentsCardProps) {
  const icon: IconName = type === 'truck' ? 'truck' : 'box';
  const title = type === 'truck' ? `Truck: ${unitNumber}` : `Trailer: ${unitNumber}`;

  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <Icon name={icon} size="lg" color={colors.primary} />
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>{title}</Text>
          {subtitle && <Text style={styles.vehicleSubtitle}>{subtitle}</Text>}
          {plateNumber && (
            <Text style={styles.vehiclePlate}>
              Plate: {plateNumber}
              {plateState && ` (${plateState})`}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.documentsList}>
        {documents.map((doc) => (
          <DocumentRow
            key={doc.type}
            document={doc}
            onPress={() => onDocumentPress(doc)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  vehicleHeader: {
    flexDirection: 'row',
    padding: spacing.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  vehicleSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  vehiclePlate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
  },
  documentsList: {
    paddingHorizontal: spacing.cardPadding,
  },
});

export default VehicleDocumentsCard;

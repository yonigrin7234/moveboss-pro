import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import { VehicleDocument, DocumentStatus } from '../../types';
import { Icon, IconName, StatusIcon } from '../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Status colors
const STATUS_COLORS: Record<DocumentStatus, string> = {
  valid: colors.success,
  expiring: colors.warning,
  expired: colors.error,
  missing: colors.textMuted,
};

// Document type icons
const DOC_ICONS: Record<string, IconName> = {
  registration: 'file-text',
  insurance: 'shield-check',
  ifta: 'receipt',
  inspection: 'clipboard-check',
  permit: 'clipboard-list',
};

// Status icon types for StatusIcon component
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

function DocumentRow({ document, onPress }: DocumentRowProps) {
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

interface DocumentViewerModalProps {
  visible: boolean;
  document: VehicleDocument | null;
  vehicleInfo: string;
  onClose: () => void;
}

function DocumentViewerModal({ visible, document, vehicleInfo, onClose }: DocumentViewerModalProps) {
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

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const {
    truck,
    trailer,
    driver,
    company,
    isLoading,
    error,
    hasActiveTrip,
    tripNumber,
    refetch,
    expiringCount,
    expiredCount,
  } = useVehicleDocuments();

  const handleCopyToClipboard = (text: string, label: string) => {
    // Show the value in an alert (clipboard requires dev build)
    Alert.alert(label, text, [{ text: 'OK' }]);
  };

  const handleCall = (phone: string) => {
    const phoneNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState('');

  const handleDocumentPress = (document: VehicleDocument, vehicleInfo: string) => {
    if (!document.url) {
      Alert.alert(
        'Document Not Available',
        "This document hasn't been uploaded yet. Contact your dispatcher.",
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedDocument(document);
    setSelectedVehicleInfo(vehicleInfo);
    setViewerVisible(true);
  };

  const getTruckInfo = () => {
    if (!truck) return '';
    const parts = [];
    if (truck.year) parts.push(truck.year);
    if (truck.make) parts.push(truck.make);
    if (truck.model) parts.push(truck.model);
    return parts.join(' ') || truck.unit_number;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Vehicle Documents',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(40, insets.bottom + spacing.lg) }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Driver Info Section - Always shown */}
        {driver && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardIcon}>👤</Text>
              <Text style={styles.infoCardTitle}>Driver Info</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{driver.first_name} {driver.last_name}</Text>
            </View>
            {driver.cdl_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CDL</Text>
                <Text style={styles.infoValue}>
                  {driver.cdl_number}{driver.cdl_state ? ` (${driver.cdl_state})` : ''}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Company Authority Section - Always shown */}
        {company && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardIcon}>🏢</Text>
              <Text style={styles.infoCardTitle}>Company Authority</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{company.name}</Text>
            </View>
            {company.city && company.state && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{company.city}, {company.state}</Text>
              </View>
            )}
            {company.dot_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>DOT #</Text>
                <TouchableOpacity
                  style={styles.copyableValue}
                  onPress={() => handleCopyToClipboard(company.dot_number!, 'DOT #')}
                >
                  <Text style={styles.infoValue}>{company.dot_number}</Text>
                  <Icon name="copy" size="sm" color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {company.mc_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MC #</Text>
                <TouchableOpacity
                  style={styles.copyableValue}
                  onPress={() => handleCopyToClipboard(company.mc_number!, 'MC #')}
                >
                  <Text style={styles.infoValue}>{company.mc_number}</Text>
                  <Icon name="copy" size="sm" color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {company.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <TouchableOpacity
                  style={styles.callableValue}
                  onPress={() => handleCall(company.phone!)}
                >
                  <Text style={styles.phoneValue}>{company.phone}</Text>
                  <Icon name="phone" size="sm" color={colors.success} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!hasActiveTrip && !isLoading ? (
          <View style={styles.emptyState}>
            <Icon name="clipboard-list" size={48} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No Active Trip</Text>
            <Text style={styles.emptyStateText}>
              Vehicle documents will appear here when you're assigned to a trip with a truck/trailer.
            </Text>
          </View>
        ) : hasActiveTrip && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Vehicle Documents</Text>
              <Text style={styles.headerSubtitle}>
                Trip #{tripNumber}
                {truck && ` • ${truck.unit_number}`}
                {trailer && ` + ${trailer.unit_number}`}
              </Text>

              {/* Status Summary */}
              {(expiringCount > 0 || expiredCount > 0) && (
                <View style={styles.statusSummary}>
                  {expiredCount > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.expired }]}>
                      <Text style={styles.statusBadgeText}>
                        {expiredCount} expired
                      </Text>
                    </View>
                  )}
                  {expiringCount > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.expiring }]}>
                      <Text style={styles.statusBadgeText}>
                        {expiringCount} expiring soon
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Truck Section */}
            {truck && (
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <Icon name="truck" size="lg" color={colors.primary} />
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleTitle}>Truck: {truck.unit_number}</Text>
                    <Text style={styles.vehicleSubtitle}>{getTruckInfo()}</Text>
                    {truck.plate_number && (
                      <Text style={styles.vehiclePlate}>
                        Plate: {truck.plate_number}
                        {truck.plate_state && ` (${truck.plate_state})`}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.documentsList}>
                  {truck.documents.map((doc) => (
                    <DocumentRow
                      key={doc.type}
                      document={doc}
                      onPress={() => handleDocumentPress(doc, `Truck ${truck.unit_number}`)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Trailer Section */}
            {trailer && (
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleHeader}>
                  <Icon name="box" size="lg" color={colors.primary} />
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleTitle}>Trailer: {trailer.unit_number}</Text>
                    {trailer.capacity_cuft && (
                      <Text style={styles.vehicleSubtitle}>{trailer.capacity_cuft} CUFT</Text>
                    )}
                    {trailer.plate_number && (
                      <Text style={styles.vehiclePlate}>
                        Plate: {trailer.plate_number}
                        {trailer.plate_state && ` (${trailer.plate_state})`}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.documentsList}>
                  {trailer.documents.map((doc) => (
                    <DocumentRow
                      key={doc.type}
                      document={doc}
                      onPress={() => handleDocumentPress(doc, `Trailer ${trailer.unit_number}`)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* No vehicles assigned */}
            {!truck && !trailer && (
              <View style={styles.emptyState}>
                <Icon name="truck" size={48} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Vehicles Assigned</Text>
                <Text style={styles.emptyStateText}>
                  No truck or trailer has been assigned to this trip yet.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Pull to refresh hint */}
        <Text style={styles.refreshHint}>Pull down to refresh</Text>
      </ScrollView>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={viewerVisible}
        document={selectedDocument}
        vehicleInfo={selectedVehicleInfo}
        onClose={() => {
          setViewerVisible(false);
          setSelectedDocument(null);
        }}
      />
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
    marginBottom: spacing.sectionGap,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusSummary: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.itemGap,
  },
  statusBadge: {
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
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
  vehicleIcon: {
    fontSize: 32,
    marginRight: spacing.itemGap,
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
  documentIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
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
  statusIcon: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.headline,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  refreshHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sectionGap,
  },
  // Info Card styles (Driver & Company)
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoCardIcon: {
    fontSize: 24,
    marginRight: spacing.itemGap,
  },
  infoCardTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  copyIcon: {
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  callableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  phoneValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  callIcon: {
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  // Modal styles
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
  noImageIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
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

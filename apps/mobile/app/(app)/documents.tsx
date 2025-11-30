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
import * as Clipboard from 'expo-clipboard';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import { VehicleDocument, DocumentStatus } from '../../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Status colors
const STATUS_COLORS: Record<DocumentStatus, string> = {
  valid: '#22c55e',
  expiring: '#f59e0b',
  expired: '#ef4444',
  missing: '#9ca3af',
};

// Status icons
const STATUS_ICONS: Record<DocumentStatus, string> = {
  valid: '✅',
  expiring: '⚠️',
  expired: '🔴',
  missing: '➖',
};

// Document type icons
const DOC_ICONS: Record<string, string> = {
  registration: '📄',
  insurance: '🛡️',
  ifta: '⛽',
  inspection: '🔧',
  permit: '📋',
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
  const icon = DOC_ICONS[document.type] || '📄';
  const statusIcon = STATUS_ICONS[document.status];
  const statusColor = STATUS_COLORS[document.status];

  return (
    <TouchableOpacity style={styles.documentRow} onPress={onPress}>
      <View style={styles.documentInfo}>
        <Text style={styles.documentIcon}>{icon}</Text>
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
        <Text style={styles.statusIcon}>{statusIcon}</Text>
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
              <Text style={styles.noImageIcon}>📄</Text>
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

  const handleCopyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
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
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0066CC" />
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
                  <Text style={styles.copyIcon}>📋</Text>
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
                  <Text style={styles.copyIcon}>📋</Text>
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
                  <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!hasActiveTrip && !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
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
                        🔴 {expiredCount} expired
                      </Text>
                    </View>
                  )}
                  {expiringCount > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.expiring }]}>
                      <Text style={styles.statusBadgeText}>
                        ⚠️ {expiringCount} expiring soon
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
                  <Text style={styles.vehicleIcon}>🚛</Text>
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
                  <Text style={styles.vehicleIcon}>🚚</Text>
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
                <Text style={styles.emptyStateIcon}>🚛</Text>
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
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  statusSummary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  vehicleCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  vehicleHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  vehiclePlate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  documentsList: {
    paddingHorizontal: 16,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  documentLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 13,
    marginRight: 8,
  },
  notUploadedText: {
    fontSize: 13,
    color: '#9ca3af',
    marginRight: 8,
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
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  refreshHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
  // Info Card styles (Driver & Company)
  infoCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  infoCardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  infoLabel: {
    fontSize: 15,
    color: '#888',
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  callableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  phoneValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  callIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth - 40,
    maxHeight: screenHeight - 120,
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3a3a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: screenHeight * 0.5,
    backgroundColor: '#1a1a2e',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  noImageIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noImageText: {
    fontSize: 16,
    color: '#888',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
  },
  expiryBadgeLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  expiryBadgeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

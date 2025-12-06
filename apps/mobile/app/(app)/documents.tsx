/**
 * Documents Screen
 *
 * View vehicle documents and driver/company info.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVehicleDocuments } from '../../hooks/useVehicleDocuments';
import { VehicleDocument, DocumentStatus } from '../../types';
import { Icon } from '../../components/ui';
import { DocumentViewerModal, VehicleDocumentsCard } from '../../components/documents';
import { colors, typography, spacing, radius } from '../../lib/theme';

const STATUS_COLORS: Record<DocumentStatus, string> = {
  valid: colors.success,
  expiring: colors.warning,
  expired: colors.error,
  missing: colors.textMuted,
};

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

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState('');

  const handleCopyToClipboard = (text: string, label: string) => {
    Alert.alert(label, text, [{ text: 'OK' }]);
  };

  const handleCall = (phone: string) => {
    const phoneNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

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

        {/* Driver Info Section */}
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

        {/* Company Authority Section */}
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

              {(expiringCount > 0 || expiredCount > 0) && (
                <View style={styles.statusSummary}>
                  {expiredCount > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.expired }]}>
                      <Text style={styles.statusBadgeText}>{expiredCount} expired</Text>
                    </View>
                  )}
                  {expiringCount > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.expiring }]}>
                      <Text style={styles.statusBadgeText}>{expiringCount} expiring soon</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Truck Section */}
            {truck && (
              <VehicleDocumentsCard
                type="truck"
                unitNumber={truck.unit_number}
                subtitle={getTruckInfo()}
                plateNumber={truck.plate_number}
                plateState={truck.plate_state}
                documents={truck.documents}
                onDocumentPress={(doc) => handleDocumentPress(doc, `Truck ${truck.unit_number}`)}
              />
            )}

            {/* Trailer Section */}
            {trailer && (
              <VehicleDocumentsCard
                type="trailer"
                unitNumber={trailer.unit_number}
                subtitle={trailer.capacity_cuft ? `${trailer.capacity_cuft} CUFT` : undefined}
                plateNumber={trailer.plate_number}
                plateState={trailer.plate_state}
                documents={trailer.documents}
                onDocumentPress={(doc) => handleDocumentPress(doc, `Trailer ${trailer.unit_number}`)}
              />
            )}

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

        <Text style={styles.refreshHint}>Pull down to refresh</Text>
      </ScrollView>

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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
});

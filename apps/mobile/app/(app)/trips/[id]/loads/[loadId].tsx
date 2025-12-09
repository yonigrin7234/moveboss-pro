import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadDetail } from '../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../hooks/useLoadActions';
import { DocumentsSection } from '../../../../../components/load';
import { ErrorState } from '../../../../../components/ui';
import { colors, typography, spacing, radius } from '../../../../../lib/theme';
import { LoadFinancialSection } from './components/LoadFinancialSection';
import { LoadHeader } from './components/LoadHeader';
import { LoadInfoSection } from './components/LoadInfoSection';
import { LoadTimelineSection } from './components/LoadTimelineSection';
import type { LoadActions, LoadDetail } from './types';
import ErrorBoundary from '../../../../../components/ui/ErrorBoundary';

export default function LoadDetailScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Load Details' }} />
        <View style={styles.container}>
          <ErrorState title="Unable to load details" message={error} actionLabel="Retry" onAction={refetch} />
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

  const loadDetail = load as LoadDetail | null;
  const pickupAddress = getPickupAddress();
  const deliveryAddress = getDeliveryAddress();

  const handleNavigatePickup = () => openMaps(pickupAddress);
  const handleNavigateDelivery = () => openMaps(deliveryAddress);

  return (
    <ErrorBoundary fallback={<FallbackView />}>
      <>
        <Stack.Screen
          options={{
            title: load?.load_number || 'Load Details',
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
          {loadDetail && (
            <>
              <LoadHeader
                load={loadDetail}
                loadId={loadId}
                tripId={tripId}
                actions={actions as LoadActions}
                onCall={handleCall}
                onText={handleText}
              />

              <LoadInfoSection
                load={loadDetail}
                loadId={loadId}
                pickupAddress={pickupAddress}
                deliveryAddress={deliveryAddress}
                formatDate={formatDate}
                onNavigatePickup={handleNavigatePickup}
                onNavigateDelivery={handleNavigateDelivery}
                onCallPickupContact={() => handleCall(loadDetail.pickup_contact_phone || null)}
              />

              <LoadFinancialSection load={loadDetail} formatCurrency={formatCurrency} />

              <LoadTimelineSection load={loadDetail} formatDate={formatDate} />

              {/* Messages Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Messages</Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/trips/${tripId}/loads/${loadId}/messages`)}
                    style={styles.touchTarget}
                  >
                    <Text style={styles.viewAllLink}>View All</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.messageCard}
                  onPress={() => router.push(`/(app)/trips/${tripId}/loads/${loadId}/messages`)}
                >
                  <View style={styles.messageIconContainer}>
                    <Text style={styles.messageIcon}>💬</Text>
                  </View>
                  <View style={styles.messageContent}>
                    <Text style={styles.messageTitle}>Load Messages</Text>
                    <Text style={styles.messageSubtitle}>Chat about this load</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Documents Section */}
              <DocumentsSection loadId={loadId} />
            </>
          )}
        </ScrollView>
      </>
    </ErrorBoundary>
  );
}

function FallbackView() {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
    </View>
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
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  sectionTitle: {
    ...typography.headline,
    marginBottom: spacing.itemGap,
  },
  touchTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.itemGap,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  messageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIcon: {
    fontSize: 20,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  messageSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
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
  errorText: {
    ...typography.body,
    color: colors.error,
  },
});

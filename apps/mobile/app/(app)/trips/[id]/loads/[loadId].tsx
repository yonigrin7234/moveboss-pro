import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLoadDetail } from '../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../hooks/useImageUpload';
import { useLoadDocuments, DocumentType, LoadDocument } from '../../../../../hooks/useLoadDocuments';
import { useToast } from '../../../../../components/ui';
import { StatusBadge } from '../../../../../components/StatusBadge';
import { DamageDocumentation } from '../../../../../components/DamageDocumentation';
import { LoadStatus, DamageItem } from '../../../../../types';
import { colors, typography, spacing, radius, shadows } from '../../../../../lib/theme';

export default function LoadDetailScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Load Details' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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

  return (
    <>
      <Stack.Screen
        options={{
          title: load?.job_number || load?.load_number || 'Load Details',
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
        {load && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                {load.job_number && (
                  <View style={styles.jobNumberRow}>
                    <Text style={styles.jobNumberLabel}>Job #</Text>
                    <Text style={styles.jobNumber}>{load.job_number}</Text>
                  </View>
                )}
                {load.load_number && (
                  <View style={styles.loadNumberRow}>
                    <Text style={styles.loadNumberLabel}>Load #</Text>
                    <Text style={styles.loadNumberValue}>{load.load_number}</Text>
                  </View>
                )}
                {!load.job_number && !load.load_number && (
                  <Text style={styles.jobNumber}>Load</Text>
                )}
                {load.companies?.name && (
                  <Text style={styles.companyName}>{load.companies.name}</Text>
                )}
              </View>
              <StatusBadge status={load.load_status} />
            </View>

            {/* Action Card - shows next action based on status */}
            <WorkflowActionCard
              loadId={loadId}
              tripId={tripId}
              loadStatus={load.load_status}
              loadSource={load.load_source}
              postingType={load.posting_type}
              pickupCompletedAt={load.pickup_completed_at}
              actions={actions}
              balanceDue={load.balance_due_on_delivery}
              company={load.companies}
              router={router}
              deliveryOrder={load.delivery_order}
              loadUpdatedAt={load.updated_at}
            />

            {/* Contact Company Card - quick access to dispatcher */}
            {load.companies?.phone && (
              <View style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Contact Dispatcher</Text>
                  <Text style={styles.contactName}>{load.companies.name}</Text>
                  <Text style={styles.contactPhone}>{load.companies.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleCall(load.companies?.phone || null)}
                  >
                    <Text style={styles.contactButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleText(load.companies?.phone || null)}
                  >
                    <Text style={styles.contactButtonText}>Text</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Pickup Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Pickup</Text>
                {load.pickup_date && (
                  <Text style={styles.cardDate}>{formatDate(load.pickup_date)}</Text>
                )}
              </View>
              <Text style={styles.address}>{getPickupAddress()}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openMaps(getPickupAddress())}
                >
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
                {load.pickup_contact_phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(load.pickup_contact_phone)}
                  >
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
              {load.pickup_contact_name && (
                <Text style={styles.contactName}>Contact: {load.pickup_contact_name}</Text>
              )}
            </View>

            {/* Delivery Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Delivery</Text>
                {load.delivery_date && (
                  <Text style={styles.cardDate}>{formatDate(load.delivery_date)}</Text>
                )}
              </View>
              <Text style={styles.address}>{getDeliveryAddress()}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openMaps(getDeliveryAddress())}
                >
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Load Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Load Information</Text>
              <View style={styles.infoGrid}>
                {load.cubic_feet && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Estimated CUFT</Text>
                    <Text style={styles.infoValue}>{load.cubic_feet}</Text>
                  </View>
                )}
                {load.actual_cuft_loaded && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Actual CUFT</Text>
                    <Text style={styles.infoValue}>{load.actual_cuft_loaded}</Text>
                  </View>
                )}
                {load.weight_lbs_estimate && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Weight (lbs)</Text>
                    <Text style={styles.infoValue}>{load.weight_lbs_estimate.toLocaleString()}</Text>
                  </View>
                )}
                {load.pieces_count && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Pieces</Text>
                    <Text style={styles.infoValue}>{load.pieces_count}</Text>
                  </View>
                )}
              </View>
              {load.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.description}>{load.description}</Text>
                </View>
              )}
            </View>

            {/* Pre-Existing Damages - Read Only (for in_transit and delivered) */}
            {(load.load_status === 'in_transit' || load.load_status === 'delivered') &&
              load.pre_existing_damages &&
              (load.pre_existing_damages as DamageItem[]).length > 0 && (
              <View style={styles.card}>
                <DamageDocumentation loadId={loadId} readonly />
              </View>
            )}

            {/* Financial Info */}
            {(load.balance_due_on_delivery || load.amount_collected_on_delivery) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment</Text>
                <View style={styles.infoGrid}>
                  {load.balance_due_on_delivery && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Balance Due</Text>
                      <Text style={styles.infoValueLarge}>
                        {formatCurrency(load.balance_due_on_delivery)}
                      </Text>
                    </View>
                  )}
                  {load.amount_collected_on_delivery && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Collected</Text>
                      <Text style={[styles.infoValueLarge, styles.collected]}>
                        {formatCurrency(load.amount_collected_on_delivery)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Timeline */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timeline</Text>
              <View style={styles.timeline}>
                {load.accepted_at && (
                  <TimelineItem label="Accepted" time={formatDate(load.accepted_at)} />
                )}
                {load.loading_started_at && (
                  <TimelineItem label="Loading Started" time={formatDate(load.loading_started_at)} />
                )}
                {load.loading_finished_at && (
                  <TimelineItem label="Loading Finished" time={formatDate(load.loading_finished_at)} />
                )}
                {load.delivery_started_at && (
                  <TimelineItem label="In Transit" time={formatDate(load.delivery_started_at)} />
                )}
                {load.delivery_finished_at && (
                  <TimelineItem label="Delivered" time={formatDate(load.delivery_finished_at)} />
                )}
              </View>
            </View>

            {/* Documents Section */}
            <DocumentsSection loadId={loadId} />
          </>
        )}
      </ScrollView>
    </>
  );
}

// Trust Level Badge Component
function TrustLevelBadge({ trustLevel }: { trustLevel: 'trusted' | 'cod_required' }) {
  const isTrusted = trustLevel === 'trusted';
  return (
    <View style={[
      styles.trustBadge,
      isTrusted ? styles.trustBadgeTrusted : styles.trustBadgeCod
    ]}>
      <Text style={styles.trustBadgeText}>
        {isTrusted ? '✓ Trusted Company' : '⚠ Verify Before Unload'}
      </Text>
    </View>
  );
}

// Workflow Action Card
function WorkflowActionCard({
  loadId,
  tripId,
  loadStatus,
  loadSource,
  postingType,
  pickupCompletedAt,
  actions,
  balanceDue,
  company,
  router,
  deliveryOrder,
  loadUpdatedAt,
}: {
  loadId: string;
  tripId: string;
  loadStatus: LoadStatus;
  loadSource: 'own_customer' | 'partner' | 'marketplace' | null;
  postingType: 'pickup' | 'load' | 'live_load' | null;
  pickupCompletedAt: string | null;
  actions: ReturnType<typeof useLoadActions>;
  balanceDue: number | null;
  company?: { name: string; phone: string | null; trust_level?: 'trusted' | 'cod_required' } | null;
  router: ReturnType<typeof useRouter>;
  deliveryOrder: number | null;
  loadUpdatedAt: string;
}) {
  const toast = useToast();
  const trustLevel = company?.trust_level || 'cod_required';
  const [cuftInput, setCuftInput] = useState('');
  const [amountInput, setAmountInput] = useState(balanceDue?.toString() || '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Delivery order check state
  const [deliveryOrderCheck, setDeliveryOrderCheck] = useState<{
    allowed: boolean;
    reason?: string;
    checking: boolean;
  }>({ allowed: true, checking: true, reason: undefined });

  // Check delivery order when status is 'loaded' or when load/trip is updated
  useEffect(() => {
    if (loadStatus === 'loaded') {
      setDeliveryOrderCheck(prev => ({ ...prev, checking: true }));
      actions.checkDeliveryOrder().then(result => {
        setDeliveryOrderCheck({
          allowed: result.allowed,
          reason: result.reason,
          checking: false,
        });
      });
    } else {
      setDeliveryOrderCheck({ allowed: true, checking: false, reason: undefined });
    }
  }, [loadStatus, loadUpdatedAt]);

  // Check if this load requires pickup completion (pickup from customer's home)
  const requiresPickupCompletion = postingType === 'pickup' && !pickupCompletedAt;

  // Check if this load requires contract details entry after loading
  const requiresContractDetails = (loadSource === 'partner' || loadSource === 'marketplace') && !requiresPickupCompletion;

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Camera permission needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleActionWithPhoto = async (
    action: (photoUrl?: string) => Promise<{ success: boolean; error?: string }>,
    photoType: 'loading-start' | 'loading-end' | 'delivery' | 'document'
  ) => {
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;

      if (photo) {
        const uploadResult = await uploadLoadPhoto(photo, loadId, photoType);
        if (!uploadResult.success) {
          toast.error(uploadResult.error || 'Failed to upload photo');
          return;
        }
        photoUrl = uploadResult.url;
      }

      const result = await action(photoUrl);
      if (!result.success) {
        toast.error(result.error || 'Action failed');
      } else {
        setPhoto(null);
        setCuftInput('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    const result = await action();
    if (!result.success) {
      toast.error(result.error || 'Action failed');
    }
  };

  const isLoading = actions.loading || submitting || uploading;
  const buttonText = uploading ? `Uploading... ${progress}%` : submitting ? 'Saving...' : null;

  // Pending → Accept
  if (loadStatus === 'pending') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Accept Load</Text>
        <Text style={styles.actionDescription}>
          Review the load details and accept when ready
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={() => handleAction(actions.acceptLoad)}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Accepting...' : 'Accept Load'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Accepted → Start Loading
  if (loadStatus === 'accepted') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Start Loading</Text>
        <Text style={styles.actionDescription}>
          Enter starting CUFT and take a photo (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Starting CUFT"
          placeholderTextColor={colors.textMuted}
          value={cuftInput}
          onChangeText={setCuftInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={isLoading}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoButtonText}>Take Photo</Text>
          )}
        </TouchableOpacity>
        {photo && (
          <TouchableOpacity onPress={() => setPhoto(null)} disabled={isLoading}>
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={() => handleActionWithPhoto(
            (url) => actions.startLoading(cuftInput ? parseFloat(cuftInput) : undefined, url),
            'loading-start'
          )}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {buttonText || 'Start Loading'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading → Finish Loading
  if (loadStatus === 'loading') {
    const handleFinishLoading = async () => {
      setSubmitting(true);
      try {
        let photoUrl: string | undefined;

        if (photo) {
          const uploadResult = await uploadLoadPhoto(photo, loadId, 'loading-end');
          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload photo');
            return;
          }
          photoUrl = uploadResult.url;
        }

        const result = await actions.finishLoading(cuftInput ? parseFloat(cuftInput) : undefined, photoUrl);
        if (!result.success) {
          toast.error(result.error || 'Action failed');
          return;
        }

        setPhoto(null);
        setCuftInput('');
        toast.success('Loading complete');

        // Auto-navigate based on load type:
        // 1. Pickup (posting_type = 'pickup') → pickup-completion screen
        // 2. Partner/marketplace loads → contract-details screen
        // 3. Own customer → done (just set status to loaded)
        if (requiresPickupCompletion) {
          router.push(`/trips/${tripId}/loads/${loadId}/pickup-completion`);
        } else if (requiresContractDetails) {
          router.push(`/trips/${tripId}/loads/${loadId}/contract-details`);
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Finish Loading</Text>
        <Text style={styles.actionDescription}>
          Enter ending CUFT and take a photo (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ending CUFT"
          placeholderTextColor={colors.textMuted}
          value={cuftInput}
          onChangeText={setCuftInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={isLoading}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoButtonText}>Take Photo</Text>
          )}
        </TouchableOpacity>
        {photo && (
          <TouchableOpacity onPress={() => setPhoto(null)} disabled={isLoading}>
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleFinishLoading}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {buttonText || 'Finish Loading'}
          </Text>
        </TouchableOpacity>
        {requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll complete pickup details next
          </Text>
        )}
        {requiresContractDetails && !requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll enter contract details next
          </Text>
        )}
      </View>
    );
  }

  // Loaded → Start Delivery (collect payment first if balance due)
  if (loadStatus === 'loaded') {
    // Check for balance due from either field
    const effectiveBalanceDue = balanceDue || 0;
    const hasBalanceDue = effectiveBalanceDue > 0;

    // Show delivery order badge if set
    const deliveryOrderBadge = deliveryOrder ? (
      <View style={styles.deliveryOrderBadge}>
        <Text style={styles.deliveryOrderBadgeText}>Delivery #{deliveryOrder}</Text>
      </View>
    ) : null;

    // If still checking delivery order, show loading state
    if (deliveryOrderCheck.checking) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Checking delivery order...</Text>
          {deliveryOrderBadge}
        </View>
      );
    }

    // If delivery order is not allowed, show blocked state
    if (!deliveryOrderCheck.allowed) {
      return (
        <View style={[styles.actionCard, styles.blockedCard]}>
          <View style={styles.blockedHeader}>
            <Text style={styles.blockedIcon}>🔒</Text>
            <Text style={styles.blockedTitle}>Delivery Locked</Text>
          </View>
          {deliveryOrderBadge}
          <Text style={styles.blockedReason}>{deliveryOrderCheck.reason}</Text>
          <Text style={styles.blockedHint}>
            Loads must be delivered in order. Complete the earlier delivery first.
          </Text>
        </View>
      );
    }

    // If there's a balance due, redirect to collect-payment screen first
    if (hasBalanceDue) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Collect Payment & Start Delivery</Text>
          {deliveryOrderBadge}
          <TrustLevelBadge trustLevel={trustLevel} />
          <Text style={styles.actionDescription}>
            Balance due: ${effectiveBalanceDue.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`)}
          >
            <Text style={styles.primaryButtonText}>
              Collect Payment
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // No balance due - proceed directly to start delivery
    const handleStartDelivery = async () => {
      if (trustLevel === 'cod_required') {
        // Show warning toast but proceed directly (no blocking confirmation)
        toast.warning(`Verify ${company?.name || 'company'} has settled before unloading`);
      }
      await handleAction(() => actions.startDelivery());
    };

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Start Delivery</Text>
        {deliveryOrderBadge}
        <TrustLevelBadge trustLevel={trustLevel} />
        <Text style={styles.actionDescription}>
          No payment to collect - ready to deliver
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={handleStartDelivery}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Starting...' : 'Start Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // In Transit → Navigate to full-screen delivery completion
  if (loadStatus === 'in_transit') {
    return (
      <View style={styles.deliveryActionCard}>
        <Text style={styles.deliveryEmoji}>📦</Text>
        <Text style={styles.deliveryActionTitle}>Ready to Deliver?</Text>
        <Text style={styles.deliveryActionDescription}>
          Confirm when the delivery is complete
        </Text>
        <TouchableOpacity
          style={styles.completeDeliveryButton}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/complete-delivery`)}
        >
          <Text style={styles.completeDeliveryButtonText}>Complete Delivery ✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Delivered - show completion status
  if (loadStatus === 'delivered') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>Delivered</Text>
        <Text style={styles.completedDescription}>
          This load has been completed
        </Text>
      </View>
    );
  }

  // Storage completed
  if (loadStatus === 'storage_completed') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>In Storage</Text>
        <Text style={styles.completedDescription}>
          This load is in storage
        </Text>
      </View>
    );
  }

  return null;
}

// Timeline Item
function TimelineItem({ label, time }: { label: string; time: string | null }) {
  if (!time) return null;
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineTime}>{time}</Text>
      </View>
    </View>
  );
}

// Documents Section
const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'bol', label: 'BOL' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'loading_report', label: 'Loading Report' },
  { value: 'delivery_report', label: 'Delivery Report' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

function DocumentsSection({ loadId }: { loadId: string }) {
  const toast = useToast();
  const {
    documents,
    loading,
    uploading,
    uploadProgress,
    uploadDocument,
    deleteDocument,
    refetch,
  } = useLoadDocuments(loadId);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<LoadDocument | null>(null);
  const [deletedDocId, setDeletedDocId] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Camera permission needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowUploadModal(true);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Photo library permission needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    const result = await uploadDocument(selectedImage, selectedType);
    if (result.success) {
      setShowUploadModal(false);
      setSelectedImage(null);
      setSelectedType('other');
      toast.success('Document uploaded');
    } else {
      toast.error(result.error || 'Failed to upload');
    }
  };

  // Delete with undo option
  const handleDelete = async (doc: LoadDocument) => {
    setDeletedDocId(doc.id);

    toast.showToast('Document deleted', 'success', {
      duration: 5000,
      action: {
        label: 'Undo',
        onPress: () => {
          setDeletedDocId(null);
          refetch();
        },
      },
    });

    // Actually delete after delay
    setTimeout(async () => {
      if (deletedDocId === doc.id) {
        const result = await deleteDocument(doc.id);
        if (!result.success) {
          toast.error('Failed to delete');
          setDeletedDocId(null);
          refetch();
        }
      }
    }, 5000);
  };

  // Filter deleted document from view
  const visibleDocs = documents.filter(d => d.id !== deletedDocId);

  const getTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group visible documents by type
  const groupedDocs = visibleDocs.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<DocumentType, LoadDocument[]>);

  return (
    <View style={styles.card}>
      <View style={styles.documentsHeader}>
        <Text style={styles.cardTitle}>Documents</Text>
        <View style={styles.uploadButtons}>
          <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
            <Text style={styles.uploadButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={pickFromLibrary}>
            <Text style={styles.uploadButtonText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading documents...</Text>
      ) : visibleDocs.length === 0 ? (
        <Text style={styles.emptyDocsText}>No documents uploaded yet</Text>
      ) : (
        <View style={styles.documentsGrid}>
          {Object.entries(groupedDocs).map(([type, docs]) => (
            <View key={type} style={styles.docTypeGroup}>
              <Text style={styles.docTypeLabel}>{getTypeLabel(type as DocumentType)}</Text>
              <View style={styles.docThumbnails}>
                {docs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docThumbnail}
                    onPress={() => setViewingDocument(doc)}
                    onLongPress={() => handleDelete(doc)}
                  >
                    <Image source={{ uri: doc.url }} style={styles.docThumbnailImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Document</Text>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <Text style={styles.modalLabel}>Document Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroller}
            >
              {DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    selectedType === type.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedType === type.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowUploadModal(false);
                  setSelectedImage(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalUploadButton, uploading && styles.buttonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={styles.modalUploadText}>
                  {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Document Modal */}
      <Modal visible={!!viewingDocument} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.viewerOverlay}
          activeOpacity={1}
          onPress={() => setViewingDocument(null)}
        >
          {viewingDocument && (
            <Image
              source={{ uri: viewingDocument.url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewingDocument(null)}
          >
            <Text style={styles.viewerCloseText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  // Contact Company Card Styles
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
  cardDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.itemGap,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  actionButton: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoValueLarge: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  collected: {
    color: colors.success,
  },
  descriptionSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // Action Card
  actionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  actionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  // Trust Badge Styles
  trustBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    marginBottom: spacing.itemGap,
  },
  trustBadgeTrusted: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  trustBadgeCod: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  trustBadgeText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 80,
  },
  photoButtonText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
  },
  removePhotoText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  contractDetailsHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.itemGap,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  completedCard: {
    backgroundColor: colors.success,
  },
  completedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  completedDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  // Delivery Action Card (for in_transit)
  deliveryActionCard: {
    backgroundColor: colors.success,
    borderRadius: radius.card,
    padding: spacing.sectionGap,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  deliveryEmoji: {
    fontSize: 48,
    marginBottom: spacing.itemGap,
  },
  deliveryActionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  deliveryActionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sectionGap,
    textAlign: 'center',
  },
  completeDeliveryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.cardPadding,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.md,
  },
  completeDeliveryButtonText: {
    ...typography.headline,
    color: colors.success,
  },
  // Blocked Delivery Card
  blockedCard: {
    backgroundColor: colors.borderLight,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockedIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  blockedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  blockedReason: {
    ...typography.body,
    color: colors.warning,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  blockedHint: {
    ...typography.label,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  // Delivery Order Badge
  deliveryOrderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  deliveryOrderBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  // Timeline
  timeline: {
    gap: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.itemGap,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  timelineContent: {},
  timelineLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  timelineTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // States
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
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    margin: spacing.screenPadding,
  },
  errorText: {
    ...typography.bodySmall,
    color: '#991b1b',
  },
  // Documents Section
  documentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.itemGap,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  uploadButton: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  uploadButtonText: {
    ...typography.caption,
    color: colors.primary,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sectionGap,
  },
  emptyDocsText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sectionGap,
  },
  documentsGrid: {
    gap: spacing.lg,
  },
  docTypeGroup: {
    marginBottom: spacing.sm,
  },
  docTypeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  docThumbnails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docThumbnail: {
    width: 70,
    height: 70,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  docThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Upload Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.sectionGap,
    borderTopRightRadius: spacing.sectionGap,
    padding: spacing.cardPaddingLarge,
    paddingBottom: 40,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  typeScroller: {
    marginBottom: spacing.sectionGap,
  },
  typeChip: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sectionGap,
    marginRight: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
  },
  typeChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  typeChipTextSelected: {
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  modalUploadButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalUploadText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  // Document Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: spacing.cardPaddingLarge,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sectionGap,
    minHeight: 44,
    justifyContent: 'center',
  },
  viewerCloseText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});

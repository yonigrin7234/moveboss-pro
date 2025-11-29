import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLoadDetail } from '../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../hooks/useImageUpload';
import { useLoadDocuments, DocumentType, LoadDocument } from '../../../../../hooks/useLoadDocuments';
import { StatusBadge } from '../../../../../components/StatusBadge';
import { LoadStatus } from '../../../../../types';

export default function LoadDetailScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
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
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0066CC" />
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
              loadStatus={load.load_status}
              actions={actions}
              balanceDue={load.balance_due_on_delivery}
              company={load.companies}
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
                    <Text style={styles.contactButtonText}>📞 Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleText(load.companies?.phone || null)}
                  >
                    <Text style={styles.contactButtonText}>💬 Text</Text>
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
  loadStatus,
  actions,
  balanceDue,
  company,
}: {
  loadId: string;
  loadStatus: LoadStatus;
  actions: ReturnType<typeof useLoadActions>;
  balanceDue: number | null;
  company?: { name: string; phone: string | null; trust_level?: 'trusted' | 'cod_required' } | null;
}) {
  const trustLevel = company?.trust_level || 'cod_required';
  const [cuftInput, setCuftInput] = useState('');
  const [amountInput, setAmountInput] = useState(balanceDue?.toString() || '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
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
          Alert.alert('Upload Error', uploadResult.error || 'Failed to upload photo');
          return;
        }
        photoUrl = uploadResult.url;
      }

      const result = await action(photoUrl);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Action failed');
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
      Alert.alert('Error', result.error || 'Action failed');
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
          placeholderTextColor="#666"
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
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Finish Loading</Text>
        <Text style={styles.actionDescription}>
          Enter ending CUFT and take a photo (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ending CUFT"
          placeholderTextColor="#666"
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
            (url) => actions.finishLoading(cuftInput ? parseFloat(cuftInput) : undefined, url),
            'loading-end'
          )}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {buttonText || 'Finish Loading'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loaded → Start Delivery (with payment collection)
  if (loadStatus === 'loaded') {
    const handleStartDelivery = () => {
      const paymentData = {
        amountCollected: amountInput ? parseFloat(amountInput) : undefined,
      };

      if (trustLevel === 'cod_required') {
        Alert.alert(
          'Verify Before Unloading',
          `${company?.name || 'This company'} is not a trusted company.\n\nIf there's a shortfall between the rate and customer payment, call the owner to verify the company has settled before unloading.${balanceDue ? `\n\nBalance to collect from customer: $${balanceDue.toFixed(2)}` : ''}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start Delivery', onPress: () => handleAction(() => actions.startDelivery(paymentData)) },
          ]
        );
      } else {
        // Trusted company - proceed without verification
        handleAction(() => actions.startDelivery(paymentData));
      }
    };

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Collect Payment & Start Delivery</Text>
        <TrustLevelBadge trustLevel={trustLevel} />
        <Text style={styles.actionDescription}>
          {balanceDue
            ? `Balance due: $${balanceDue.toFixed(2)}`
            : 'Enter amount collected (if any)'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Amount Collected"
          placeholderTextColor="#666"
          value={amountInput}
          onChangeText={setAmountInput}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={handleStartDelivery}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Starting...' : 'Collect & Start Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // In Transit → Complete Delivery (simple confirmation)
  if (loadStatus === 'in_transit') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Complete Delivery</Text>
        <Text style={styles.actionDescription}>
          Confirm the delivery has been completed
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={() => handleAction(actions.completeDelivery)}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Completing...' : 'Complete Delivery'}
          </Text>
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
  const {
    documents,
    loading,
    uploading,
    uploadProgress,
    uploadDocument,
    deleteDocument,
  } = useLoadDocuments(loadId);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<LoadDocument | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
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
      Alert.alert('Permission Required', 'Photo library permission is needed');
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
    } else {
      Alert.alert('Upload Failed', result.error || 'Failed to upload document');
    }
  };

  const handleDelete = (doc: LoadDocument) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDocument(doc.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const getTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
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
      ) : documents.length === 0 ? (
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
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
  },
  jobNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  jobNumberLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 6,
  },
  jobNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  loadNumberLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  loadNumberValue: {
    fontSize: 14,
    color: '#aaa',
  },
  companyName: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  // Contact Company Card Styles
  contactCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#ccc',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
  },
  address: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  infoValueLarge: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  collected: {
    color: '#10b981',
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  // Action Card
  actionCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  // Trust Badge Styles
  trustBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  trustBadgeTrusted: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  trustBadgeCod: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  trustBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 80,
  },
  photoButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '700',
  },
  completedCard: {
    backgroundColor: '#10b981',
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  completedDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  // Timeline
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
    marginTop: 4,
  },
  timelineContent: {},
  timelineLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  // Documents Section
  documentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyDocsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  documentsGrid: {
    gap: 16,
  },
  docTypeGroup: {
    marginBottom: 8,
  },
  docTypeLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  docThumbnails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#3a3a4e',
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
    backgroundColor: '#2a2a3e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  typeScroller: {
    marginBottom: 20,
  },
  typeChip: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  typeChipSelected: {
    backgroundColor: '#0066CC',
  },
  typeChipText: {
    color: '#888',
    fontSize: 14,
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#3a3a4e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalUploadButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalUploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewerCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

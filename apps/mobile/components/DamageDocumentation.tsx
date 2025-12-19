/**
 * DamageDocumentation - Pre-existing damage documentation component
 *
 * Features:
 * - Required sticker photo (shows the sticker number on the item)
 * - Up to 3 damage photos per item
 * - Sticker number, item description, damage description fields
 * - Driver-friendly UX with clear instructions
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { DamageItem } from '../types';
import { useLoadActions } from '../hooks/useLoadActions';
import { useImageUpload } from '../hooks/useImageUpload';
import { useToast, Skeleton } from './ui';
import { colors, typography, spacing, radius } from '../lib/theme';

const MAX_DAMAGE_PHOTOS = 3;

interface DamageDocumentationProps {
  loadId: string;
  readonly?: boolean;
  onUpdate?: () => void;
}

export function DamageDocumentation({
  loadId,
  readonly = false,
  onUpdate,
}: DamageDocumentationProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const [loadingDamages, setLoadingDamages] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DamageItem | null>(null);
  const [deletedItemId, setDeletedItemId] = useState<string | null>(null);

  // Form state
  const [stickerNumber, setStickerNumber] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [stickerPhotoUri, setStickerPhotoUri] = useState<string | null>(null);
  const [stickerPhotoUrl, setStickerPhotoUrl] = useState<string | null>(null);
  const [damagePhotoUris, setDamagePhotoUris] = useState<string[]>([]);
  const [damagePhotoUrls, setDamagePhotoUrls] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState<'sticker' | 'damage' | null>(null);

  const actions = useLoadActions(loadId, onUpdate);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Load existing damages on mount
  useEffect(() => {
    loadDamages();
  }, [loadId]);

  const loadDamages = async () => {
    setLoadingDamages(true);
    const items = await actions.getDamages();
    // Migrate old items that only have photo_url
    const migratedItems = items.map(item => ({
      ...item,
      sticker_photo_url: item.sticker_photo_url || null,
      damage_photo_urls: item.damage_photo_urls || (item.photo_url ? [item.photo_url] : []),
    }));
    setDamages(migratedItems);
    setLoadingDamages(false);
  };

  const resetForm = () => {
    setStickerNumber('');
    setItemDescription('');
    setDamageDescription('');
    setStickerPhotoUri(null);
    setStickerPhotoUrl(null);
    setDamagePhotoUris([]);
    setDamagePhotoUrls([]);
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: DamageItem) => {
    setEditingItem(item);
    setStickerNumber(item.sticker_number);
    setItemDescription(item.item_description);
    setDamageDescription(item.damage_description);
    setStickerPhotoUrl(item.sticker_photo_url);
    setStickerPhotoUri(null);
    setDamagePhotoUrls(item.damage_photo_urls || []);
    setDamagePhotoUris([]);
    setModalVisible(true);
  };

  const takePhoto = async (type: 'sticker' | 'damage') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'sticker') {
        setStickerPhotoUri(result.assets[0].uri);
        setStickerPhotoUrl(null);
      } else {
        // Add to damage photos (max 3)
        if (damagePhotoUris.length + damagePhotoUrls.length < MAX_DAMAGE_PHOTOS) {
          setDamagePhotoUris(prev => [...prev, result.assets[0].uri]);
        } else {
          toast.warning(`Maximum ${MAX_DAMAGE_PHOTOS} damage photos allowed`);
        }
      }
    }
  };

  const removeDamagePhoto = (index: number, isUri: boolean) => {
    if (isUri) {
      setDamagePhotoUris(prev => prev.filter((_, i) => i !== index));
    } else {
      setDamagePhotoUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!stickerNumber.trim()) {
      toast.error('Enter sticker number');
      return;
    }
    if (!itemDescription.trim()) {
      toast.error('Enter item description');
      return;
    }
    if (!damageDescription.trim()) {
      toast.error('Enter damage description');
      return;
    }
    if (!stickerPhotoUri && !stickerPhotoUrl) {
      Alert.alert(
        'Sticker Photo Required',
        'You must take a photo of the sticker on the damaged item.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      // Upload sticker photo if new one was taken
      let finalStickerPhotoUrl = stickerPhotoUrl;
      if (stickerPhotoUri) {
        setUploadingType('sticker');
        const uploadResult = await uploadLoadPhoto(stickerPhotoUri, loadId, 'document');
        if (uploadResult.success && uploadResult.url) {
          finalStickerPhotoUrl = uploadResult.url;
        } else {
          toast.error('Failed to upload sticker photo');
          return;
        }
      }

      // Upload new damage photos
      setUploadingType('damage');
      const uploadedDamageUrls: string[] = [...damagePhotoUrls];
      for (const uri of damagePhotoUris) {
        const uploadResult = await uploadLoadPhoto(uri, loadId, 'document');
        if (uploadResult.success && uploadResult.url) {
          uploadedDamageUrls.push(uploadResult.url);
        }
        // Continue even if some fail
      }

      setUploadingType(null);

      const damageData = {
        sticker_number: stickerNumber.trim(),
        item_description: itemDescription.trim(),
        damage_description: damageDescription.trim(),
        photo_url: uploadedDamageUrls[0] || null, // Keep for backwards compatibility
        sticker_photo_url: finalStickerPhotoUrl,
        damage_photo_urls: uploadedDamageUrls,
      };

      if (editingItem) {
        // Update existing item
        const result = await actions.updateDamageItem(editingItem.id, damageData);

        if (!result.success) {
          toast.error(result.error || 'Failed to update');
          return;
        }
        toast.success('Damage updated');
      } else {
        // Add new item
        const result = await actions.addDamageItem(damageData);

        if (!result.success) {
          toast.error(result.error || 'Failed to add');
          return;
        }
        toast.success('Damage recorded');
      }

      // Refresh list and close modal
      await loadDamages();
      setModalVisible(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
      setUploadingType(null);
    }
  };

  // Delete with confirmation
  const handleDelete = async (item: DamageItem) => {
    Alert.alert(
      'Delete Damage Record',
      `Are you sure you want to delete the damage record for sticker #${item.sticker_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletedItemId(item.id);
            const result = await actions.removeDamageItem(item.id);
            if (!result.success) {
              toast.error('Failed to delete');
              setDeletedItemId(null);
            } else {
              toast.success('Damage record deleted');
              loadDamages();
            }
          },
        },
      ]
    );
  };

  // Filter deleted items from view
  const visibleDamages = damages.filter(d => d.id !== deletedItemId);

  const totalDamagePhotos = damagePhotoUris.length + damagePhotoUrls.length;
  const canAddMoreDamagePhotos = totalDamagePhotos < MAX_DAMAGE_PHOTOS;
  const isUploading = submitting || uploading;

  const renderDamageItem = ({ item }: { item: DamageItem }) => {
    const allPhotos = item.damage_photo_urls || (item.photo_url ? [item.photo_url] : []);

    return (
      <TouchableOpacity
        style={styles.damageItem}
        onPress={() => !readonly && openEditModal(item)}
        disabled={readonly}
        activeOpacity={readonly ? 1 : 0.7}
      >
        <View style={styles.damageItemContent}>
          <View style={styles.damageItemHeader}>
            <View style={styles.stickerBadge}>
              <Ionicons name="pricetag" size={14} color={colors.background} />
              <Text style={styles.stickerBadgeText}>#{item.sticker_number}</Text>
            </View>
            {!readonly && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.itemDescription}>{item.item_description}</Text>
          <Text style={styles.damageDescription}>{item.damage_description}</Text>

          {/* Photo thumbnails */}
          {(allPhotos.length > 0 || item.sticker_photo_url) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoThumbnailsContainer}
              contentContainerStyle={styles.photoThumbnailsContent}
            >
              {item.sticker_photo_url && (
                <View style={styles.thumbnailWrapper}>
                  <Image source={{ uri: item.sticker_photo_url }} style={styles.photoThumbnail} />
                  <View style={styles.thumbnailLabel}>
                    <Text style={styles.thumbnailLabelText}>Sticker</Text>
                  </View>
                </View>
              )}
              {allPhotos.map((url, idx) => (
                <Image key={idx} source={{ uri: url }} style={styles.photoThumbnail} />
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loadingDamages) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.skeletonHeader}>
          <Skeleton width={160} height={18} />
          <Skeleton width={28} height={28} borderRadius={14} />
        </View>
        <Skeleton width="100%" height={100} borderRadius={12} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.title}>Pre-Existing Damages</Text>
          </View>
          <Text style={styles.subtitle}>
            {readonly
              ? 'Items documented as already damaged before loading'
              : 'Document items already damaged before loading'}
          </Text>
        </View>
        {damages.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{damages.length}</Text>
          </View>
        )}
      </View>

      {visibleDamages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>
            {readonly ? 'No pre-existing damages documented' : 'No damages documented yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleDamages}
          renderItem={renderDamageItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.damageList}
        />
      )}

      {!readonly && (
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add-circle" size={24} color={colors.background} />
          <Text style={styles.addButtonText}>Add Pre-Existing Damage</Text>
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              disabled={isUploading}
            >
              <Text style={[styles.modalCancel, isUploading && styles.modalButtonDisabled]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Damage' : 'Add Damage'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isUploading}
            >
              <Text style={[styles.modalSave, isUploading && styles.modalButtonDisabled]}>
                {isUploading
                  ? uploadingType === 'sticker'
                    ? `Sticker ${progress}%`
                    : `Photos ${progress}%`
                  : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + spacing.xxxl }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sticker Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Sticker Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={stickerNumber}
                onChangeText={setStickerNumber}
                placeholder="e.g. 1234"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                editable={!isUploading}
              />
              <Text style={styles.helperText}>
                Enter the colored sticker number on the item
              </Text>
            </View>

            {/* Sticker Photo - REQUIRED */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Photo of Sticker <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.helperText}>
                Take a clear photo showing the sticker number on the item
              </Text>

              {stickerPhotoUri || stickerPhotoUrl ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: stickerPhotoUri || stickerPhotoUrl || undefined }}
                    style={styles.stickerPhotoPreview}
                  />
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => takePhoto('sticker')}
                    disabled={isUploading}
                  >
                    <Ionicons name="camera" size={18} color={colors.textPrimary} />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto('sticker')}
                  disabled={isUploading}
                >
                  <View style={styles.photoButtonContent}>
                    <Ionicons name="pricetag-outline" size={32} color={colors.primary} />
                    <Text style={styles.photoButtonText}>Take Photo of Sticker</Text>
                    <Text style={styles.photoButtonHint}>Required</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Item Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Item Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="e.g. Brown leather sofa"
                placeholderTextColor={colors.textMuted}
                editable={!isUploading}
              />
            </View>

            {/* Damage Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Damage Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                value={damageDescription}
                onChangeText={setDamageDescription}
                placeholder="Describe the existing damage (scratches, tears, dents, etc.)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                editable={!isUploading}
              />
            </View>

            {/* Damage Photos - Up to 3 */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Damage Photos ({totalDamagePhotos}/{MAX_DAMAGE_PHOTOS})
                </Text>
              </View>
              <Text style={styles.helperText}>
                Take up to {MAX_DAMAGE_PHOTOS} photos showing the damage
              </Text>

              {/* Existing photos from URLs */}
              <View style={styles.damagePhotosGrid}>
                {damagePhotoUrls.map((url, index) => (
                  <View key={`url-${index}`} style={styles.damagePhotoWrapper}>
                    <Image source={{ uri: url }} style={styles.damagePhotoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeDamagePhoto(index, false)}
                      disabled={isUploading}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* New photos from URIs */}
                {damagePhotoUris.map((uri, index) => (
                  <View key={`uri-${index}`} style={styles.damagePhotoWrapper}>
                    <Image source={{ uri }} style={styles.damagePhotoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeDamagePhoto(index, true)}
                      disabled={isUploading}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                    <View style={styles.newPhotoBadge}>
                      <Text style={styles.newPhotoBadgeText}>New</Text>
                    </View>
                  </View>
                ))}

                {/* Add photo button */}
                {canAddMoreDamagePhotos && (
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={() => takePhoto('damage')}
                    disabled={isUploading}
                  >
                    <Ionicons name="camera" size={28} color={colors.primary} />
                    <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  countBadge: {
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  damageList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  damageItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    overflow: 'hidden',
  },
  damageItemContent: {
    padding: spacing.lg,
  },
  damageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stickerBadge: {
    backgroundColor: colors.warning,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stickerBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.errorSoft,
  },
  itemDescription: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  damageDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  photoThumbnailsContainer: {
    marginTop: spacing.md,
  },
  photoThumbnailsContent: {
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  thumbnailLabelText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addButtonText: {
    ...typography.button,
    color: colors.background,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  modalSave: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Photo buttons and previews
  photoButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  photoButtonContent: {
    alignItems: 'center',
  },
  photoButtonText: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  photoButtonHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  photoPreviewContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  stickerPhotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  retakeButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },

  // Damage photos grid
  damagePhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  damagePhotoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  damagePhotoPreview: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: radius.full,
  },
  newPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  newPhotoBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButtonText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});

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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DamageItem } from '../types';
import { useLoadActions } from '../hooks/useLoadActions';
import { useImageUpload } from '../hooks/useImageUpload';
import { useToast, Skeleton, SkeletonText } from './ui';

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const actions = useLoadActions(loadId, onUpdate);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Load existing damages on mount
  useEffect(() => {
    loadDamages();
  }, [loadId]);

  const loadDamages = async () => {
    setLoadingDamages(true);
    const items = await actions.getDamages();
    setDamages(items);
    setLoadingDamages(false);
  };

  const resetForm = () => {
    setStickerNumber('');
    setItemDescription('');
    setDamageDescription('');
    setPhotoUri(null);
    setPhotoUrl(null);
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
    setPhotoUrl(item.photo_url);
    setPhotoUri(null);
    setModalVisible(true);
  };

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
      setPhotoUri(result.assets[0].uri);
      setPhotoUrl(null); // Clear any existing uploaded URL
    }
  };

  const handleSave = async () => {
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

    setSubmitting(true);
    try {
      // Upload photo if new one was taken
      let finalPhotoUrl = photoUrl;
      if (photoUri) {
        const uploadResult = await uploadLoadPhoto(photoUri, loadId, 'document');
        if (uploadResult.success && uploadResult.url) {
          finalPhotoUrl = uploadResult.url;
        }
        // Photo upload failed but not required - continue without it
      }

      if (editingItem) {
        // Update existing item
        const result = await actions.updateDamageItem(editingItem.id, {
          sticker_number: stickerNumber.trim(),
          item_description: itemDescription.trim(),
          damage_description: damageDescription.trim(),
          photo_url: finalPhotoUrl,
        });

        if (!result.success) {
          toast.error(result.error || 'Failed to update');
          return;
        }
        toast.success('Damage updated');
      } else {
        // Add new item
        const result = await actions.addDamageItem({
          sticker_number: stickerNumber.trim(),
          item_description: itemDescription.trim(),
          damage_description: damageDescription.trim(),
          photo_url: finalPhotoUrl,
        });

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
    }
  };

  // Delete with undo option
  const handleDelete = async (item: DamageItem) => {
    setDeletedItemId(item.id);

    toast.showToast('Damage record deleted', 'success', {
      duration: 5000,
      action: {
        label: 'Undo',
        onPress: () => {
          setDeletedItemId(null);
          loadDamages();
        },
      },
    });

    // Actually delete after delay
    setTimeout(async () => {
      if (deletedItemId === item.id) {
        const result = await actions.removeDamageItem(item.id);
        if (!result.success) {
          toast.error('Failed to delete');
          setDeletedItemId(null);
          loadDamages();
        }
      }
    }, 5000);
  };

  // Filter deleted items from view
  const visibleDamages = damages.filter(d => d.id !== deletedItemId);

  const renderDamageItem = ({ item }: { item: DamageItem }) => (
    <TouchableOpacity
      style={styles.damageItem}
      onPress={() => !readonly && openEditModal(item)}
      disabled={readonly}
    >
      <View style={styles.damageItemContent}>
        <View style={styles.damageItemHeader}>
          <View style={styles.stickerBadge}>
            <Text style={styles.stickerBadgeText}>#{item.sticker_number}</Text>
          </View>
          {!readonly && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>X</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.itemDescription}>{item.item_description}</Text>
        <Text style={styles.damageDescription}>{item.damage_description}</Text>
        {item.photo_url && (
          <Image source={{ uri: item.photo_url }} style={styles.damagePhoto} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loadingDamages) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.skeletonHeader}>
          <Skeleton width={160} height={18} />
          <Skeleton width={28} height={28} borderRadius={14} />
        </View>
        <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pre-Existing Damages</Text>
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
          <Text style={styles.addButtonText}>+ Add Pre-Existing Damage</Text>
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Damage' : 'Add Pre-Existing Damage'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={submitting || uploading}
            >
              <Text
                style={[
                  styles.modalSave,
                  (submitting || uploading) && styles.modalSaveDisabled,
                ]}
              >
                {submitting ? 'Saving...' : uploading ? `${progress}%` : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sticker Number *</Text>
              <TextInput
                style={styles.input}
                value={stickerNumber}
                onChangeText={setStickerNumber}
                placeholder="e.g. 1234"
                placeholderTextColor="#666"
                keyboardType="number-pad"
              />
              <Text style={styles.helperText}>
                Enter the colored sticker number on the item
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Description *</Text>
              <TextInput
                style={styles.input}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="e.g. Brown leather sofa"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Damage Description *</Text>
              <TextInput
                style={styles.textArea}
                value={damageDescription}
                onChangeText={setDamageDescription}
                placeholder="Describe the existing damage"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photo (optional but recommended)</Text>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                {photoUri || photoUrl ? (
                  <Image
                    source={{ uri: photoUri || photoUrl || undefined }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <Text style={styles.photoButtonText}>Take Photo of Damage</Text>
                )}
              </TouchableOpacity>
              {(photoUri || photoUrl) && (
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={takePhoto}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 20,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  countBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  damageList: {
    gap: 12,
    marginBottom: 16,
  },
  damageItem: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  damageItemContent: {},
  damageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stickerBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stickerBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  damageDescription: {
    fontSize: 14,
    color: '#ccc',
  },
  damagePhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
  },
  addButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  modalCancel: {
    color: '#888',
    fontSize: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  photoButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#3a3a4e',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: '#888',
    fontSize: 16,
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  retakeButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
  },
});

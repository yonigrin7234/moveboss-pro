/**
 * DocumentsSection Component
 *
 * Handles document upload, viewing, and management for loads.
 * Supports camera capture and photo library selection.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLoadDocuments, DocumentType, LoadDocument } from '../../hooks/useLoadDocuments';
import { useToast } from '../ui';
import { colors, typography, spacing, radius } from '../../lib/theme';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'bol', label: 'BOL' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'loading_report', label: 'Loading Report' },
  { value: 'delivery_report', label: 'Delivery Report' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

interface DocumentsSectionProps {
  loadId: string;
}

export function DocumentsSection({ loadId }: DocumentsSectionProps) {
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.itemGap,
  },
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
  buttonDisabled: {
    opacity: 0.6,
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

export default DocumentsSection;

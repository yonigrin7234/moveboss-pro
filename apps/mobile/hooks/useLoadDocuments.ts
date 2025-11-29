import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useImageUpload } from './useImageUpload';

export type DocumentType =
  | 'contract'
  | 'bol'
  | 'inventory'
  | 'loading_report'
  | 'delivery_report'
  | 'damage'
  | 'other';

export interface LoadDocument {
  id: string;
  loadId: string;
  type: DocumentType;
  url: string;
  caption?: string;
  createdAt: string;
}

interface UseLoadDocumentsResult {
  documents: LoadDocument[];
  loading: boolean;
  error: string | null;
  uploading: boolean;
  uploadProgress: number;
  uploadDocument: (
    localUri: string,
    type: DocumentType,
    caption?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteDocument: (documentId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
}

export function useLoadDocuments(loadId: string | null): UseLoadDocumentsResult {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { uploading, progress, uploadImage } = useImageUpload();

  const fetchDocuments = useCallback(async () => {
    if (!user || !loadId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get driver record
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      // Fetch from load_photos table
      const { data: photos, error: photosError } = await supabase
        .from('load_photos')
        .select('*')
        .eq('load_id', loadId)
        .order('created_at', { ascending: false });

      if (photosError) {
        throw photosError;
      }

      // Also fetch inline document URLs from loads table
      const { data: load, error: loadError } = await supabase
        .from('loads')
        .select(`
          contract_documents,
          signed_bol_photos,
          signed_inventory_photos,
          loading_report_photo,
          delivery_report_photo_url,
          contract_photo_url
        `)
        .eq('id', loadId)
        .single();

      if (loadError) {
        throw loadError;
      }

      // Transform load_photos to LoadDocument
      const docsFromPhotos: LoadDocument[] = (photos || []).map((photo) => ({
        id: photo.id,
        loadId: photo.load_id,
        type: mapPhotoType(photo.photo_type),
        url: photo.file_url,
        caption: photo.caption,
        createdAt: photo.created_at,
      }));

      // Add inline documents from loads table
      const inlineDocs: LoadDocument[] = [];

      // Contract documents (JSONB array)
      if (load?.contract_documents && Array.isArray(load.contract_documents)) {
        load.contract_documents.forEach((url: string, idx: number) => {
          inlineDocs.push({
            id: `contract-${idx}`,
            loadId,
            type: 'contract',
            url,
            createdAt: '',
          });
        });
      }

      // Single contract photo URL
      if (load?.contract_photo_url) {
        inlineDocs.push({
          id: 'contract-single',
          loadId,
          type: 'contract',
          url: load.contract_photo_url,
          createdAt: '',
        });
      }

      // Signed BOL photos (JSONB array)
      if (load?.signed_bol_photos && Array.isArray(load.signed_bol_photos)) {
        load.signed_bol_photos.forEach((url: string, idx: number) => {
          inlineDocs.push({
            id: `bol-${idx}`,
            loadId,
            type: 'bol',
            url,
            createdAt: '',
          });
        });
      }

      // Signed inventory photos (JSONB array)
      if (load?.signed_inventory_photos && Array.isArray(load.signed_inventory_photos)) {
        load.signed_inventory_photos.forEach((url: string, idx: number) => {
          inlineDocs.push({
            id: `inventory-${idx}`,
            loadId,
            type: 'inventory',
            url,
            createdAt: '',
          });
        });
      }

      // Loading report photo
      if (load?.loading_report_photo) {
        inlineDocs.push({
          id: 'loading-report',
          loadId,
          type: 'loading_report',
          url: load.loading_report_photo,
          createdAt: '',
        });
      }

      // Delivery report photo
      if (load?.delivery_report_photo_url) {
        inlineDocs.push({
          id: 'delivery-report',
          loadId,
          type: 'delivery_report',
          url: load.delivery_report_photo_url,
          createdAt: '',
        });
      }

      // Combine and deduplicate by URL
      const allDocs = [...docsFromPhotos, ...inlineDocs];
      const seen = new Set<string>();
      const uniqueDocs = allDocs.filter((doc) => {
        if (seen.has(doc.url)) return false;
        seen.add(doc.url);
        return true;
      });

      setDocuments(uniqueDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [user, loadId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    localUri: string,
    type: DocumentType,
    caption?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !loadId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Upload to storage
      const uploadResult = await uploadImage(localUri, 'load-photos', `${loadId}/documents`);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Get driver's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // Insert into load_photos table
      const { error: insertError } = await supabase.from('load_photos').insert({
        load_id: loadId,
        uploaded_by_id: profile?.id || user.id,
        photo_type: mapDocTypeToPhotoType(type),
        file_url: uploadResult.url,
        caption,
      });

      if (insertError) {
        throw insertError;
      }

      // Refetch documents
      await fetchDocuments();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload document',
      };
    }
  };

  const deleteDocument = async (
    documentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !loadId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Only delete from load_photos if it's a real UUID
      if (documentId.includes('-') && documentId.length > 20) {
        const { error } = await supabase
          .from('load_photos')
          .delete()
          .eq('id', documentId);

        if (error) {
          throw error;
        }
      }

      // Refetch documents
      await fetchDocuments();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete document',
      };
    }
  };

  return {
    documents,
    loading,
    error,
    uploading,
    uploadProgress: progress,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}

// Helper to map photo_type to DocumentType
function mapPhotoType(photoType: string): DocumentType {
  switch (photoType) {
    case 'loading':
    case 'loaded':
      return 'loading_report';
    case 'delivery':
      return 'delivery_report';
    case 'damage':
      return 'damage';
    case 'contract':
      return 'contract';
    case 'bol':
      return 'bol';
    case 'inventory':
      return 'inventory';
    default:
      return 'other';
  }
}

// Helper to map DocumentType to photo_type for storage
function mapDocTypeToPhotoType(type: DocumentType): string {
  switch (type) {
    case 'contract':
      return 'contract';
    case 'bol':
      return 'bol';
    case 'inventory':
      return 'inventory';
    case 'loading_report':
      return 'loading';
    case 'delivery_report':
      return 'delivery';
    case 'damage':
      return 'damage';
    default:
      return 'other';
  }
}

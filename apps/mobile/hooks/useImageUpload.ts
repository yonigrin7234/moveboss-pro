import { useState } from 'react';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

type UploadBucket = 'receipts' | 'load-photos' | 'documents';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const uploadImage = async (
    localUri: string,
    bucket: UploadBucket,
    folder?: string
  ): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setUploading(true);
      setProgress(0);

      // Read the file as base64
      const base64 = await readAsStringAsync(localUri, {
        encoding: EncodingType.Base64,
      });

      // Get file extension from URI
      const extension = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const filename = `${timestamp}-${random}.${extension}`;

      // Build the path
      const path = folder ? `${folder}/${filename}` : filename;

      setProgress(30);

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      setProgress(50);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, bytes.buffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (err) {
      console.error('Upload error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload image',
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadReceiptPhoto = async (localUri: string, tripId: string) => {
    return uploadImage(localUri, 'receipts', `trips/${tripId}`);
  };

  const uploadLoadPhoto = async (
    localUri: string,
    loadId: string,
    type: 'loading-start' | 'loading-end' | 'delivery' | 'document'
  ) => {
    return uploadImage(localUri, 'load-photos', `${loadId}/${type}`);
  };

  return {
    uploading,
    progress,
    uploadImage,
    uploadReceiptPhoto,
    uploadLoadPhoto,
  };
}

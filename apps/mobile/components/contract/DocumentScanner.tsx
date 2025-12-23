/**
 * DocumentScanner Component
 *
 * Handles document scanning with OCR for contract details:
 * - Take photo
 * - Send to OCR API
 * - Return extracted data
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://moveboss.com';

interface DocumentScannerProps {
  label: string;
  endpoint: 'loading-report' | 'bill-of-lading';
  photo: string | null;
  onPhotoTaken: (uri: string) => void;
  onDataExtracted: (data: Record<string, unknown>) => void;
}

export function DocumentScanner({
  label,
  endpoint,
  photo,
  onPhotoTaken,
  onDataExtracted,
}: DocumentScannerProps) {
  const toast = useToast();
  const [scanning, setScanning] = useState(false);

  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Camera permission needed');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  };

  const handleScan = async () => {
    const photoUri = await takePhoto();
    if (!photoUri) return;

    onPhotoTaken(photoUri);
    setScanning(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `${endpoint}.jpg`,
      } as unknown as Blob);

      const response = await fetch(`${API_BASE_URL}/api/ocr/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        onDataExtracted(result.data);
        toast.success('Scanned! Verify values are correct');
      } else {
        toast.warning(result.error || 'Could not extract data');
      }
    } catch {
      toast.error('Scan failed - enter manually');
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={handleScan}
        disabled={scanning}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.scanPreview} />
        ) : scanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>{label}</Text>
        )}
      </TouchableOpacity>

      {scanning && (
        <Text style={styles.scanningText}>Analyzing document...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  scanningText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default DocumentScanner;

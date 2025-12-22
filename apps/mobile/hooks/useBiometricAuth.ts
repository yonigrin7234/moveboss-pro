/**
 * Biometric Authentication Hook
 *
 * Provides Face ID/Touch ID authentication for quick sign in.
 * Stores user credentials securely and allows biometric unlock.
 */

import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_CREDENTIALS_KEY = 'moveboss_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'moveboss_biometric_enabled';

interface BiometricCredentials {
  email: string;
  password: string;
}

interface UseBiometricAuthResult {
  // State
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: 'face' | 'fingerprint' | 'iris' | null;
  loading: boolean;

  // Actions
  authenticate: () => Promise<boolean>;
  enableBiometric: (email: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  getStoredCredentials: () => Promise<BiometricCredentials | null>;
}

export function useBiometricAuth(): UseBiometricAuthResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'iris' | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if biometric auth is available on device
  useEffect(() => {
    async function checkAvailability() {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setIsAvailable(available);

        if (available) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('face');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('iris');
          }
        }

        // Check if biometric login is enabled for this app
        const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        setIsEnabled(enabled === 'true');
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setIsAvailable(false);
      } finally {
        setLoading(false);
      }
    }

    checkAvailability();
  }, []);

  // Authenticate with biometrics
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to MoveBoss',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }, [isAvailable]);

  // Enable biometric login by storing credentials securely
  const enableBiometric = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      // First authenticate to confirm identity
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: Platform.OS === 'ios'
          ? 'Enable Face ID for faster sign in'
          : 'Enable fingerprint for faster sign in',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!authResult.success) return false;

      // Store credentials securely
      const credentials: BiometricCredentials = { email, password };
      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials),
        {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        }
      );

      // Mark biometric as enabled
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);

      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }, [isAvailable]);

  // Disable biometric login
  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }, []);

  // Get stored credentials after successful biometric auth
  const getStoredCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as BiometricCredentials;
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  }, []);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    loading,
    authenticate,
    enableBiometric,
    disableBiometric,
    getStoredCredentials,
  };
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(type: 'face' | 'fingerprint' | 'iris' | null): string {
  switch (type) {
    case 'face':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris scan';
    default:
      return 'Biometric';
  }
}

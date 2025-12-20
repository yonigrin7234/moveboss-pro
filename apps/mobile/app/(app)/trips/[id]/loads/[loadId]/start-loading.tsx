/**
 * Start Loading Screen
 *
 * Full-screen experience for starting the loading process.
 * Requires:
 * - Starting cubic feet input
 * - Photo of truck showing starting cubic feet marker (REQUIRED)
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useDriver } from '../../../../../../providers/DriverProvider';
import { useAuth } from '../../../../../../providers/AuthProvider';
import { useToast } from '../../../../../../components/ui';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';

export default function StartLoadingScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { driverId, ownerId } = useDriver();
  const actions = useLoadActions(loadId);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  const [startingCuft, setStartingCuft] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const takePhoto = async () => {
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
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!startingCuft.trim()) {
      toast.warning('Please enter the starting cubic feet');
      return;
    }

    if (!photo) {
      Alert.alert(
        'Photo Required',
        'You must take a photo showing the starting cubic feet on the truck.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      // Upload photo
      const uploadResult = await uploadLoadPhoto(photo, loadId, 'loading-start');
      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Failed to upload photo');
        return;
      }

      // Start loading
      const result = await actions.startLoading(
        parseFloat(startingCuft),
        uploadResult.url
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to start loading');
        return;
      }

      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loadDetail', loadId] }),
        queryClient.invalidateQueries({ queryKey: ['driverTrips', user?.id, driverId, ownerId] }),
        queryClient.invalidateQueries({ queryKey: ['driverDashboard', user?.id, driverId, ownerId] }),
      ]);

      toast.success('Loading started!');
      // Continue to finish loading - wizard flow
      router.replace(`/(app)/trips/${tripId}/loads/${loadId}/finish-loading`);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || uploading || actions.loading;
  const canSubmit = startingCuft.trim() && photo && !isLoading;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Start Loading',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          presentation: 'modal',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </View>
          <Text style={styles.stepText}>Step 1 of 2</Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="cube-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>Start Loading</Text>
            <Text style={styles.subtitle}>
              Enter where you're starting on the truck and take a photo
            </Text>
          </View>

          {/* Starting CUFT Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Starting Cubic Feet <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionHint}>
              Where on the truck are you starting? (e.g., 500)
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter starting CUFT"
                placeholderTextColor={colors.textMuted}
                value={startingCuft}
                onChangeText={setStartingCuft}
                keyboardType="numeric"
                returnKeyType="done"
                editable={!isLoading}
              />
              <Text style={styles.inputSuffix}>CUFT</Text>
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photo of Starting Point <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionHint}>
              Take a photo showing the cubic feet marker on the truck
            </Text>

            {photo ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={takePhoto}
                  disabled={isLoading}
                >
                  <Ionicons name="camera" size={20} color={colors.textPrimary} />
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={takePhoto}
                disabled={isLoading}
              >
                <View style={styles.photoButtonContent}>
                  <Ionicons name="camera" size={48} color={colors.primary} />
                  <Text style={styles.photoButtonText}>Tap to Take Photo</Text>
                  <Text style={styles.photoButtonHint}>Required</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Submit Button - Fixed at bottom, above tab bar */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <Text style={styles.submitButtonText}>
                {uploading ? `Uploading... ${progress}%` : 'Starting...'}
              </Text>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stepText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    padding: spacing.lg,
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 18,
  },
  inputSuffix: {
    ...typography.body,
    color: colors.textSecondary,
    paddingRight: spacing.lg,
  },
  photoButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  photoButtonContent: {
    alignItems: 'center',
  },
  photoButtonText: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  photoButtonHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  photoPreviewContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: radius.lg,
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
  footer: {
    padding: spacing.screenPadding,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  submitButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  submitButtonText: {
    ...typography.headline,
    color: colors.background,
  },
});

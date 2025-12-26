/**
 * Finish Loading Screen
 *
 * Full-screen experience for completing the loading process.
 * Smart multi-load flow:
 * - If other loads from same company are still loading, photo is optional
 * - If this is the last load from the company, photo is required
 */

import { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useDriver } from '../../../../../../providers/DriverProvider';
import { useAuth } from '../../../../../../providers/AuthProvider';
import { useToast } from '../../../../../../components/ui';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';
import { checkSameCompanyLoads } from '../../../../../../hooks/useLoadHelpers';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';

export default function FinishLoadingScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { driverId, ownerId } = useDriver();
  const actions = useLoadActions(loadId);
  const { load, refetch: refetchLoad } = useLoadDetail(loadId);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  const [endingCuft, setEndingCuft] = useState('');
  const [loadingReportPhoto, setLoadingReportPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-load same company state
  const [checkingCompanyLoads, setCheckingCompanyLoads] = useState(true);
  const [companyLoadInfo, setCompanyLoadInfo] = useState<{
    isLastLoadFromCompany: boolean;
    otherLoadsStillLoading: number;
    companyLoadsInTrip: number;
    companyName: string | null;
  } | null>(null);

  // Check for other loads from same company when component mounts
  useEffect(() => {
    if (ownerId && tripId && loadId) {
      setCheckingCompanyLoads(true);
      checkSameCompanyLoads(loadId, tripId, ownerId)
        .then((result) => {
          setCompanyLoadInfo(result);
        })
        .finally(() => {
          setCheckingCompanyLoads(false);
        });
    }
  }, [loadId, tripId, ownerId]);

  // Pre-fill hint for ending CUFT based on starting
  const startingCuft = load?.starting_cuft;
  const cuftHint = startingCuft
    ? `Started at ${startingCuft} CUFT`
    : 'Where on the truck did you finish?';

  // Is loading report photo required?
  const photoRequired = companyLoadInfo?.isLastLoadFromCompany ?? true;
  const otherLoadsCount = companyLoadInfo?.otherLoadsStillLoading ?? 0;
  const companyName = companyLoadInfo?.companyName;

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
      setLoadingReportPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!endingCuft.trim()) {
      toast.warning('Please enter the ending cubic feet');
      return;
    }

    // Only require photo if this is the last load from the company
    if (photoRequired && !loadingReportPhoto) {
      Alert.alert(
        'Loading Report Photo Required',
        'You must take a photo of the loading report showing the customer info, balance due, and cubic feet loaded.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;

      // Upload photo if taken
      if (loadingReportPhoto) {
        const uploadResult = await uploadLoadPhoto(loadingReportPhoto, loadId, 'loading-end');
        if (!uploadResult.success) {
          toast.error(uploadResult.error || 'Failed to upload photo');
          setSubmitting(false);
          return;
        }
        photoUrl = uploadResult.url;
      }

      // Finish loading
      const result = await actions.finishLoading(parseFloat(endingCuft), photoUrl);

      if (!result.success) {
        toast.error(result.error || 'Failed to finish loading');
        setSubmitting(false);
        return;
      }

      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loadDetail', loadId] }),
        queryClient.invalidateQueries({ queryKey: ['driverTrips', user?.id, driverId, ownerId] }),
        queryClient.invalidateQueries({ queryKey: ['driverDashboard', user?.id, driverId, ownerId] }),
      ]);

      toast.success('Loading complete!');

      // Refetch load data to get fresh values for navigation decision
      const refetchResult = await refetchLoad();
      const freshLoad = refetchResult.data;

      // Check if contract details or pickup completion is needed (using fresh data)
      const postingType = freshLoad?.posting_type;
      const loadSource = freshLoad?.load_source;
      const pickupCompletedAt = freshLoad?.pickup_completed_at;

      const requiresPickupCompletion = postingType === 'pickup' && !pickupCompletedAt;
      const requiresContractDetails =
        (loadSource === 'partner' || loadSource === 'marketplace') && !requiresPickupCompletion;

      if (requiresPickupCompletion) {
        router.replace(`/(app)/trips/${tripId}/loads/${loadId}/pickup-completion`);
      } else if (requiresContractDetails) {
        router.replace(`/(app)/trips/${tripId}/loads/${loadId}/contract-details`);
      } else {
        // For own customer loads, go directly to load detail (ready for delivery)
        router.replace(`/(app)/trips/${tripId}/loads/${loadId}`);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate actual CUFT loaded
  const actualCuftLoaded =
    startingCuft && endingCuft ? parseFloat(endingCuft) - startingCuft : null;

  const isLoading = submitting || uploading || actions.loading;
  const canSubmit =
    endingCuft.trim() && (loadingReportPhoto || !photoRequired) && !isLoading && !checkingCompanyLoads;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Finish Loading',
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
            <View style={[styles.stepDot, styles.stepDotCompleted]} />
            <View style={[styles.stepLine, styles.stepLineCompleted]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 2</Text>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
            </View>
            <Text style={styles.title}>Finish Loading</Text>
            <Text style={styles.subtitle}>Document damages, enter ending CUFT, and take a photo</Text>
          </View>

          {/* Multi-load info banner */}
          {!checkingCompanyLoads && otherLoadsCount > 0 && companyName && (
            <View style={styles.multiLoadBanner}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={styles.multiLoadText}>
                {otherLoadsCount} more load{otherLoadsCount > 1 ? 's' : ''} from {companyName} still loading.
                {'\n'}Loading report photo will be required on the last one.
              </Text>
            </View>
          )}

          {/* Load Info Card */}
          <View style={styles.loadInfoCard}>
            <Text style={styles.loadInfoTitle}>Load Details</Text>
            {load?.customer_name && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Customer</Text>
                <Text style={styles.loadInfoValue}>{load.customer_name}</Text>
              </View>
            )}
            {(load?.delivery_city || load?.dropoff_city) && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Delivery</Text>
                <Text style={styles.loadInfoValue}>
                  {load.delivery_city || load.dropoff_city}, {load.delivery_state || load.dropoff_state}
                </Text>
              </View>
            )}
            {load?.balance_due_on_delivery != null && load.balance_due_on_delivery > 0 && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Balance Due</Text>
                <Text style={[styles.loadInfoValue, styles.balanceDue]}>
                  ${load.balance_due_on_delivery.toLocaleString()}
                </Text>
              </View>
            )}
            {load?.rate_per_cuft != null && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Rate</Text>
                <Text style={styles.loadInfoValue}>${load.rate_per_cuft}/cuft</Text>
              </View>
            )}
            {load?.cubic_feet != null && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Est. CUFT</Text>
                <Text style={styles.loadInfoValue}>{load.cubic_feet}</Text>
              </View>
            )}
            {startingCuft != null && (
              <View style={styles.loadInfoRow}>
                <Text style={styles.loadInfoLabel}>Started at</Text>
                <Text style={[styles.loadInfoValue, styles.startingCuft]}>{startingCuft} CUFT</Text>
              </View>
            )}
          </View>

          {/* Pre-existing Damages */}
          <View style={styles.section}>
            <DamageDocumentation loadId={loadId} />
          </View>

          {/* Ending CUFT Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ending Cubic Feet <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionHint}>{cuftHint}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter ending CUFT"
                placeholderTextColor={colors.textMuted}
                value={endingCuft}
                onChangeText={setEndingCuft}
                keyboardType="numeric"
                returnKeyType="done"
                editable={!isLoading}
              />
              <Text style={styles.inputSuffix}>CUFT</Text>
            </View>

            {/* Show calculated actual CUFT */}
            {actualCuftLoaded !== null && actualCuftLoaded > 0 && (
              <View style={styles.calculatedCuft}>
                <Ionicons name="calculator-outline" size={16} color={colors.success} />
                <Text style={styles.calculatedCuftText}>Actual loaded: {actualCuftLoaded} CUFT</Text>
              </View>
            )}
          </View>

          {/* Loading Report Photo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Loading Report Photo {photoRequired && <Text style={styles.required}>*</Text>}
              {!photoRequired && <Text style={styles.optional}>(Optional)</Text>}
            </Text>
            <Text style={styles.sectionHint}>
              {photoRequired
                ? `Take a photo of the loading report showing:\n• Customer name & job number\n• Delivery address\n• Balance due on delivery\n• Cubic feet loaded`
                : `You can skip this for now. The loading report photo will be required when you finish loading the last ${companyName} job.`}
            </Text>

            {checkingCompanyLoads ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Checking company loads...</Text>
              </View>
            ) : loadingReportPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: loadingReportPhoto }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.retakeButton} onPress={takePhoto} disabled={isLoading}>
                  <Ionicons name="camera" size={20} color={colors.textPrimary} />
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.photoButton, !photoRequired && styles.photoButtonOptional]}
                onPress={takePhoto}
                disabled={isLoading}
              >
                <View style={styles.photoButtonContent}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={photoRequired ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.photoButtonText, !photoRequired && styles.photoButtonTextOptional]}>
                    {photoRequired ? 'Take Photo of Loading Report' : 'Take Photo (Optional)'}
                  </Text>
                  <Text style={styles.photoButtonHint}>{photoRequired ? 'Required' : 'Can skip for now'}</Text>
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
                {uploading ? `Uploading... ${progress}%` : 'Finishing...'}
              </Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={colors.background} />
                <Text style={styles.submitButtonText}>Complete Loading</Text>
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
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
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
  // Multi-load banner
  multiLoadBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  multiLoadText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 20,
  },
  // Load Info Card styles
  loadInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadInfoTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  loadInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  loadInfoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loadInfoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  balanceDue: {
    color: colors.warning,
    fontWeight: '700',
  },
  startingCuft: {
    color: colors.primary,
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
    lineHeight: 20,
  },
  required: {
    color: colors.error,
  },
  optional: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '400',
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
  calculatedCuft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  calculatedCuftText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
  photoButtonOptional: {
    borderColor: colors.borderLight,
    minHeight: 120,
  },
  photoButtonContent: {
    alignItems: 'center',
  },
  photoButtonText: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  photoButtonTextOptional: {
    ...typography.body,
    color: colors.textMuted,
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
    height: 300,
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
    backgroundColor: colors.success,
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

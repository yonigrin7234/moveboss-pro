/**
 * Collect Payment - Simplified Single-Screen Experience
 *
 * Flow: Big amount → 4 payment buttons → Confirm → Done
 * Every action is 1-2 taps max.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useToast } from '../../../../../../components/ui/Toast';
import { SuccessCelebration } from '../../../../../../components/ui/SuccessCelebration';
import { PaymentCardSkeleton } from '../../../../../../components/ui/Skeleton';
import { Icon, IconName, IconWithBackground } from '../../../../../../components/ui/Icon';
import { ErrorState } from '../../../../../../components/ui';
import { colors, typography, spacing, radius, shadows } from '../../../../../../lib/theme';
import { PaymentMethod, ZelleRecipient } from '../../../../../../types';

type Step = 'select' | 'zelle' | 'photo' | 'confirm' | 'success' | 'zero_balance_warning' | 'zero_balance_auth';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: IconName; color: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'banknote', color: '#22C55E' },
  { value: 'zelle', label: 'Zelle', icon: 'phone', color: '#6366F1' },
  { value: 'cashier_check', label: 'Check', icon: 'file-text', color: '#3B82F6' },
  { value: 'already_paid', label: 'Already Paid', icon: 'check-circle', color: '#71717A' },
];

const ZELLE_OPTIONS = [
  { value: 'owner' as ZelleRecipient, label: 'Owner' },
  { value: 'driver' as ZelleRecipient, label: 'Me (Driver)' },
  { value: 'original_company' as ZelleRecipient, label: 'Company' },
];

export default function CollectPaymentScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // State
  const [step, setStep] = useState<Step>('select');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [zelleRecipient, setZelleRecipient] = useState<ZelleRecipient | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // $0 balance authorization state
  const [authorizationName, setAuthorizationName] = useState('');
  const [authorizationProofPhoto, setAuthorizationProofPhoto] = useState<string | null>(null);

  // Balance calculation
  const balanceDue =
    load?.remaining_balance_for_delivery ??
    load?.balance_due_on_delivery ??
    load?.contract_balance_due ??
    0;

  // Check if balance is zero - driver must confirm authorization
  const isZeroBalance = balanceDue === 0 || balanceDue === null;

  const customerName = load?.customer_name || load?.companies?.name || 'Customer';

  // Take photo
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Camera permission needed');
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
  }, [toast]);

  // Take authorization proof photo
  const takeAuthProofPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.error('Camera permission needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAuthorizationProofPhoto(result.assets[0].uri);
    }
  }, [toast]);

  // Handle payment method selection
  const handleSelectPayment = useCallback(
    async (method: PaymentMethod) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPaymentMethod(method);

      if (method === 'zelle') {
        setStep('zelle');
      } else if (method === 'cashier_check' || method === 'money_order' || method === 'personal_check') {
        // Open camera immediately for check
        await takePhoto();
        setStep('photo');
      } else {
        setStep('confirm');
      }
    },
    [takePhoto]
  );

  // Handle Zelle recipient selection
  const handleSelectZelle = useCallback((recipient: ZelleRecipient) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZelleRecipient(recipient);
    setStep('confirm');
  }, []);

  // Confirm and submit
  const handleConfirm = async () => {
    if (!paymentMethod) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    try {
      // Upload photo if taken
      let photoUrl: string | null = null;
      if (photo) {
        const result = await uploadLoadPhoto(photo, loadId, 'document');
        if (result.success && result.url) {
          photoUrl = result.url;
        } else {
          toast.error('Failed to upload photo');
          setSubmitting(false);
          return;
        }
      }

      // Submit payment and start delivery
      const result = await actions.collectPaymentAndStartDelivery({
        paymentMethod,
        amountCollected: balanceDue,
        zelleRecipient,
        paymentPhotoFrontUrl: photoUrl,
        paymentPhotoBackUrl: null,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to start delivery');
        setSubmitting(false);
        return;
      }

      // Show success celebration
      setStep('success');
    } catch (err) {
      toast.error('Something went wrong');
      setSubmitting(false);
    }
  };

  // Handle success completion
  const handleSuccessComplete = useCallback(() => {
    router.back();
  }, [router]);

  // Handle $0 balance authorization confirmation
  const handleZeroBalanceAuth = useCallback(async () => {
    if (!authorizationName.trim()) {
      toast.warning('Please enter who authorized the $0 balance');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    try {
      // Upload proof photo if taken
      let proofPhotoUrl: string | null = null;
      if (authorizationProofPhoto) {
        const result = await uploadLoadPhoto(authorizationProofPhoto, loadId, 'document');
        if (result.success && result.url) {
          proofPhotoUrl = result.url;
        }
      }

      // Submit with authorization info and start delivery
      const result = await actions.collectPaymentAndStartDelivery({
        paymentMethod: 'already_paid',
        amountCollected: 0,
        zelleRecipient: null,
        paymentPhotoFrontUrl: proofPhotoUrl,
        paymentPhotoBackUrl: null,
        authorizationName: authorizationName.trim(),
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to start delivery');
        setSubmitting(false);
        return;
      }

      setStep('success');
    } catch (err) {
      toast.error('Something went wrong');
      setSubmitting(false);
    }
  }, [authorizationName, authorizationProofPhoto, actions, loadId, toast, uploadLoadPhoto]);

  // Go back one step
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'zelle') setStep('select');
    else if (step === 'photo') setStep('select');
    else if (step === 'zero_balance_auth') setStep('zero_balance_warning');
    else if (step === 'zero_balance_warning') setStep('select');
    else if (step === 'confirm') {
      if (paymentMethod === 'zelle') setStep('zelle');
      else if (photo) setStep('photo');
      else setStep('select');
    }
  }, [step, paymentMethod, photo]);

  // Loading state
  if (loading || !load) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Collect Payment',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.container}>
          <PaymentCardSkeleton style={{ padding: 24 }} />
        </View>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Collect Payment' }} />
        <View style={styles.container}>
          <ErrorState title="Unable to load payment" message={error} actionLabel="Retry" onAction={refetch} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Big Amount Header */}
          <View style={[styles.header, isZeroBalance && styles.headerWarning, { paddingTop: spacing.xl + insets.top }]}>
            <Text style={styles.headerLabel}>
              {isZeroBalance ? '⚠️ BALANCE SHOWS AS' : 'AMOUNT DUE'}
            </Text>
            <Text style={[styles.amount, isZeroBalance && styles.amountWarning]}>
              ${balanceDue.toLocaleString()}
            </Text>
            <Text style={styles.customerName}>{customerName}</Text>
            {isZeroBalance && (
              <Text style={styles.zeroBalanceHint}>
                Customer may have paid directly - please confirm
              </Text>
            )}
          </View>

          {/* Step: Select Payment Method (or $0 Warning) */}
          {step === 'select' && (
            <View style={styles.content}>
              {isZeroBalance ? (
                <>
                  <Text style={styles.stepTitle}>Confirm Payment Status</Text>
                  <Text style={styles.warningText}>
                    The balance shows as $0. This may happen if the customer paid directly to the company.
                  </Text>
                  <View style={styles.zeroBalanceOptions}>
                    <Pressable
                      style={styles.zeroBalanceButton}
                      onPress={() => setStep('zero_balance_auth')}
                    >
                      <Icon name="check-circle" size={24} color={colors.success} />
                      <View style={styles.zeroBalanceButtonText}>
                        <Text style={styles.zeroBalanceButtonTitle}>Balance is $0</Text>
                        <Text style={styles.zeroBalanceButtonSubtitle}>
                          Customer already paid or no balance due
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.zeroBalanceButton}
                      onPress={() => {
                        toast.warning('Contact dispatch to update the balance');
                        router.back();
                      }}
                    >
                      <Icon name="alert-triangle" size={24} color={colors.warning} />
                      <View style={styles.zeroBalanceButtonText}>
                        <Text style={styles.zeroBalanceButtonTitle}>Balance is Wrong</Text>
                        <Text style={styles.zeroBalanceButtonSubtitle}>
                          Contact dispatch to correct it
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.stepTitle}>How did they pay?</Text>
                  <View style={styles.paymentGrid}>
                    {PAYMENT_OPTIONS.map((option) => (
                      <PaymentButton
                        key={option.value}
                        {...option}
                        onPress={() => handleSelectPayment(option.value)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step: $0 Balance Authorization */}
          {step === 'zero_balance_auth' && (
            <View style={styles.content}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
              <Text style={styles.stepTitle}>Authorization Required</Text>
              <Text style={styles.warningText}>
                Please confirm who authorized that the balance is $0.
              </Text>

              <View style={styles.authForm}>
                <Text style={styles.authLabel}>Who confirmed the $0 balance? *</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="e.g., Dispatcher John, Office confirmed"
                  placeholderTextColor={colors.textMuted}
                  value={authorizationName}
                  onChangeText={setAuthorizationName}
                />

                <Text style={[styles.authLabel, { marginTop: spacing.lg }]}>
                  Screenshot or proof (optional)
                </Text>
                {authorizationProofPhoto ? (
                  <View style={styles.authPhotoContainer}>
                    <Image source={{ uri: authorizationProofPhoto }} style={styles.authPhotoPreview} />
                    <Pressable style={styles.retakeButton} onPress={takeAuthProofPhoto}>
                      <Text style={styles.retakeText}>Retake</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.authPhotoButton} onPress={takeAuthProofPhoto}>
                    <Icon name="camera" size={24} color={colors.textSecondary} />
                    <Text style={styles.authPhotoButtonText}>
                      Take photo of message/email confirmation
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.confirmButton,
                    (!authorizationName.trim() || submitting || uploading) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleZeroBalanceAuth}
                  disabled={!authorizationName.trim() || submitting || uploading}
                >
                  {submitting || uploading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      Confirm & Start Delivery ✓
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

        {/* Step: Zelle Recipient */}
        {step === 'zelle' && (
          <View style={styles.content}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.stepTitle}>Who received the Zelle?</Text>
            <View style={styles.optionsList}>
              {ZELLE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.optionButton}
                  onPress={() => handleSelectZelle(option.value)}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Text style={styles.optionArrow}>→</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step: Photo */}
        {step === 'photo' && (
          <View style={styles.content}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.stepTitle}>Photo of Check</Text>
            {photo ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <Pressable
                    style={styles.retakeButton}
                    onPress={takePhoto}
                  >
                    <Text style={styles.retakeText}>Retake</Text>
                  </Pressable>
                  <Pressable
                    style={styles.continueButton}
                    onPress={() => setStep('confirm')}
                  >
                    <Text style={styles.continueText}>Continue →</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.cameraButton} onPress={takePhoto}>
                <Icon name="camera" size={32} color={colors.textSecondary} />
                <Text style={styles.cameraText}>Tap to take photo</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <View style={styles.content}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Confirm Payment</Text>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={styles.confirmValue}>
                  ${balanceDue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Method</Text>
                <Text style={styles.confirmValue}>
                  {PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.label}
                  {zelleRecipient && ` (to ${ZELLE_OPTIONS.find((z) => z.value === zelleRecipient)?.label})`}
                </Text>
              </View>
              {photo && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Photo</Text>
                  <Text style={styles.confirmValue}>✓ Captured</Text>
                </View>
              )}
            </View>

            <Pressable
              style={[
                styles.confirmButton,
                (submitting || uploading) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={submitting || uploading}
            >
              {submitting || uploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.confirmButtonText}>
                    Payment Collected ✓
                  </Text>
                </>
              )}
            </Pressable>

            {uploading && (
              <Text style={styles.uploadProgress}>
                Uploading... {progress}%
              </Text>
            )}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Celebration */}
      {step === 'success' && (
        <SuccessCelebration
          title="Payment Collected!"
          subtitle="Delivery started. Proceed to unload."
          icon="banknote"
          onComplete={handleSuccessComplete}
          autoDismissDelay={2500}
        />
      )}
    </>
  );
}

// Payment Button Component
interface PaymentButtonProps {
  value: PaymentMethod;
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
}

function PaymentButton({ label, icon, color, onPress }: PaymentButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.paymentButton, { borderColor: color }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <IconWithBackground
          name={icon}
          size="xl"
          color={color}
          backgroundColor={`${color}20`}
          backgroundSizeMultiplier={1.6}
        />
        <Text style={styles.paymentLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: -2,
  },
  customerName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  stepTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  paymentButton: {
    width: '45%',
    aspectRatio: 1.2,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  paymentLabel: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  optionsList: {
    gap: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  optionArrow: {
    ...typography.headline,
    color: colors.primary,
  },
  photoContainer: {
    flex: 1,
  },
  photoPreview: {
    flex: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  continueButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  continueText: {
    ...typography.button,
    color: colors.white,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  cameraIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  cameraText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confirmLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  confirmValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.glowSuccess,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
  uploadProgress: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // ScrollView content
  scrollContent: {
    flexGrow: 1,
  },
  // $0 Balance Warning styles
  headerWarning: {
    backgroundColor: `${colors.warning}15`,
  },
  amountWarning: {
    color: colors.warning,
  },
  zeroBalanceHint: {
    ...typography.bodySmall,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  zeroBalanceOptions: {
    gap: spacing.lg,
  },
  zeroBalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  zeroBalanceButtonText: {
    flex: 1,
  },
  zeroBalanceButtonTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  zeroBalanceButtonSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // Authorization form styles
  authForm: {
    marginTop: spacing.lg,
  },
  authLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  authInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    gap: spacing.md,
  },
  authPhotoButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  authPhotoContainer: {
    gap: spacing.sm,
  },
  authPhotoPreview: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
  },
});

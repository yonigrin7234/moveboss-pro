import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { PaymentMethod, ZelleRecipient } from '../../../../../../types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'cashier_check', label: "Cashier's Check", icon: '🏦' },
  { value: 'money_order', label: 'Money Order', icon: '📄' },
  { value: 'personal_check', label: 'Personal Check', icon: '✍️' },
  { value: 'zelle', label: 'Zelle', icon: '📱' },
  { value: 'already_paid', label: 'Already Paid', icon: '✅' },
];

const ZELLE_RECIPIENTS: { value: ZelleRecipient; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'driver', label: 'Driver (Me)' },
  { value: 'original_company', label: 'Original Company' },
];

export default function CollectPaymentScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [zelleRecipient, setZelleRecipient] = useState<ZelleRecipient | null>(null);
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // For pickups: use remaining_balance_for_delivery (balance minus what was collected at pickup)
  // For other loads: use balance_due_on_delivery or contract_balance_due
  const balanceDue = load?.remaining_balance_for_delivery
    ?? load?.balance_due_on_delivery
    ?? load?.contract_balance_due
    ?? 0;

  // Check if payment method requires photos
  const requiresPhotos = paymentMethod === 'cashier_check' ||
                         paymentMethod === 'money_order' ||
                         paymentMethod === 'personal_check';

  // Check if payment method requires Zelle recipient
  const requiresZelleRecipient = paymentMethod === 'zelle';

  // Validation
  const isValid =
    paymentMethod !== null &&
    confirmed &&
    (!requiresPhotos || photoFront !== null) &&
    (!requiresZelleRecipient || zelleRecipient !== null);

  const canSubmit = isValid && !submitting && !uploading;

  // Take photo helper
  const takePhoto = async (type: 'front' | 'back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'front') {
        setPhotoFront(result.assets[0].uri);
      } else {
        setPhotoBack(result.assets[0].uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !paymentMethod) return;

    setSubmitting(true);
    try {
      // Upload photos if taken
      let photoFrontUrl: string | null = null;
      let photoBackUrl: string | null = null;

      if (photoFront) {
        const result = await uploadLoadPhoto(photoFront, loadId, 'document');
        if (result.success && result.url) {
          photoFrontUrl = result.url;
        } else {
          Alert.alert('Upload Error', 'Failed to upload front photo');
          return;
        }
      }

      if (photoBack) {
        const result = await uploadLoadPhoto(photoBack, loadId, 'document');
        if (result.success && result.url) {
          photoBackUrl = result.url;
        } else {
          Alert.alert('Upload Error', 'Failed to upload back photo');
          return;
        }
      }

      // Start delivery with payment collected
      const result = await actions.collectPaymentAndStartDelivery({
        paymentMethod,
        amountCollected: balanceDue,
        zelleRecipient: zelleRecipient,
        paymentPhotoFrontUrl: photoFrontUrl,
        paymentPhotoBackUrl: photoBackUrl,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to start delivery');
        return;
      }

      // Navigate back to load detail
      Alert.alert('Payment Collected', 'Delivery started! Proceed to unload.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to start delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Collect Payment' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </>
    );
  }

  if (loading || !load) {
    return (
      <>
        <Stack.Screen options={{ title: 'Collect Payment' }} />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Collect Payment',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header with balance */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Balance Due</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balanceDue)}</Text>
          {load.companies?.name && (
            <Text style={styles.companyName}>{load.companies.name}</Text>
          )}
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.value && styles.paymentOptionSelected,
                ]}
                onPress={() => {
                  setPaymentMethod(method.value);
                  // Reset dependent fields
                  if (method.value !== 'zelle') setZelleRecipient(null);
                  if (!['cashier_check', 'money_order', 'personal_check'].includes(method.value)) {
                    setPhotoFront(null);
                    setPhotoBack(null);
                  }
                }}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text
                  style={[
                    styles.paymentLabel,
                    paymentMethod === method.value && styles.paymentLabelSelected,
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conditional: Zelle Recipient */}
        {requiresZelleRecipient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who Received the Zelle?</Text>
            <View style={styles.zelleOptions}>
              {ZELLE_RECIPIENTS.map((recipient) => (
                <TouchableOpacity
                  key={recipient.value}
                  style={[
                    styles.zelleOption,
                    zelleRecipient === recipient.value && styles.zelleOptionSelected,
                  ]}
                  onPress={() => setZelleRecipient(recipient.value)}
                >
                  <View style={styles.radioOuter}>
                    {zelleRecipient === recipient.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.zelleLabel,
                      zelleRecipient === recipient.value && styles.zelleLabelSelected,
                    ]}
                  >
                    {recipient.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Conditional: Photo Capture */}
        {requiresPhotos && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo of Payment</Text>
            <Text style={styles.sectionSubtitle}>
              Take a clear photo of the {paymentMethod === 'cashier_check' ? "cashier's check" :
                paymentMethod === 'money_order' ? 'money order' : 'check'}
            </Text>

            <View style={styles.photoRow}>
              {/* Front Photo (Required) */}
              <View style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Front *</Text>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto('front')}
                  disabled={submitting || uploading}
                >
                  {photoFront ? (
                    <Image source={{ uri: photoFront }} style={styles.photoPreview} />
                  ) : (
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  )}
                </TouchableOpacity>
                {photoFront && (
                  <TouchableOpacity
                    onPress={() => setPhotoFront(null)}
                    disabled={submitting || uploading}
                  >
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Back Photo (Optional) */}
              <View style={styles.photoContainer}>
                <Text style={styles.photoLabel}>Back (optional)</Text>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto('back')}
                  disabled={submitting || uploading}
                >
                  {photoBack ? (
                    <Image source={{ uri: photoBack }} style={styles.photoPreview} />
                  ) : (
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  )}
                </TouchableOpacity>
                {photoBack && (
                  <TouchableOpacity
                    onPress={() => setPhotoBack(null)}
                    disabled={submitting || uploading}
                  >
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Confirmation Checkbox */}
        <TouchableOpacity
          style={styles.confirmationRow}
          onPress={() => setConfirmed(!confirmed)}
          disabled={submitting || uploading}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmationText}>
            I confirm I have collected {formatCurrency(balanceDue)} from the customer
            {paymentMethod && paymentMethod !== 'already_paid' && ` via ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}`}
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitButtonText}>
            {submitting
              ? 'Starting...'
              : uploading
              ? `Uploading... ${progress}%`
              : 'Start Delivery'}
          </Text>
        </TouchableOpacity>

        {/* Skip option for $0 balance */}
        {balanceDue === 0 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setPaymentMethod('already_paid');
              setConfirmed(true);
            }}
            disabled={submitting || uploading}
          >
            <Text style={styles.skipButtonText}>No Payment Needed</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  companyName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentOption: {
    width: '31%',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  paymentIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  paymentLabelSelected: {
    color: '#0066CC',
    fontWeight: '600',
  },
  zelleOptions: {
    gap: 12,
  },
  zelleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  zelleOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066CC',
  },
  zelleLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  zelleLabelSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  photoContainer: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  photoButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: '#888',
    fontSize: 14,
  },
  photoPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bottomSpacer: {
    height: 40,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});

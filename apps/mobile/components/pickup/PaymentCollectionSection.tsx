/**
 * PaymentCollectionSection Component
 *
 * Handles payment collection at pickup:
 * - Amount collected input
 * - Payment method selection grid
 * - Zelle recipient selection
 * - Payment photo capture (for checks)
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Icon, IconName } from '../ui';
import { PaymentMethod, ZelleRecipient } from '../../types';
import { colors, typography, spacing, radius } from '../../lib/theme';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'cashier_check', label: "Cashier's Check", icon: 'credit-card' },
  { value: 'money_order', label: 'Money Order', icon: 'file-text' },
  { value: 'personal_check', label: 'Personal Check', icon: 'edit' },
  { value: 'zelle', label: 'Zelle', icon: 'phone' },
];

const ZELLE_RECIPIENTS: { value: ZelleRecipient; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'driver', label: 'Driver (Me)' },
  { value: 'original_company', label: 'Original Company' },
];

interface PaymentCollectionSectionProps {
  amountCollected: string;
  onAmountChange: (value: string) => void;
  paymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  zelleRecipient: ZelleRecipient | null;
  onZelleRecipientChange: (recipient: ZelleRecipient) => void;
  paymentPhotoFront: string | null;
  paymentPhotoBack: string | null;
  onTakePaymentPhoto: (type: 'front' | 'back') => Promise<void>;
  disabled?: boolean;
}

export function PaymentCollectionSection({
  amountCollected,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  zelleRecipient,
  onZelleRecipientChange,
  paymentPhotoFront,
  paymentPhotoBack,
  onTakePaymentPhoto,
  disabled = false,
}: PaymentCollectionSectionProps) {
  const collectedNum = parseFloat(amountCollected) || 0;

  const requiresPhotos =
    paymentMethod === 'cashier_check' ||
    paymentMethod === 'money_order' ||
    paymentMethod === 'personal_check';

  const requiresZelleRecipient = paymentMethod === 'zelle';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment at Pickup</Text>
      <Text style={styles.sectionSubtitle}>Customer may pay partial or full balance now</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount Collected</Text>
        <View style={styles.currencyInput}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.inputWithPrefix}
            value={amountCollected}
            onChangeText={onAmountChange}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {collectedNum > 0 && (
        <>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.value && styles.paymentOptionSelected,
                ]}
                onPress={() => onPaymentMethodChange(method.value)}
              >
                <Icon
                  name={method.icon}
                  size="lg"
                  color={paymentMethod === method.value ? colors.primary : colors.textSecondary}
                />
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

          {/* Zelle Recipient */}
          {requiresZelleRecipient && (
            <View style={styles.zelleSection}>
              <Text style={styles.label}>Who Received the Zelle?</Text>
              <View style={styles.zelleOptions}>
                {ZELLE_RECIPIENTS.map((recipient) => (
                  <TouchableOpacity
                    key={recipient.value}
                    style={[
                      styles.zelleOption,
                      zelleRecipient === recipient.value && styles.zelleOptionSelected,
                    ]}
                    onPress={() => onZelleRecipientChange(recipient.value)}
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

          {/* Payment Photos */}
          {requiresPhotos && (
            <View style={styles.photoSection}>
              <Text style={styles.label}>Payment Photo</Text>
              <View style={styles.photoRow}>
                <View style={styles.photoContainer}>
                  <Text style={styles.photoLabel}>Front *</Text>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => onTakePaymentPhoto('front')}
                    disabled={disabled}
                  >
                    {paymentPhotoFront ? (
                      <Image source={{ uri: paymentPhotoFront }} style={styles.photoPreview} />
                    ) : (
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.photoContainer}>
                  <Text style={styles.photoLabel}>Back (optional)</Text>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => onTakePaymentPhoto('back')}
                    disabled={disabled}
                  >
                    {paymentPhotoBack ? (
                      <Image source={{ uri: paymentPhotoBack }} style={styles.photoPreview} />
                    ) : (
                      <Text style={styles.photoButtonText}>Take Photo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    minHeight: 52,
    paddingLeft: spacing.cardPadding,
  },
  currencyPrefix: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  inputWithPrefix: {
    flex: 1,
    paddingVertical: spacing.cardPadding,
    paddingRight: spacing.cardPadding,
    paddingLeft: spacing.xs,
    fontSize: 16,
    color: colors.textPrimary,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentOption: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.itemGap,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  paymentLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentLabelSelected: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  zelleSection: {
    marginBottom: spacing.lg,
  },
  zelleOptions: {
    gap: spacing.sm,
  },
  zelleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.cardPadding,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  zelleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: spacing.itemGap,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  zelleLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  zelleLabelSelected: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  photoSection: {
    marginBottom: spacing.lg,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  photoContainer: {
    flex: 1,
  },
  photoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  photoButton: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  photoPreview: {
    width: '100%',
    height: 80,
    borderRadius: radius.sm,
  },
});

export default PaymentCollectionSection;

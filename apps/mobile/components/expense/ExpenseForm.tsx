/**
 * ExpenseForm Component
 *
 * Premium form for adding new expenses with:
 * - Category selection with icons
 * - Amount input
 * - Description
 * - Paid by selection
 * - Receipt photo
 */

import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ExpenseCategory, ExpensePaidBy } from '../../types';
import { Icon, IconName } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: IconName }[] = [
  { value: 'fuel', label: 'Fuel', icon: 'fuel' },
  { value: 'tolls', label: 'Tolls', icon: 'credit-card' },
  { value: 'lumper', label: 'Lumper', icon: 'package' },
  { value: 'parking', label: 'Parking', icon: 'map-pin' },
  { value: 'maintenance', label: 'Maint.', icon: 'tool' },
  { value: 'other', label: 'Other', icon: 'more-horizontal' },
];

const PAID_BY_OPTIONS: { value: ExpensePaidBy; label: string; icon: IconName }[] = [
  { value: 'driver_personal', label: 'Personal', icon: 'credit-card' },
  { value: 'driver_cash', label: 'Cash', icon: 'dollar' },
  { value: 'company_card', label: 'Company', icon: 'briefcase' },
  { value: 'fuel_card', label: 'Fuel Card', icon: 'fuel' },
];

interface ExpenseFormProps {
  category: ExpenseCategory;
  onCategoryChange: (category: ExpenseCategory) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  paidBy: ExpensePaidBy;
  onPaidByChange: (paidBy: ExpensePaidBy) => void;
  receiptImage: string | null;
  onReceiptImageChange: (uri: string | null) => void;
  uploading: boolean;
  uploadProgress: number;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onCameraPermissionDenied: () => void;
}

export function ExpenseForm({
  category,
  onCategoryChange,
  amount,
  onAmountChange,
  description,
  onDescriptionChange,
  paidBy,
  onPaidByChange,
  receiptImage,
  onReceiptImageChange,
  uploading,
  uploadProgress,
  submitting,
  onSubmit,
  onCancel,
  onCameraPermissionDenied,
}: ExpenseFormProps) {
  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  const handleCategoryChange = (newCategory: ExpenseCategory) => {
    Haptics.selectionAsync();
    onCategoryChange(newCategory);
  };

  const handlePaidByChange = (newPaidBy: ExpensePaidBy) => {
    Haptics.selectionAsync();
    onPaidByChange(newPaidBy);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      onCameraPermissionDenied();
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReceiptImageChange(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <Icon name="plus-circle" size="md" color={colors.primary} />
        <Text style={styles.formTitle}>New Expense</Text>
      </View>

      {/* Category Selection */}
      <Text style={styles.inputLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {EXPENSE_CATEGORIES.map((cat) => {
          const isSelected = category === cat.value;
          return (
            <Pressable
              key={cat.value}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => handleCategoryChange(cat.value)}
            >
              <Icon
                name={cat.icon}
                size="sm"
                color={isSelected ? colors.white : colors.textMuted}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Amount */}
      <Text style={styles.inputLabel}>Amount</Text>
      <View style={styles.amountInput}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          ref={amountInputRef}
          style={styles.amountTextInput}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>

      {/* Description */}
      <Text style={styles.inputLabel}>Description (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Diesel at Flying J"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={onDescriptionChange}
      />

      {/* Paid By */}
      <Text style={styles.inputLabel}>Paid With</Text>
      <View style={styles.paidByGrid}>
        {PAID_BY_OPTIONS.map((opt) => {
          const isSelected = paidBy === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.paidByChip,
                isSelected && styles.paidByChipSelected,
              ]}
              onPress={() => handlePaidByChange(opt.value)}
            >
              <Icon
                name={opt.icon}
                size="sm"
                color={isSelected ? colors.white : colors.textMuted}
              />
              <Text
                style={[
                  styles.paidByChipText,
                  isSelected && styles.paidByChipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Receipt Photo */}
      <Text style={styles.inputLabel}>Receipt (optional)</Text>
      <Pressable
        style={styles.photoButton}
        onPress={pickImage}
        disabled={submitting}
      >
        {receiptImage ? (
          <View style={styles.receiptContainer}>
            <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
            {uploading && (
              <View style={styles.uploadOverlay}>
                <Text style={styles.uploadText}>Uploading... {uploadProgress}%</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Icon name="camera" size={24} color={colors.primary} />
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </View>
        )}
      </Pressable>
      {receiptImage && !submitting && (
        <Pressable
          style={styles.removePhotoButton}
          onPress={() => onReceiptImageChange(null)}
        >
          <Icon name="x" size="sm" color={colors.error} />
          <Text style={styles.removePhotoText}>Remove Photo</Text>
        </Pressable>
      )}

      {/* Form Actions */}
      <View style={styles.formActions}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSubmit();
          }}
          disabled={submitting}
        >
          {submitting ? (
            <Text style={styles.submitButtonText}>
              {uploading ? `Uploading... ${uploadProgress}%` : 'Saving...'}
            </Text>
          ) : (
            <>
              <Icon name="plus" size="sm" color={colors.white} />
              <Text style={styles.submitButtonText}>Add Expense</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  amountInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    ...typography.headline,
    color: colors.textMuted,
  },
  amountTextInput: {
    flex: 1,
    ...typography.headline,
    color: colors.textPrimary,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paidByGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paidByChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paidByChipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  paidByChipTextSelected: {
    color: colors.white,
  },
  photoButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholder: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
  receiptContainer: {
    width: '100%',
    position: 'relative',
  },
  receiptPreview: {
    width: '100%',
    height: 150,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    ...typography.subheadline,
    color: colors.white,
    fontWeight: '600',
  },
  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.sm,
  },
  removePhotoText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.button,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default ExpenseForm;

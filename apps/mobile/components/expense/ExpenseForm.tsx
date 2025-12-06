/**
 * ExpenseForm Component
 *
 * Form for adding new expenses with:
 * - Category selection
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ExpenseCategory, ExpensePaidBy } from '../../types';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'tolls', label: 'Tolls' },
  { value: 'lumper', label: 'Lumper' },
  { value: 'parking', label: 'Parking' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const PAID_BY_OPTIONS: { value: ExpensePaidBy; label: string }[] = [
  { value: 'driver_personal', label: 'Personal Card' },
  { value: 'driver_cash', label: 'Cash' },
  { value: 'company_card', label: 'Company Card' },
  { value: 'fuel_card', label: 'Fuel Card' },
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
      onReceiptImageChange(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>New Expense</Text>

      {/* Category Selection */}
      <Text style={styles.inputLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {EXPENSE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              category === cat.value && styles.categoryChipSelected,
            ]}
            onPress={() => onCategoryChange(cat.value)}
          >
            <Text
              style={[
                styles.categoryChipText,
                category === cat.value && styles.categoryChipTextSelected,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Amount */}
      <Text style={styles.inputLabel}>Amount</Text>
      <View style={styles.amountInput}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          ref={amountInputRef}
          style={styles.amountTextInput}
          placeholder="0.00"
          placeholderTextColor="#666"
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
        placeholderTextColor="#666"
        value={description}
        onChangeText={onDescriptionChange}
      />

      {/* Paid By */}
      <Text style={styles.inputLabel}>Paid By</Text>
      <View style={styles.paidByGrid}>
        {PAID_BY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.paidByChip,
              paidBy === opt.value && styles.paidByChipSelected,
            ]}
            onPress={() => onPaidByChange(opt.value)}
          >
            <Text
              style={[
                styles.paidByChipText,
                paidBy === opt.value && styles.paidByChipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Receipt Photo */}
      <Text style={styles.inputLabel}>Receipt (optional)</Text>
      <TouchableOpacity
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
          <Text style={styles.photoButtonText}>Take Photo</Text>
        )}
      </TouchableOpacity>
      {receiptImage && !submitting && (
        <TouchableOpacity
          style={styles.removePhotoButton}
          onPress={() => onReceiptImageChange(null)}
        >
          <Text style={styles.removePhotoText}>Remove Photo</Text>
        </TouchableOpacity>
      )}

      {/* Form Actions */}
      <View style={styles.formActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting
              ? (uploading ? `Uploading... ${uploadProgress}%` : 'Saving...')
              : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryChip: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#0066CC',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  amountInput: {
    backgroundColor: '#3a3a4e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    color: '#888',
    fontSize: 20,
    fontWeight: '600',
  },
  amountTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    padding: 14,
  },
  input: {
    backgroundColor: '#3a3a4e',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  paidByGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  paidByChip: {
    backgroundColor: '#3a3a4e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  paidByChipSelected: {
    backgroundColor: '#0066CC',
  },
  paidByChipText: {
    color: '#888',
    fontSize: 14,
  },
  paidByChipTextSelected: {
    color: '#fff',
  },
  photoButton: {
    backgroundColor: '#3a3a4e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 100,
  },
  photoButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
  },
  receiptContainer: {
    width: '100%',
    position: 'relative',
  },
  receiptPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removePhotoButton: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#3a3a4e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#0066CC',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpenseForm;

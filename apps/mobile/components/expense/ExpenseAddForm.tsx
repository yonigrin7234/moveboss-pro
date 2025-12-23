/**
 * ExpenseAddForm Component
 *
 * Collapsible expense add form with premium styling.
 * Shows a prominent "Add Expense" button when collapsed.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ExpenseForm } from './ExpenseForm';
import { Icon } from '../ui/Icon';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import type { useToast } from '../ui';
import type { CreateExpenseInput } from '../../hooks/useExpenseActions';
import type { ExpenseCategory, ExpensePaidBy } from '../../types';

type ToastApi = ReturnType<typeof useToast>;

type ExpenseAddFormProps = {
  tripId: string;
  createExpense: (input: CreateExpenseInput) => Promise<{ success: boolean; error?: string }>;
  toast: ToastApi;
};

export function ExpenseAddForm({ tripId, createExpense, toast }: ExpenseAddFormProps) {
  const { uploading, progress, uploadReceiptPhoto } = useImageUpload();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('driver_personal');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setCategory('fuel');
    setAmount('');
    setDescription('');
    setPaidBy('driver_personal');
    setReceiptImage(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSubmitting(true);

    try {
      let receiptUrl: string | undefined;

      if (receiptImage) {
        const uploadResult = await uploadReceiptPhoto(receiptImage, tripId);
        if (!uploadResult.success) {
          toast.error(uploadResult.error || 'Failed to upload receipt');
          setSubmitting(false);
          return;
        }
        receiptUrl = uploadResult.url;
      }

      const input: CreateExpenseInput = {
        category,
        amount: parseFloat(amount),
        description: description || undefined,
        paidBy,
        receiptPhotoUrl: receiptUrl,
      };

      const result = await createExpense(input);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`$${parseFloat(amount).toFixed(2)} ${category} added`);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to add expense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <Pressable
        style={styles.addButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowForm(true);
        }}
      >
        <View style={styles.addButtonIcon}>
          <Icon name="plus" size="md" color={colors.white} />
        </View>
        <View style={styles.addButtonContent}>
          <Text style={styles.addButtonTitle}>Add Expense</Text>
          <Text style={styles.addButtonSubtitle}>Record fuel, tolls, lumper fees & more</Text>
        </View>
        <Icon name="chevron-right" size="md" color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View>
      <ExpenseForm
        category={category}
        onCategoryChange={setCategory}
        amount={amount}
        onAmountChange={setAmount}
        description={description}
        onDescriptionChange={setDescription}
        paidBy={paidBy}
        onPaidByChange={setPaidBy}
        receiptImage={receiptImage}
        onReceiptImageChange={setReceiptImage}
        uploading={uploading}
        uploadProgress={progress}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onCameraPermissionDenied={() => toast.warning('Camera permission needed for receipt photos')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    ...shadows.md,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  addButtonContent: {
    flex: 1,
  },
  addButtonTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  addButtonSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});

export default ExpenseAddForm;

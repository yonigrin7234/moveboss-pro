import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ExpenseForm } from './ExpenseForm';
import { colors, spacing } from '../../lib/theme';
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
      <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
        <Text style={styles.addButtonText}>+ Add Expense</Text>
      </TouchableOpacity>
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
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});










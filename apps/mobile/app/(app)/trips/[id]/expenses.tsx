/**
 * Expenses Screen
 *
 * Manage trip expenses with add/delete functionality.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTripExpenses, useExpenseActions, CreateExpenseInput } from '../../../../hooks/useExpenseActions';
import { useImageUpload } from '../../../../hooks/useImageUpload';
import { useToast, SkeletonCard, SkeletonStats } from '../../../../components/ui';
import { ExpenseSummaryCard, ExpenseForm, ExpenseItem } from '../../../../components/expense';
import { ExpenseCategory, ExpensePaidBy, TripExpense } from '../../../../types';

export default function ExpensesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { expenses, loading, error, refetch } = useTripExpenses(tripId);
  const actions = useExpenseActions(tripId, refetch);
  const { uploading, progress, uploadReceiptPhoto } = useImageUpload();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('driver_personal');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletedExpense, setDeletedExpense] = useState<TripExpense | null>(null);

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

      const result = await actions.createExpense(input);
      if (result.success) {
        resetForm();
        toast.success(`$${parseFloat(amount).toFixed(2)} ${category} added`);
      } else {
        toast.error(result.error || 'Failed to add expense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense: TripExpense) => {
    setDeletedExpense(expense);

    toast.showToast(
      `$${expense.amount.toFixed(2)} expense deleted`,
      'success',
      {
        duration: 5000,
        action: {
          label: 'Undo',
          onPress: async () => {
            setDeletedExpense(null);
            await refetch();
          },
        },
      }
    );

    setTimeout(async () => {
      if (deletedExpense?.id === expense.id) {
        const result = await actions.deleteExpense(expense.id);
        if (!result.success) {
          toast.error('Failed to delete expense');
          setDeletedExpense(null);
          await refetch();
        }
      }
    }, 5000);
  };

  const visibleExpenses = expenses.filter(e => e.id !== deletedExpense?.id);
  const totalExpenses = visibleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursable = visibleExpenses
    .filter(e => e.paid_by === 'driver_personal' || e.paid_by === 'driver_cash')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trip Expenses',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#0066CC" />
          }
        >
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading && expenses.length === 0 ? (
            <SkeletonStats style={{ marginBottom: 20 }} />
          ) : (
            <ExpenseSummaryCard
              totalExpenses={totalExpenses}
              reimbursable={reimbursable}
            />
          )}

          {!showForm ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add Expense</Text>
            </TouchableOpacity>
          ) : (
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
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Expenses ({visibleExpenses.length})
            </Text>
            {loading && expenses.length === 0 ? (
              <SkeletonCard lines={3} style={{ marginBottom: 12 }} />
            ) : visibleExpenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No expenses recorded</Text>
              </View>
            ) : (
              <View style={styles.expensesList}>
                {visibleExpenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onLongPress={() => handleDelete(expense)}
                  />
                ))}
              </View>
            )}
            <Text style={styles.hint}>Hold to delete • Undo available for 5 seconds</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  addButton: {
    backgroundColor: '#0066CC',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  expensesList: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});

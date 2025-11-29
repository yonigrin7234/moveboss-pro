import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTripExpenses, useExpenseActions, CreateExpenseInput } from '../../../../hooks/useExpenseActions';
import { ExpenseCategory, ExpensePaidBy, TripExpense } from '../../../../types';

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

export default function ExpensesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { expenses, loading, error, refetch } = useTripExpenses(tripId);
  const actions = useExpenseActions(tripId, refetch);
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('driver_personal');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const resetForm = () => {
    setCategory('fuel');
    setAmount('');
    setDescription('');
    setPaidBy('driver_personal');
    setReceiptImage(null);
    setShowForm(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take receipt photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const input: CreateExpenseInput = {
      category,
      amount: parseFloat(amount),
      description: description || undefined,
      paidBy,
      // Note: In production, you'd upload the image to storage first
      // and pass the URL here. For now, we'll skip the photo upload.
    };

    const result = await actions.createExpense(input);
    if (result.success) {
      resetForm();
    } else {
      Alert.alert('Error', result.error || 'Failed to add expense');
    }
  };

  const handleDelete = (expense: TripExpense) => {
    Alert.alert(
      'Delete Expense',
      `Delete this ${expense.category} expense for $${expense.amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await actions.deleteExpense(expense.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursable = expenses
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

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Reimbursable</Text>
              <Text style={[styles.summaryValue, styles.reimbursable]}>
                {formatCurrency(reimbursable)}
              </Text>
            </View>
          </View>

          {/* Add Expense Button or Form */}
          {!showForm ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add Expense</Text>
            </TouchableOpacity>
          ) : (
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
                    onPress={() => setCategory(cat.value)}
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
                  style={styles.amountTextInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Diesel at Flying J"
                placeholderTextColor="#666"
                value={description}
                onChangeText={setDescription}
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
                    onPress={() => setPaidBy(opt.value)}
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
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                {receiptImage ? (
                  <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                ) : (
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                )}
              </TouchableOpacity>

              {/* Form Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, actions.loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={actions.loading}
                >
                  <Text style={styles.submitButtonText}>
                    {actions.loading ? 'Adding...' : 'Add Expense'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Expenses List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Expenses ({expenses.length})
            </Text>
            {expenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No expenses recorded</Text>
              </View>
            ) : (
              <View style={styles.expensesList}>
                {expenses.map((expense) => (
                  <TouchableOpacity
                    key={expense.id}
                    style={styles.expenseItem}
                    onLongPress={() => handleDelete(expense)}
                  >
                    <View style={styles.expenseLeft}>
                      <View style={styles.expenseHeader}>
                        <Text style={styles.expenseCategory}>
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                        </Text>
                        {(expense.paid_by === 'driver_personal' || expense.paid_by === 'driver_cash') && (
                          <View style={styles.reimbursableBadge}>
                            <Text style={styles.reimbursableBadgeText}>Reimbursable</Text>
                          </View>
                        )}
                      </View>
                      {expense.description && (
                        <Text style={styles.expenseDescription}>{expense.description}</Text>
                      )}
                      <Text style={styles.expenseDate}>{formatDate(expense.incurred_at)}</Text>
                    </View>
                    <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.hint}>Long press an expense to delete</Text>
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
  // Summary Card
  summaryCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#3a3a4e',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  reimbursable: {
    color: '#10b981',
  },
  // Add Button
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
  // Form Card
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
  receiptPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
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
  // Expenses List
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
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseCategory: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  reimbursableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reimbursableBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  // Empty state
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
  // Error
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

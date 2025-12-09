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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTripExpenses, useExpenseActions } from '../../../../hooks/useExpenseActions';
import { useToast, SkeletonCard, SkeletonStats, ErrorState } from '../../../../components/ui';
import { ExpenseSummaryCard, ExpenseItem, ExpenseAddForm } from '../../../../components/expense';
import { TripExpense } from '../../../../types';
import ErrorBoundary from '../../../../components/ui/ErrorBoundary';

export default function ExpensesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { expenses, loading, error, refetch } = useTripExpenses(tripId);
  const actions = useExpenseActions(tripId, refetch);
  const toast = useToast();

  const [deletedExpense, setDeletedExpense] = useState<TripExpense | null>(null);

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
    <ErrorBoundary fallback={<FallbackView />}>
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
              <View style={{ marginBottom: 12 }}>
                <ErrorState title="Unable to load expenses" message={error} actionLabel="Retry" onAction={refetch} />
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

            <ExpenseAddForm
              tripId={tripId}
              createExpense={actions.createExpense}
              toast={toast}
            />

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
    </ErrorBoundary>
  );
}

function FallbackView() {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.emptyText}>Something went wrong. Please try again.</Text>
    </View>
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
});

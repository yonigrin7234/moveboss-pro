/**
 * Expenses Screen
 *
 * Manage trip expenses with add/delete functionality.
 * Premium UI with proper navigation.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTripExpenses, useExpenseActions } from '../../../../hooks/useExpenseActions';
import { useToast, SkeletonCard, SkeletonStats, ErrorState, Icon } from '../../../../components/ui';
import { ExpenseSummaryCard, ExpenseItem, ExpenseAddForm } from '../../../../components/expense';
import { TripExpense } from '../../../../types';
import ErrorBoundary from '../../../../components/ui/ErrorBoundary';
import { colors, typography, spacing, radius, shadows } from '../../../../lib/theme';

export default function ExpensesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const { expenses, loading, error, refetch } = useTripExpenses(tripId);
  const actions = useExpenseActions(tripId, refetch);
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [deletedExpense, setDeletedExpense] = useState<TripExpense | null>(null);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleDelete = async (expense: TripExpense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Group expenses by category for summary
  const categoryTotals = visibleExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ErrorBoundary fallback={<FallbackView />}>
      <>
        <Stack.Screen
          options={{
            title: 'Trip Expenses',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Icon name="chevron-left" size="md" color={colors.textPrimary} />
              </Pressable>
            ),
          }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing.xxxl }
            ]}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <View style={{ marginBottom: spacing.lg }}>
                <ErrorState
                  title="Unable to load expenses"
                  message={error}
                  actionLabel="Retry"
                  onAction={refetch}
                />
              </View>
            )}

            {loading && expenses.length === 0 ? (
              <SkeletonStats style={{ marginBottom: spacing.lg }} />
            ) : (
              <ExpenseSummaryCard
                totalExpenses={totalExpenses}
                reimbursable={reimbursable}
                categoryTotals={categoryTotals}
                expenseCount={visibleExpenses.length}
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
                <SkeletonCard lines={3} style={{ marginBottom: spacing.md }} />
              ) : visibleExpenses.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="receipt" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Expenses Yet</Text>
                  <Text style={styles.emptyText}>
                    Add your first expense above
                  </Text>
                </View>
              ) : (
                <View style={styles.expensesList}>
                  {visibleExpenses.map((expense) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      onDelete={() => handleDelete(expense)}
                    />
                  ))}
                </View>
              )}
              {visibleExpenses.length > 0 && (
                <Text style={styles.hint}>
                  Swipe left or hold to delete
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    </ErrorBoundary>
  );
}

function FallbackView() {
  return (
    <View style={[styles.container, styles.fallbackContainer]}>
      <Icon name="alert-circle" size={48} color={colors.textMuted} />
      <Text style={styles.emptyText}>Something went wrong. Please try again.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  expensesList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

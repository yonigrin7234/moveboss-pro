import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TripExpense, ExpenseCategory, ExpensePaidBy } from '../types';
import { useAuth } from '../providers/AuthProvider';
import { useDriver } from '../providers/DriverProvider';
import { notifyOwnerExpenseAdded } from '../lib/notify-owner';

type ActionResult = { success: boolean; error?: string };

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  paidBy?: ExpensePaidBy;
  receiptPhotoUrl?: string;
  notes?: string;
}

export function useExpenseActions(tripId: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { driverId, ownerId, isReady, error: driverError } = useDriver();

  const getDriverInfo = async () => {
    if (!user) throw new Error('Not authenticated');
    if (driverError) throw new Error(driverError);
    if (!isReady || !driverId || !ownerId) throw new Error('Driver profile not found');
    return { id: driverId, owner_id: ownerId };
  };

  const createExpense = async (input: CreateExpenseInput): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('trip_expenses')
        .insert({
          trip_id: tripId,
          owner_id: driver.owner_id,
          category: input.category,
          amount: input.amount,
          description: input.description || null,
          paid_by: input.paidBy || null,
          receipt_photo_url: input.receiptPhotoUrl || null,
          notes: input.notes || null,
          incurred_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Notify owner (fire-and-forget)
      notifyOwnerExpenseAdded(tripId, input.category, input.amount);

      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create expense' };
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId: string): Promise<ActionResult> => {
    try {
      setLoading(true);
      const driver = await getDriverInfo();

      const { error } = await supabase
        .from('trip_expenses')
        .delete()
        .eq('id', expenseId)
        .eq('owner_id', driver.owner_id);

      if (error) throw error;
      onSuccess?.();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete expense' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createExpense,
    deleteExpense,
  };
}

export function useTripExpenses(tripId: string | null) {
  const { user } = useAuth();
  const { driverId, ownerId, loading: driverLoading, error: driverError, isReady: driverReady } = useDriver();

  const expensesQuery = useQuery<TripExpense[]>({
    queryKey: ['tripExpenses', tripId, user?.id, driverId, ownerId],
    enabled: driverReady && !!driverId && !!ownerId && !!tripId,
    queryFn: async () => {
      if (driverError) {
        throw new Error(driverError);
      }
      if (!driverId || !ownerId) {
        throw new Error('Driver profile not found');
      }

      const { data, error: expenseError } = await supabase
        .from('trip_expenses')
        .select('*')
        .eq('trip_id', tripId!)
        .eq('owner_id', ownerId)
        .order('incurred_at', { ascending: false });

      if (expenseError) throw expenseError;
      return data || [];
    },
  });

  const expenses = expensesQuery.data || [];
  const loading = driverLoading || expensesQuery.isLoading;
  const error = driverError || (expensesQuery.error ? (expensesQuery.error as Error).message : null);

  return { expenses, loading, error, refetch: expensesQuery.refetch };
}

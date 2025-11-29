import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TripExpense, ExpenseCategory, ExpensePaidBy } from '../types';
import { useAuth } from '../providers/AuthProvider';

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

  const getDriverInfo = async () => {
    if (!user) throw new Error('Not authenticated');

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, owner_id')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !driver) throw new Error('Driver profile not found');
    return driver;
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
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchExpenses = useCallback(async () => {
    if (!user || !tripId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      const { data, error: expenseError } = await supabase
        .from('trip_expenses')
        .select('*')
        .eq('trip_id', tripId)
        .eq('owner_id', driver.owner_id)
        .order('incurred_at', { ascending: false });

      if (expenseError) throw expenseError;
      setExpenses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, error, refetch: fetchExpenses };
}

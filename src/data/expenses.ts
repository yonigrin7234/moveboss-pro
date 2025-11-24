import { createClient } from '@/lib/supabase-server';

export interface ExpenseListItem {
  id: string;
  trip_id: string;
  trip_number: string | null;
  driver_name: string | null;
  expense_type: string | null;
  paid_by: 'driver_personal' | 'driver_cash' | 'company_card' | 'fuel_card' | null;
  amount: number;
  receipt_photo_url: string;
  created_at: string;
}

export async function listTripExpenses(params: {
  ownerId: string;
  fromDate?: string;
  toDate?: string;
  expenseType?: string;
  paidBy?: 'driver_personal' | 'driver_cash' | 'company_card' | 'fuel_card';
}): Promise<ExpenseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('trip_expenses')
    .select(
      `
        id,
        trip_id,
        expense_type,
        paid_by,
        amount,
        receipt_photo_url,
        created_at,
        trip:trips!trip_expenses_trip_id_fkey(trip_number, driver:drivers(id, first_name, last_name))
      `
    )
    .eq('owner_id', params.ownerId)
    .order('created_at', { ascending: false });

  if (params.fromDate) {
    query = query.gte('created_at', params.fromDate);
  }
  if (params.toDate) {
    query = query.lte('created_at', params.toDate);
  }
  if (params.expenseType) {
    query = query.eq('expense_type', params.expenseType);
  }
  if (params.paidBy) {
    query = query.eq('paid_by', params.paidBy);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list expenses: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    trip_id: row.trip_id,
    trip_number: row.trip?.trip_number || null,
    driver_name: row.trip?.driver ? `${row.trip.driver.first_name} ${row.trip.driver.last_name}` : null,
    expense_type: row.expense_type || null,
    paid_by: row.paid_by || null,
    amount: Number(row.amount) || 0,
    receipt_photo_url: row.receipt_photo_url,
    created_at: row.created_at,
  }));
}

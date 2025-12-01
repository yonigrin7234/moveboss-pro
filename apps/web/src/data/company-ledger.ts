import { createClient } from '@/lib/supabase-server';

// Types for company ledger
export interface CompanyLedgerSummary {
  loadsFromThem: {
    count: number;
    totalRevenue: number;
    totalOwed: number; // What they owe us (open receivables)
  };
  loadsToThem: {
    count: number;
    totalPaid: number;
    totalOwing: number; // What we owe them (open payables)
  };
  netBalance: number; // Positive = they owe us, negative = we owe them
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface CompanyLedgerLoad {
  id: string;
  load_number: string | null;
  internal_reference: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  cubic_feet: number | null;
  linehaul_amount: number | null;
  total_revenue: number | null;
  company_owes: number | null;
  status: string;
  load_status: string | null;
  created_at: string;
}

export interface CompanyPayment {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  load_id: string | null;
  load_number: string | null;
}

/**
 * Get summary of financial relationship with a company
 */
export async function getCompanyLedgerSummary(
  companyId: string,
  userId: string
): Promise<CompanyLedgerSummary> {
  const supabase = await createClient();

  // Get loads FROM this company (they gave us these loads - company_id matches)
  const { data: loadsFrom, error: loadsFromError } = await supabase
    .from('loads')
    .select('id, total_revenue, company_owes')
    .eq('company_id', companyId)
    .eq('owner_id', userId);

  if (loadsFromError) {
    throw new Error(`Failed to fetch loads from company: ${loadsFromError.message}`);
  }

  // Get loads TO this company (we gave them these loads - assigned_carrier_id matches)
  const { data: loadsTo, error: loadsToError } = await supabase
    .from('loads')
    .select('id, linehaul_amount, carrier_rate')
    .eq('assigned_carrier_id', companyId)
    .eq('owner_id', userId);

  if (loadsToError) {
    throw new Error(`Failed to fetch loads to company: ${loadsToError.message}`);
  }

  // Get open receivables from this company (what they owe us)
  const { data: receivables, error: receivablesError } = await supabase
    .from('receivables')
    .select('amount, status')
    .eq('company_id', companyId)
    .eq('owner_id', userId)
    .eq('status', 'open');

  if (receivablesError) {
    throw new Error(`Failed to fetch receivables: ${receivablesError.message}`);
  }

  // Get open payables to this company (what we owe them for carrying our loads)
  const { data: payables, error: payablesError } = await supabase
    .from('payables')
    .select('amount, status')
    .eq('payee_type', 'carrier')
    .eq('carrier_id', companyId)
    .eq('owner_id', userId)
    .eq('status', 'open');

  if (payablesError) {
    // Payables might not have carrier_id column - check if it exists
    console.error('Payables query failed:', payablesError.message);
  }

  // Get last payment received from this company
  const { data: lastPayment, error: lastPaymentError } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('company_id', companyId)
    .eq('owner_id', userId)
    .order('payment_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPaymentError) {
    console.error('Last payment query failed:', lastPaymentError.message);
  }

  // Calculate totals
  const loadsFromCount = loadsFrom?.length || 0;
  const loadsFromTotalRevenue = (loadsFrom || []).reduce(
    (sum, l) => sum + (Number(l.total_revenue) || 0),
    0
  );
  const totalOwed = (receivables || []).reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const loadsToCount = loadsTo?.length || 0;
  const loadsToTotalPaid = (loadsTo || []).reduce(
    (sum, l) => sum + (Number(l.carrier_rate) || Number(l.linehaul_amount) || 0),
    0
  );
  const totalOwing = (payables || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const netBalance = totalOwed - totalOwing;

  return {
    loadsFromThem: {
      count: loadsFromCount,
      totalRevenue: loadsFromTotalRevenue,
      totalOwed,
    },
    loadsToThem: {
      count: loadsToCount,
      totalPaid: loadsToTotalPaid,
      totalOwing,
    },
    netBalance,
    lastPaymentDate: lastPayment?.payment_date || null,
    lastPaymentAmount: lastPayment?.amount ? Number(lastPayment.amount) : null,
  };
}

/**
 * Get loads received FROM a company (they gave us these loads)
 */
export async function getLoadsFromCompany(
  companyId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<CompanyLedgerLoad[]> {
  const supabase = await createClient();

  let query = supabase
    .from('loads')
    .select(`
      id,
      load_number,
      internal_reference,
      pickup_city,
      pickup_state,
      dropoff_city,
      dropoff_state,
      delivery_city,
      delivery_state,
      pickup_date,
      delivery_date,
      cubic_feet,
      linehaul_amount,
      total_revenue,
      company_owes,
      status,
      load_status,
      created_at
    `)
    .eq('company_id', companyId)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch loads from company: ${error.message}`);
  }

  return (data || []).map((load) => ({
    id: load.id,
    load_number: load.load_number,
    internal_reference: load.internal_reference,
    pickup_city: load.pickup_city,
    pickup_state: load.pickup_state,
    dropoff_city: load.dropoff_city,
    dropoff_state: load.dropoff_state,
    delivery_city: load.delivery_city,
    delivery_state: load.delivery_state,
    pickup_date: load.pickup_date,
    delivery_date: load.delivery_date,
    cubic_feet: load.cubic_feet ? Number(load.cubic_feet) : null,
    linehaul_amount: load.linehaul_amount ? Number(load.linehaul_amount) : null,
    total_revenue: load.total_revenue ? Number(load.total_revenue) : null,
    company_owes: load.company_owes ? Number(load.company_owes) : null,
    status: load.status,
    load_status: load.load_status,
    created_at: load.created_at,
  }));
}

/**
 * Get loads given TO a company (we gave them these loads via marketplace)
 */
export async function getLoadsToCompany(
  companyId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<CompanyLedgerLoad[]> {
  const supabase = await createClient();

  let query = supabase
    .from('loads')
    .select(`
      id,
      load_number,
      internal_reference,
      pickup_city,
      pickup_state,
      dropoff_city,
      dropoff_state,
      delivery_city,
      delivery_state,
      pickup_date,
      delivery_date,
      cubic_feet,
      linehaul_amount,
      carrier_rate,
      status,
      load_status,
      created_at
    `)
    .eq('assigned_carrier_id', companyId)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch loads to company: ${error.message}`);
  }

  return (data || []).map((load: any) => ({
    id: load.id,
    load_number: load.load_number,
    internal_reference: load.internal_reference,
    pickup_city: load.pickup_city,
    pickup_state: load.pickup_state,
    dropoff_city: load.dropoff_city,
    dropoff_state: load.dropoff_state,
    delivery_city: load.delivery_city,
    delivery_state: load.delivery_state,
    pickup_date: load.pickup_date,
    delivery_date: load.delivery_date,
    cubic_feet: load.cubic_feet ? Number(load.cubic_feet) : null,
    linehaul_amount: load.carrier_rate ? Number(load.carrier_rate) : (load.linehaul_amount ? Number(load.linehaul_amount) : null),
    total_revenue: null, // Not applicable for loads we gave out
    company_owes: null, // We owe them, not the other way
    status: load.status,
    load_status: load.load_status,
    created_at: load.created_at,
  }));
}

/**
 * Get payment history with a company
 */
export async function getCompanyPayments(
  companyId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    direction?: 'from' | 'to' | 'all'; // from = they paid us, to = we paid them
  }
): Promise<CompanyPayment[]> {
  const supabase = await createClient();

  // Try to get payments from the payments table
  // Note: This table might not exist yet or might have different structure
  let query = supabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
      status,
      created_at,
      load_id,
      load:loads(load_number)
    `)
    .eq('company_id', companyId)
    .eq('owner_id', userId)
    .order('payment_date', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    // Payments table might not exist - return empty array
    console.error('Payments query failed:', error.message);
    return [];
  }

  return (data || []).map((payment: any) => ({
    id: payment.id,
    amount: Number(payment.amount) || 0,
    payment_date: payment.payment_date,
    payment_method: payment.payment_method,
    reference_number: payment.reference_number,
    notes: payment.notes,
    status: payment.status,
    created_at: payment.created_at,
    load_id: payment.load_id,
    load_number: payment.load?.load_number || null,
  }));
}

/**
 * Get balances for multiple companies at once (batch query for efficiency)
 * Returns a map of company_id -> balance info
 */
export async function getCompanyBalancesBatch(
  companyIds: string[],
  userId: string
): Promise<Map<string, { totalOwed: number; totalOwing: number; netBalance: number }>> {
  if (companyIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const result = new Map<string, { totalOwed: number; totalOwing: number; netBalance: number }>();

  // Initialize all companies with zero balance
  for (const id of companyIds) {
    result.set(id, { totalOwed: 0, totalOwing: 0, netBalance: 0 });
  }

  // Get open receivables for all companies (what they owe us)
  const { data: receivables, error: receivablesError } = await supabase
    .from('receivables')
    .select('company_id, amount')
    .in('company_id', companyIds)
    .eq('owner_id', userId)
    .eq('status', 'open');

  if (receivablesError) {
    console.error('Error fetching batch receivables:', receivablesError.message);
  } else if (receivables) {
    for (const r of receivables) {
      const current = result.get(r.company_id);
      if (current) {
        current.totalOwed += Number(r.amount) || 0;
        current.netBalance = current.totalOwed - current.totalOwing;
      }
    }
  }

  // Get open payables to these companies (what we owe them)
  const { data: payables, error: payablesError } = await supabase
    .from('payables')
    .select('carrier_id, amount')
    .eq('payee_type', 'carrier')
    .in('carrier_id', companyIds)
    .eq('owner_id', userId)
    .eq('status', 'open');

  if (payablesError) {
    console.error('Error fetching batch payables:', payablesError.message);
  } else if (payables) {
    for (const p of payables) {
      const carrierId = (p as any).carrier_id;
      if (carrierId) {
        const current = result.get(carrierId);
        if (current) {
          current.totalOwing += Number(p.amount) || 0;
          current.netBalance = current.totalOwed - current.totalOwing;
        }
      }
    }
  }

  return result;
}

/**
 * Get receivables for a specific company
 */
export async function getCompanyReceivables(
  companyId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: 'open' | 'paid' | 'partial' | 'cancelled' | 'all';
  }
): Promise<{
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
  trip_id: string | null;
  trip_number: string | null;
}[]> {
  const supabase = await createClient();

  let query = supabase
    .from('receivables')
    .select(`
      id,
      amount,
      status,
      due_date,
      created_at,
      trip_id,
      trip:trips(trip_number)
    `)
    .eq('company_id', companyId)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch company receivables: ${error.message}`);
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount) || 0,
    status: r.status,
    due_date: r.due_date,
    created_at: r.created_at,
    trip_id: r.trip_id,
    trip_number: (Array.isArray(r.trip) ? r.trip[0] : r.trip)?.trip_number || null,
  }));
}

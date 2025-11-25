import { createClient } from '@/lib/supabase-server';
import { getTripById } from '@/data/trips';
import type { TripLoad } from '@/data/trips';

export interface TripSettlement {
  id: string;
  owner_id: string;
  trip_id: string;
  company_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  total_revenue: number;
  total_driver_pay: number;
  total_expenses: number;
  total_profit: number;
  status: 'draft' | 'finalized';
  closed_at: string | null;
  created_at: string;
}

export interface TripSettlementListItem {
  id: string;
  trip_id: string;
  trip_number: string | null;
  driver_name: string | null;
  companies: string[];
  status: string;
  total_revenue: number;
  total_driver_pay: number;
  total_expenses: number;
  total_profit: number;
  created_at: string;
  closed_at: string | null;
}

export interface ReceivableListItem {
  id: string;
  trip_id: string | null;
  trip_number: string | null;
  company_id: string | null;
  company_name: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface FinanceSummary {
  total_revenue: number;
  total_driver_pay: number;
  total_expenses: number;
  total_profit: number;
  open_receivables_amount: number;
  open_receivables_count: number;
  top_companies: { company_id: string | null; company_name: string; total: number }[];
  recent_trips: {
    settlement_id: string;
    trip_id: string;
    trip_number: string | null;
    revenue: number;
    profit: number;
    driver_name: string | null;
    settled_at: string | null;
  }[];
}

interface AutoLineItem {
  category: 'revenue' | 'driver_pay' | 'fuel' | 'tolls' | 'expense' | 'other';
  description: string;
  amount: number;
  load_id?: string | null;
  company_id?: string | null;
}

function nullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : (value as T);
}

function pickCompanyFromLoads(loads: TripLoad[]): string | null {
  for (const tl of loads) {
    const loadRel = (tl.load as any) || {};
    const companyRel = Array.isArray(loadRel.company) ? loadRel.company[0] : loadRel.company;
    const companyId = loadRel?.company_id || companyRel?.id;
    if (companyId) return companyId as string;
  }
  return null;
}

export async function createTripSettlement(tripId: string, userId: string): Promise<TripSettlement> {
  const supabase = await createClient();

  const trip = await getTripById(tripId, userId);
  if (!trip) {
    throw new Error('Trip not found or not accessible');
  }

  // Odometer validation for settlement
  const odoStart = (trip as any).odometer_start;
  const odoEnd = (trip as any).odometer_end;
  const odoStartPhoto = (trip as any).odometer_start_photo_url;
  const odoEndPhoto = (trip as any).odometer_end_photo_url;
  if (odoStart == null || odoEnd == null || !odoStartPhoto || !odoEndPhoto) {
    throw new Error('Odometer start/end and photos are required to settle this trip.');
  }
  const actualMiles = Number(odoEnd) - Number(odoStart);
  if (!Number.isFinite(actualMiles) || actualMiles <= 0) {
    throw new Error('Actual miles must be greater than zero to settle this trip.');
  }

  // Aggregate load data and revenue per company
  const lineItems: AutoLineItem[] = [];
  const receivableByCompany = new Map<string, number>();
  const revenueLinehaulTotal = trip.loads.reduce((sum, tl) => {
    const load = (tl.load || {}) as any;
    const contractLinehaul = (Number(load.actual_cuft_loaded) || 0) * (Number(load.contract_rate_per_cuft) || 0);
    const contractAccessorials = Number(load.contract_accessorials_total) || 0;
    const extrasCollected = Number(load.extra_accessorials_total) || 0;
    const storageMoveIn = Number(load.storage_move_in_fee) || 0;
    const storageDailyFee = Number(load.storage_daily_fee) || 0;
    const storageDays = Number(load.storage_days_billed) || 0;
    const storageRevenue = storageMoveIn + storageDailyFee * storageDays;

    const contractTotalBillable = contractLinehaul + contractAccessorials + storageRevenue;
    const collectedByDriver = Number(load.amount_collected_on_delivery) || 0;
    const paidDirectToCompany = Number(load.amount_paid_directly_to_company) || 0;
    const isStorageDrop = Boolean(load.storage_drop);
    const companyApprovedException = Boolean(load.company_approved_exception_delivery);
    const receivablePortion = Math.max(
      0,
      contractTotalBillable - paidDirectToCompany - (isStorageDrop ? 0 : collectedByDriver)
    );

    const companyRel = Array.isArray(load.company) ? load.company[0] : load.company;
    const companyId = load.company_id || companyRel?.id || null;

    if (contractLinehaul) {
      lineItems.push({
        category: 'revenue',
        description: 'Linehaul (contract)',
        amount: contractLinehaul,
        load_id: tl.load_id,
        company_id: companyId,
      });
    }
    if (contractAccessorials) {
      lineItems.push({
        category: 'revenue',
        description: 'Contract accessorials',
        amount: contractAccessorials,
        load_id: tl.load_id,
        company_id: companyId,
      });
    }
    if (storageMoveIn) {
      lineItems.push({
        category: 'revenue',
        description: 'Storage move-in fee',
        amount: storageMoveIn,
        load_id: tl.load_id,
        company_id: companyId,
      });
    }
    if (storageDailyFee && storageDays) {
      lineItems.push({
        category: 'revenue',
        description: 'Storage daily fee',
        amount: storageDailyFee * storageDays,
        load_id: tl.load_id,
        company_id: companyId,
      });
    }
    if (extrasCollected) {
      lineItems.push({
        category: 'revenue',
        description: 'On-site accessorials (collected by driver)',
        amount: extrasCollected,
        load_id: tl.load_id,
        company_id: companyId,
      });
    }

    if (companyId && receivablePortion > 0) {
      receivableByCompany.set(companyId, (receivableByCompany.get(companyId) || 0) + receivablePortion);
    }

    // Alert logic handled upstream (not here)

    return sum + contractLinehaul;
  }, 0);

  // Revenue totals
  const revenueTotal = lineItems
    .filter((li) => li.category === 'revenue')
    .reduce((sum, li) => sum + li.amount, 0);

  // Driver pay calculation (using actual miles and loaded cuft)
  let driverPayTotal = 0;
  const driverPayItems: AutoLineItem[] = [];

  if (trip.driver_id) {
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('pay_mode, rate_per_mile, rate_per_cuft, percent_of_revenue, flat_daily_rate')
      .eq('id', trip.driver_id)
      .eq('owner_id', userId)
      .single();

    if (driverError) {
      throw new Error(`Failed to load driver for pay calc: ${driverError.message}`);
    }

    const totalCuft = trip.loads.reduce((sum, tl) => {
      const load = (tl.load || {}) as any;
      return sum + (Number(load.actual_cuft_loaded) || 0);
    }, 0);

    const daysWorked = (() => {
      if (trip.start_date && trip.end_date) {
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return diff + 1;
      }
      return 1;
    })();

    const revenueBase = revenueTotal;

    const addPayItem = (description: string, amount: number) => {
      if (amount && amount > 0) {
        driverPayItems.push({
          category: 'driver_pay',
          description,
          amount,
        });
        driverPayTotal += amount;
      }
    };

    switch ((driver as any).pay_mode) {
      case 'per_mile': {
        addPayItem('Per mile', actualMiles * ((driver as any).rate_per_mile || 0));
        break;
      }
      case 'per_cuft': {
        addPayItem('Per cuft', totalCuft * ((driver as any).rate_per_cuft || 0));
        break;
      }
      case 'per_mile_and_cuft': {
        addPayItem('Per mile', actualMiles * ((driver as any).rate_per_mile || 0));
        addPayItem('Per cuft', totalCuft * ((driver as any).rate_per_cuft || 0));
        break;
      }
      case 'percent_of_revenue': {
        const pct = (driver as any).percent_of_revenue || 0;
        addPayItem('Percent of revenue', revenueBase * (pct / 100));
        break;
      }
      case 'flat_daily_rate': {
        addPayItem('Flat daily rate', daysWorked * ((driver as any).flat_daily_rate || 0));
        break;
      }
      default:
        break;
    }
  }

  // Expenses from trip expenses (excluding driver_pay category to avoid double count)
  let fuelTotal = 0;
  let tollsTotal = 0;
  let otherExpensesTotal = 0;
  const reimbursementItems: AutoLineItem[] = [];
  if (trip.expenses?.length) {
    for (const exp of trip.expenses) {
      switch (exp.category) {
        case 'fuel':
          fuelTotal += exp.amount;
          lineItems.push({ category: 'fuel', description: exp.description || 'Fuel', amount: exp.amount });
          break;
        case 'tolls':
          tollsTotal += exp.amount;
          lineItems.push({ category: 'tolls', description: exp.description || 'Tolls', amount: exp.amount });
          break;
        case 'driver_pay':
          // skip; driver pay handled above
          break;
        default:
          otherExpensesTotal += exp.amount;
          lineItems.push({ category: 'expense', description: exp.description || 'Expense', amount: exp.amount });
          break;
      }

      // Reimbursement logic for driver-paid expenses
      if (exp.paid_by === 'driver_personal' || exp.paid_by === 'driver_cash') {
        reimbursementItems.push({
          category: 'expense',
          description: exp.description || 'Reimbursement owed to driver',
          amount: exp.amount,
        });
      }
    }
  }

  // Append driver pay items
  lineItems.push(...driverPayItems);

  // Add reimbursement items to expenses so they affect totals
  reimbursementItems.forEach((item) => lineItems.push(item));
  const totalExpenses = driverPayTotal + fuelTotal + tollsTotal + otherExpensesTotal + reimbursementItems.reduce((s, i) => s + i.amount, 0);
  const totalProfit = revenueTotal - totalExpenses;

  const settlementPayload = {
    owner_id: userId,
    trip_id: tripId,
    company_id: pickCompanyFromLoads(trip.loads),
    driver_id: trip.driver_id,
    truck_id: trip.truck_id,
    total_revenue: revenueTotal,
    total_driver_pay: driverPayTotal,
    total_expenses: totalExpenses,
    total_profit: totalProfit,
    status: 'draft' as const,
  };

  const { data: settlement, error: settlementError } = await supabase
    .from('trip_settlements')
    .insert(settlementPayload)
    .select('*')
    .single();

  if (settlementError) {
    throw new Error(`Failed to create settlement: ${settlementError.message}`);
  }

  if (lineItems.length) {
    const payload = lineItems.map((li) => ({
      owner_id: userId,
      settlement_id: (settlement as any).id,
      trip_id: tripId,
      load_id: nullable(li.load_id),
      category: li.category,
      description: li.description,
      amount: li.amount,
      company_id: li.company_id ?? pickCompanyFromLoads(trip.loads),
      driver_id: trip.driver_id,
    }));

    const { error: lineError } = await supabase.from('settlement_line_items').insert(payload);
    if (lineError) {
      throw new Error(`Failed to insert settlement line items: ${lineError.message}`);
    }
  }

  // Receivables per company
  for (const [companyId, amount] of receivableByCompany.entries()) {
    if (amount > 0) {
      const { error: recvError } = await supabase.from('receivables').insert({
        owner_id: userId,
        company_id: companyId,
        trip_id: tripId,
        settlement_id: (settlement as any).id,
        amount,
        status: 'open',
      });
      if (recvError) {
        throw new Error(`Failed to create receivable: ${recvError.message}`);
      }
    }
  }

  // Payable to driver (gross driver pay)
  if (trip.driver_id && driverPayTotal > 0) {
    const { error: payError } = await supabase.from('payables').insert({
      owner_id: userId,
      payee_type: 'driver',
      driver_id: trip.driver_id,
      trip_id: tripId,
      settlement_id: (settlement as any).id,
      amount: driverPayTotal,
      status: 'open',
    });
    if (payError) {
      throw new Error(`Failed to create payable: ${payError.message}`);
    }
  }

  // Update trip financials and status
  await supabase
    .from('trips')
    .update({
      revenue_total: revenueTotal,
      driver_pay_total: driverPayTotal,
      fuel_total: fuelTotal,
      tolls_total: tollsTotal,
      other_expenses_total: otherExpensesTotal,
      profit_total: totalProfit,
      status: 'settled',
      actual_miles: actualMiles,
      total_miles: actualMiles,
    })
    .eq('id', tripId)
    .eq('owner_id', userId);

  return settlement as TripSettlement;
}

export async function listTripSettlements(params: {
  ownerId: string;
  limit?: number;
  offset?: number;
  fromDate?: string;
  toDate?: string;
  status?: 'draft' | 'final' | 'void' | 'settled';
}): Promise<TripSettlementListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('trip_settlements')
    .select(
      `
      *,
      trip:trips!trip_settlements_trip_id_fkey(
        trip_number,
        driver:drivers(id, first_name, last_name),
        trip_loads(
          load:loads(
            company:companies(id, name)
          )
        )
      )
    `
    )
    .eq('owner_id', params.ownerId)
    .order('created_at', { ascending: false });

  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, (params.offset || 0) + (params.limit || 50) - 1);
  if (params.status) query = query.eq('status', params.status);
  if (params.fromDate) query = query.gte('created_at', params.fromDate);
  if (params.toDate) query = query.lte('created_at', params.toDate);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list settlements: ${error.message}`);
  }

  return (data || []).map((row: any) => {
    const trip = Array.isArray(row.trip) ? row.trip[0] : row.trip;
    const tripDriver = Array.isArray(trip?.driver) ? trip?.driver?.[0] : trip?.driver;
    const companies: string[] = [];
    trip?.trip_loads?.forEach((tl: any) => {
      const company = Array.isArray(tl?.load?.company) ? tl.load.company[0] : tl?.load?.company;
      const name = company?.name;
      if (name && !companies.includes(name)) companies.push(name);
    });

    const driverName = tripDriver ? `${tripDriver.first_name} ${tripDriver.last_name}` : null;

    return {
      id: row.id,
      trip_id: row.trip_id,
      trip_number: trip?.trip_number || null,
      driver_name: driverName,
      companies,
      status: row.status,
      total_revenue: Number(row.total_revenue) || 0,
      total_driver_pay: Number(row.total_driver_pay) || 0,
      total_expenses: Number(row.total_expenses) || 0,
      total_profit: Number(row.total_profit) || 0,
      created_at: row.created_at,
      closed_at: row.closed_at || null,
    };
  });
}

export async function listReceivables(params: {
  ownerId: string;
  status?: 'open' | 'paid' | 'partial' | 'cancelled';
  companyId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ReceivableListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('receivables')
    .select(
      `
      id,
      trip_id,
      company_id,
      amount,
      status,
      due_date,
      created_at,
      company:companies(id, name),
      trip:trips(id, trip_number)
    `
    )
    .eq('owner_id', params.ownerId)
    .order('created_at', { ascending: false });

  if (params.status) query = query.eq('status', params.status);
  if (params.companyId) query = query.eq('company_id', params.companyId);
  if (params.fromDate) query = query.gte('created_at', params.fromDate);
  if (params.toDate) query = query.lte('created_at', params.toDate);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list receivables: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    trip_id: row.trip_id,
    trip_number: (Array.isArray(row.trip) ? row.trip[0] : row.trip)?.trip_number || null,
    company_id: row.company_id,
    company_name: (Array.isArray(row.company) ? row.company[0] : row.company)?.name || null,
    amount: Number(row.amount) || 0,
    status: row.status,
    due_date: row.due_date || null,
    created_at: row.created_at,
  }));
}

export async function getFinanceSummary(params: { ownerId: string; periodDays?: number }): Promise<FinanceSummary> {
  const supabase = await createClient();
  const since =
    params.periodDays && params.periodDays > 0
      ? new Date(Date.now() - params.periodDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  // Pull settlements in period
  let settlementsQuery = supabase
    .from('trip_settlements')
    .select(
      `
      *,
      trip:trips(
        trip_number,
        driver:drivers(id, first_name, last_name)
      )
    `
    )
    .eq('owner_id', params.ownerId)
    .order('created_at', { ascending: false });

  if (since) settlementsQuery = settlementsQuery.gte('created_at', since);

  const [{ data: settlements, error: settlementsError }, { data: openReceivables, error: receivablesError }] =
    await Promise.all([
      settlementsQuery,
      supabase
        .from('receivables')
        .select('amount,status,company:companies(id,name)')
        .eq('owner_id', params.ownerId)
        .eq('status', 'open'),
    ]);

  if (settlementsError) throw new Error(`Failed to load finance summary (settlements): ${settlementsError.message}`);
  if (receivablesError) throw new Error(`Failed to load finance summary (receivables): ${receivablesError.message}`);

  let total_revenue = 0;
  let total_driver_pay = 0;
  let total_expenses = 0;
  let total_profit = 0;

  const recent_trips = (settlements || [])
    .slice(0, 5)
    .map((s: any) => ({
      settlement_id: s.id,
      trip_id: s.trip_id,
      trip_number: (Array.isArray(s.trip) ? s.trip[0] : s.trip)?.trip_number || null,
      revenue: Number(s.total_revenue) || 0,
      profit: Number(s.total_profit) || 0,
      driver_name: (() => {
        const trip = Array.isArray(s.trip) ? s.trip[0] : s.trip;
        const driver = Array.isArray(trip?.driver) ? trip?.driver?.[0] : trip?.driver;
        return driver ? `${driver.first_name} ${driver.last_name}` : null;
      })(),
      settled_at: s.closed_at || s.created_at,
    }));

  (settlements || []).forEach((s: any) => {
    total_revenue += Number(s.total_revenue) || 0;
    total_driver_pay += Number(s.total_driver_pay) || 0;
    total_expenses += Number(s.total_expenses) || 0;
    total_profit += Number(s.total_profit) || 0;
  });

  let open_receivables_amount = 0;
  const companyTotals: Record<string, { name: string; total: number }> = {};
  (openReceivables || []).forEach((r: any) => {
    const amt = Number(r.amount) || 0;
    open_receivables_amount += amt;
    const company = Array.isArray(r.company) ? r.company[0] : r.company;
    const key = company?.id || 'unknown';
    const name = company?.name || 'Unknown';
    if (!companyTotals[key]) companyTotals[key] = { name, total: 0 };
    companyTotals[key].total += amt;
  });

  const top_companies = Object.entries(companyTotals)
    .map(([company_id, info]) => ({ company_id, company_name: info.name, total: info.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    total_revenue,
    total_driver_pay,
    total_expenses,
    total_profit,
    open_receivables_amount,
    open_receivables_count: openReceivables?.length || 0,
    top_companies,
    recent_trips,
  };
}

export async function listDriverStatements(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payables')
    .select('driver_id, amount, status, trip_id, settlement_id, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch payables: ${error.message}`);
  return data || [];
}

export async function listCompanyReceivables(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('receivables')
    .select('company_id, amount, status, trip_id, settlement_id, due_date, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch receivables: ${error.message}`);
  return data || [];
}

export async function getSettlementSnapshot(tripId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: settlements, error: sErr }, { data: receivables, error: rErr }, { data: payables, error: pErr }] =
    await Promise.all([
      supabase
        .from('trip_settlements')
        .select('*')
        .eq('trip_id', tripId)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('receivables')
        .select('*, company:companies(id, name)')
        .eq('trip_id', tripId)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('payables')
        .select('*, driver:drivers(id, first_name, last_name)')
        .eq('trip_id', tripId)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false }),
    ]);

  if (sErr) throw new Error(`Failed to load settlements: ${sErr.message}`);
  if (rErr) throw new Error(`Failed to load receivables: ${rErr.message}`);
  if (pErr) throw new Error(`Failed to load payables: ${pErr.message}`);

  return {
    settlements: settlements || [],
    receivables: receivables || [],
    payables: payables || [],
  };
}

/**
 * Recalculate settlement for a trip by deleting existing records and recreating
 */
export async function recalculateTripSettlement(tripId: string, userId: string): Promise<TripSettlement> {
  const supabase = await createClient();

  // Delete existing settlement-related records for this trip
  // Order matters due to foreign keys: line_items first, then receivables/payables, then settlement
  await supabase
    .from('settlement_line_items')
    .delete()
    .eq('trip_id', tripId)
    .eq('owner_id', userId);

  await supabase
    .from('receivables')
    .delete()
    .eq('trip_id', tripId)
    .eq('owner_id', userId);

  await supabase
    .from('payables')
    .delete()
    .eq('trip_id', tripId)
    .eq('owner_id', userId);

  await supabase
    .from('trip_settlements')
    .delete()
    .eq('trip_id', tripId)
    .eq('owner_id', userId);

  // Reset trip status to completed so it can be re-settled
  await supabase
    .from('trips')
    .update({ status: 'completed' })
    .eq('id', tripId)
    .eq('owner_id', userId);

  // Create fresh settlement with updated amounts
  return createTripSettlement(tripId, userId);
}

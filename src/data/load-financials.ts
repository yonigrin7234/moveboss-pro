import { createClient } from '@/lib/supabase-server';

/**
 * Load Financial Brain - Calculates revenue, accessorials, and company receivables
 *
 * Moving Industry Load Financial Structure:
 * 1. Base Revenue = actual_cuft × rate_per_cuft
 * 2. Contract Accessorials = pre-agreed fees (stairs, shuttle, long carry, packing, bulky, other)
 * 3. Extra Accessorials = day-of charges added by driver
 * 4. Total Revenue = Base + Contract Accessorials + Extra Accessorials
 * 5. Company Owes = Total Revenue - Amount Collected on Delivery - Amount Paid Directly to Company
 */

// Input interface - all the values that affect financial calculations
export interface LoadFinancialsInput {
  // Base revenue calculation
  actual_cuft_loaded?: number | null;
  rate_per_cuft?: number | null; // Use contract_rate_per_cuft or fall back to rate_per_cuft

  // Contract accessorials (owner enters when creating load)
  contract_accessorials_stairs?: number | null;
  contract_accessorials_shuttle?: number | null;
  contract_accessorials_long_carry?: number | null;
  contract_accessorials_packing?: number | null;
  contract_accessorials_bulky?: number | null;
  contract_accessorials_other?: number | null;

  // Extra accessorials (driver enters after loading)
  extra_stairs?: number | null;
  extra_shuttle?: number | null;
  extra_long_carry?: number | null;
  extra_packing?: number | null;
  extra_bulky?: number | null;
  extra_other?: number | null;

  // Collections
  amount_collected_on_delivery?: number | null;
  amount_paid_directly_to_company?: number | null;

  // Storage fees (if applicable)
  storage_move_in_fee?: number | null;
  storage_daily_fee?: number | null;
  storage_days_billed?: number | null;
}

// Result interface - all calculated values
export interface LoadFinancialResult {
  // Calculated totals
  base_revenue: number;
  contract_accessorials_total: number;
  extra_accessorials_total: number;
  storage_total: number;
  total_revenue: number;
  collected_on_delivery: number;
  paid_to_company: number;
  company_owes: number;

  // Itemized breakdown for display
  breakdown: {
    // Base
    actual_cuft: number;
    rate_per_cuft: number;
    base_revenue: number;

    // Contract accessorials
    contract_stairs: number;
    contract_shuttle: number;
    contract_long_carry: number;
    contract_packing: number;
    contract_bulky: number;
    contract_other: number;
    contract_total: number;

    // Extra accessorials
    extra_stairs: number;
    extra_shuttle: number;
    extra_long_carry: number;
    extra_packing: number;
    extra_bulky: number;
    extra_other: number;
    extra_total: number;

    // Storage
    storage_move_in: number;
    storage_daily_rate: number;
    storage_days: number;
    storage_total: number;

    // Collections
    collected_on_delivery: number;
    paid_to_company: number;
    total_collected: number;

    // Final
    total_revenue: number;
    company_owes: number;
  };
}

/**
 * Calculate load financials from input values
 */
export function calculateLoadFinancials(input: LoadFinancialsInput): LoadFinancialResult {
  // Default all values to 0
  const actualCuft = Number(input.actual_cuft_loaded) || 0;
  const ratePerCuft = Number(input.rate_per_cuft) || 0;

  // Contract accessorials
  const contractStairs = Number(input.contract_accessorials_stairs) || 0;
  const contractShuttle = Number(input.contract_accessorials_shuttle) || 0;
  const contractLongCarry = Number(input.contract_accessorials_long_carry) || 0;
  const contractPacking = Number(input.contract_accessorials_packing) || 0;
  const contractBulky = Number(input.contract_accessorials_bulky) || 0;
  const contractOther = Number(input.contract_accessorials_other) || 0;

  // Extra accessorials
  const extraStairs = Number(input.extra_stairs) || 0;
  const extraShuttle = Number(input.extra_shuttle) || 0;
  const extraLongCarry = Number(input.extra_long_carry) || 0;
  const extraPacking = Number(input.extra_packing) || 0;
  const extraBulky = Number(input.extra_bulky) || 0;
  const extraOther = Number(input.extra_other) || 0;

  // Storage
  const storageMoveIn = Number(input.storage_move_in_fee) || 0;
  const storageDailyRate = Number(input.storage_daily_fee) || 0;
  const storageDays = Number(input.storage_days_billed) || 0;

  // Collections
  const collectedOnDelivery = Number(input.amount_collected_on_delivery) || 0;
  const paidToCompany = Number(input.amount_paid_directly_to_company) || 0;

  // Calculate totals
  const baseRevenue = round(actualCuft * ratePerCuft);
  const contractTotal = round(
    contractStairs + contractShuttle + contractLongCarry + contractPacking + contractBulky + contractOther
  );
  const extraTotal = round(
    extraStairs + extraShuttle + extraLongCarry + extraPacking + extraBulky + extraOther
  );
  const storageTotal = round(storageMoveIn + storageDailyRate * storageDays);
  const totalRevenue = round(baseRevenue + contractTotal + extraTotal + storageTotal);
  const totalCollected = round(collectedOnDelivery + paidToCompany);
  const companyOwes = round(totalRevenue - totalCollected);

  return {
    base_revenue: baseRevenue,
    contract_accessorials_total: contractTotal,
    extra_accessorials_total: extraTotal,
    storage_total: storageTotal,
    total_revenue: totalRevenue,
    collected_on_delivery: collectedOnDelivery,
    paid_to_company: paidToCompany,
    company_owes: companyOwes,

    breakdown: {
      actual_cuft: actualCuft,
      rate_per_cuft: ratePerCuft,
      base_revenue: baseRevenue,

      contract_stairs: contractStairs,
      contract_shuttle: contractShuttle,
      contract_long_carry: contractLongCarry,
      contract_packing: contractPacking,
      contract_bulky: contractBulky,
      contract_other: contractOther,
      contract_total: contractTotal,

      extra_stairs: extraStairs,
      extra_shuttle: extraShuttle,
      extra_long_carry: extraLongCarry,
      extra_packing: extraPacking,
      extra_bulky: extraBulky,
      extra_other: extraOther,
      extra_total: extraTotal,

      storage_move_in: storageMoveIn,
      storage_daily_rate: storageDailyRate,
      storage_days: storageDays,
      storage_total: storageTotal,

      collected_on_delivery: collectedOnDelivery,
      paid_to_company: paidToCompany,
      total_collected: totalCollected,

      total_revenue: totalRevenue,
      company_owes: companyOwes,
    },
  };
}

/**
 * Compute financials and save to database
 */
export async function computeAndSaveLoadFinancials(
  loadId: string,
  userId: string
): Promise<LoadFinancialResult | null> {
  const supabase = await createClient();

  // Fetch the load
  const { data: load, error: fetchError } = await supabase
    .from('loads')
    .select('*')
    .eq('id', loadId)
    .eq('owner_id', userId)
    .single();

  if (fetchError || !load) {
    console.error('Failed to fetch load for financial calculation:', fetchError?.message);
    return null;
  }

  // Use contract_rate_per_cuft if set, otherwise fall back to rate_per_cuft
  const ratePerCuft = load.contract_rate_per_cuft || load.rate_per_cuft;

  // Calculate financials
  const result = calculateLoadFinancials({
    actual_cuft_loaded: load.actual_cuft_loaded,
    rate_per_cuft: ratePerCuft,
    contract_accessorials_stairs: load.contract_accessorials_stairs,
    contract_accessorials_shuttle: load.contract_accessorials_shuttle,
    contract_accessorials_long_carry: load.contract_accessorials_long_carry,
    contract_accessorials_packing: load.contract_accessorials_packing,
    contract_accessorials_bulky: load.contract_accessorials_bulky,
    contract_accessorials_other: load.contract_accessorials_other,
    extra_stairs: load.extra_stairs,
    extra_shuttle: load.extra_shuttle,
    extra_long_carry: load.extra_long_carry,
    extra_packing: load.extra_packing,
    extra_bulky: load.extra_bulky,
    extra_other: load.extra_other,
    amount_collected_on_delivery: load.amount_collected_on_delivery,
    amount_paid_directly_to_company: load.amount_paid_directly_to_company,
    storage_move_in_fee: load.storage_move_in_fee,
    storage_daily_fee: load.storage_daily_fee,
    storage_days_billed: load.storage_days_billed,
  });

  // Update the load with calculated values
  const { error: updateError } = await supabase
    .from('loads')
    .update({
      base_revenue: result.base_revenue,
      contract_accessorials_total: result.contract_accessorials_total,
      extra_accessorials_total: result.extra_accessorials_total,
      total_revenue: result.total_revenue,
      company_owes: result.company_owes,
    })
    .eq('id', loadId)
    .eq('owner_id', userId);

  if (updateError) {
    console.error('Failed to save load financials:', updateError.message);
    return null;
  }

  return result;
}

/**
 * Round to 2 decimal places for currency
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

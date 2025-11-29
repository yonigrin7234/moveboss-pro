import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import {
  TripSettlement,
  EarningsSummary,
  SettlementStatus,
  DriverPayMode,
} from '../types';

// Calculate driver pay based on pay mode and trip data
function calculateDriverPay(
  payMode: DriverPayMode | null,
  ratePerMile: number | null,
  ratePerCuft: number | null,
  percentOfRevenue: number | null,
  flatDailyRate: number | null,
  totalMiles: number | null,
  totalCuft: number | null,
  totalRevenue: number | null,
  startDate: string | null,
  endDate: string | null
): number {
  if (!payMode) return 0;

  switch (payMode) {
    case 'per_mile':
      return (ratePerMile || 0) * (totalMiles || 0);

    case 'per_cuft':
      return (ratePerCuft || 0) * (totalCuft || 0);

    case 'per_mile_and_cuft':
      return (
        (ratePerMile || 0) * (totalMiles || 0) +
        (ratePerCuft || 0) * (totalCuft || 0)
      );

    case 'percent_of_revenue':
      return ((percentOfRevenue || 0) / 100) * (totalRevenue || 0);

    case 'flat_daily_rate':
      if (!startDate || !endDate || !flatDailyRate) return flatDailyRate || 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return flatDailyRate * days;

    default:
      return 0;
  }
}

export function useDriverEarnings(dateRange?: { start: Date; end: Date }) {
  const [settlements, setSettlements] = useState<TripSettlement[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarned: 0,
    pendingPay: 0,
    paidOut: 0,
    tripsCompleted: 0,
    totalMiles: 0,
    totalCuft: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get driver record
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, owner_id')
        .eq('auth_user_id', user.id)
        .single();

      if (driverError || !driver) {
        setError('Driver profile not found');
        return;
      }

      // Build query for completed/settled trips assigned to this driver
      let query = supabase
        .from('trips')
        .select(`
          id,
          trip_number,
          status,
          settlement_status,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          start_date,
          end_date,
          actual_miles,
          total_cuft,
          revenue_total,
          driver_pay_total,
          trip_pay_mode,
          trip_rate_per_mile,
          trip_rate_per_cuft,
          trip_percent_of_revenue,
          trip_flat_daily_rate,
          settlement_paid_at,
          settlement_paid_method,
          trip_expenses (
            id,
            category,
            amount,
            paid_by
          )
        `)
        .eq('owner_id', driver.owner_id)
        .eq('driver_id', driver.id)
        .in('status', ['completed', 'settled'])
        .order('end_date', { ascending: false });

      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte('end_date', dateRange.start.toISOString())
          .lte('end_date', dateRange.end.toISOString());
      }

      const { data: trips, error: tripsError } = await query;

      if (tripsError) {
        throw tripsError;
      }

      // Transform trips into settlements
      const tripSettlements: TripSettlement[] = (trips || []).map((trip) => {
        const route = [
          [trip.origin_city, trip.origin_state].filter(Boolean).join(', '),
          [trip.destination_city, trip.destination_state].filter(Boolean).join(', '),
        ]
          .filter(Boolean)
          .join(' → ') || 'No route';

        // Calculate gross pay
        const grossPay = trip.driver_pay_total || calculateDriverPay(
          trip.trip_pay_mode,
          trip.trip_rate_per_mile,
          trip.trip_rate_per_cuft,
          trip.trip_percent_of_revenue,
          trip.trip_flat_daily_rate,
          trip.actual_miles,
          trip.total_cuft,
          trip.revenue_total,
          trip.start_date,
          trip.end_date
        );

        // Calculate reimbursable expenses (paid by driver personally)
        const reimbursableExpenses = (trip.trip_expenses || [])
          .filter((e: { paid_by: string }) => e.paid_by === 'driver_personal')
          .reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0);

        // Calculate cash collected (should be deducted from pay)
        const cashCollected = (trip.trip_expenses || [])
          .filter((e: { paid_by: string }) => e.paid_by === 'driver_cash')
          .reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0);

        const netPay = grossPay + reimbursableExpenses - cashCollected;

        return {
          tripId: trip.id,
          tripNumber: trip.trip_number,
          status: trip.status,
          settlementStatus: (trip.settlement_status || 'pending') as SettlementStatus,
          route,
          startDate: trip.start_date,
          endDate: trip.end_date,
          payMode: trip.trip_pay_mode,
          ratePerMile: trip.trip_rate_per_mile,
          ratePerCuft: trip.trip_rate_per_cuft,
          percentOfRevenue: trip.trip_percent_of_revenue,
          flatDailyRate: trip.trip_flat_daily_rate,
          totalMiles: trip.actual_miles,
          totalCuft: trip.total_cuft,
          totalRevenue: trip.revenue_total,
          grossPay,
          reimbursableExpenses,
          cashCollected,
          netPay,
          paidAt: trip.settlement_paid_at,
          paidMethod: trip.settlement_paid_method,
        };
      });

      setSettlements(tripSettlements);

      // Calculate summary
      const summaryData: EarningsSummary = {
        totalEarned: tripSettlements.reduce((sum, s) => sum + s.netPay, 0),
        pendingPay: tripSettlements
          .filter((s) => s.settlementStatus !== 'paid')
          .reduce((sum, s) => sum + s.netPay, 0),
        paidOut: tripSettlements
          .filter((s) => s.settlementStatus === 'paid')
          .reduce((sum, s) => sum + s.netPay, 0),
        tripsCompleted: tripSettlements.length,
        totalMiles: tripSettlements.reduce((sum, s) => sum + (s.totalMiles || 0), 0),
        totalCuft: tripSettlements.reduce((sum, s) => sum + (s.totalCuft || 0), 0),
      };

      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return { settlements, summary, loading, error, refetch: fetchEarnings };
}

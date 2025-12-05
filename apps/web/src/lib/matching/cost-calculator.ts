/**
 * Cost Calculator for Smart Load Matching
 * Estimates driver pay and fuel costs for potential loads
 */

import type { DriverPayMode } from '@/data/driver-shared';

export interface DriverPayConfig {
  pay_mode: DriverPayMode;
  rate_per_mile?: number | null;
  rate_per_cuft?: number | null;
  percent_of_revenue?: number | null;
  flat_daily_rate?: number | null;
}

export interface CostEstimate {
  driverCost: number;
  fuelCost: number;
  totalCost: number;
  breakdown: {
    driverMilesCost: number;
    driverCuftCost: number;
    driverPercentCost: number;
    driverDailyCost: number;
    fuelCost: number;
  };
}

// Default fuel cost per mile (can be overridden)
const DEFAULT_FUEL_COST_PER_MILE = 0.50;

/**
 * Estimate costs for a potential load
 */
export function estimateLoadCosts(
  driverConfig: DriverPayConfig,
  totalMiles: number,
  cubicFeet: number,
  revenue: number,
  estimatedDays: number = 1,
  fuelCostPerMile: number = DEFAULT_FUEL_COST_PER_MILE
): CostEstimate {
  let driverMilesCost = 0;
  let driverCuftCost = 0;
  let driverPercentCost = 0;
  let driverDailyCost = 0;

  switch (driverConfig.pay_mode) {
    case 'per_mile':
      driverMilesCost = totalMiles * (driverConfig.rate_per_mile || 0);
      break;

    case 'per_cuft':
      driverCuftCost = cubicFeet * (driverConfig.rate_per_cuft || 0);
      break;

    case 'per_mile_and_cuft':
      driverMilesCost = totalMiles * (driverConfig.rate_per_mile || 0);
      driverCuftCost = cubicFeet * (driverConfig.rate_per_cuft || 0);
      break;

    case 'percent_of_revenue':
      driverPercentCost = revenue * ((driverConfig.percent_of_revenue || 0) / 100);
      break;

    case 'flat_daily_rate':
      driverDailyCost = estimatedDays * (driverConfig.flat_daily_rate || 0);
      break;

    default:
      // Unknown pay mode, estimate conservatively
      driverMilesCost = totalMiles * 0.50; // Default estimate
  }

  const driverCost = driverMilesCost + driverCuftCost + driverPercentCost + driverDailyCost;
  const fuelCost = totalMiles * fuelCostPerMile;

  return {
    driverCost: Number(driverCost.toFixed(2)),
    fuelCost: Number(fuelCost.toFixed(2)),
    totalCost: Number((driverCost + fuelCost).toFixed(2)),
    breakdown: {
      driverMilesCost: Number(driverMilesCost.toFixed(2)),
      driverCuftCost: Number(driverCuftCost.toFixed(2)),
      driverPercentCost: Number(driverPercentCost.toFixed(2)),
      driverDailyCost: Number(driverDailyCost.toFixed(2)),
      fuelCost: Number(fuelCost.toFixed(2)),
    },
  };
}

/**
 * Estimate number of days for a load based on distance
 */
export function estimateDaysForLoad(totalMiles: number, averageMilesPerDay: number = 500): number {
  return Math.max(1, Math.ceil(totalMiles / averageMilesPerDay));
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, totalCost: number): number {
  if (revenue === 0) return 0;
  return Number((((revenue - totalCost) / revenue) * 100).toFixed(2));
}

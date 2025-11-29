// Client-safe vehicle type utilities
// Extracted from fleet.ts to avoid server-side imports in client components

export type TruckVehicleType =
  | 'tractor'
  | '26ft_box_truck'
  | '22ft_box_truck'
  | '20ft_box_truck'
  | '16ft_box_truck'
  | '12ft_box_truck'
  | 'sprinter_van'
  | 'cargo_van'
  | 'other';

// Vehicle type capacity mapping (cubic feet)
export const VEHICLE_TYPE_CAPACITIES: Record<TruckVehicleType, number> = {
  'tractor': 0, // Tractors don't have cubic capacity
  '26ft_box_truck': 1700,
  '22ft_box_truck': 1400,
  '20ft_box_truck': 1200,
  '16ft_box_truck': 900,
  '12ft_box_truck': 650,
  'sprinter_van': 400,
  'cargo_van': 250,
  'other': 0, // User must specify
};

export function getCapacityForVehicleType(
  vehicleType: TruckVehicleType | null | undefined
): number | null {
  if (!vehicleType || vehicleType === 'other' || vehicleType === 'tractor') {
    return null;
  }
  return VEHICLE_TYPE_CAPACITIES[vehicleType];
}

export const VEHICLE_TYPE_OPTIONS: Array<{ value: TruckVehicleType; label: string }> = [
  { value: 'tractor', label: 'Tractor' },
  { value: '26ft_box_truck', label: '26ft Box Truck' },
  { value: '22ft_box_truck', label: '22ft Box Truck' },
  { value: '20ft_box_truck', label: '20ft Box Truck' },
  { value: '16ft_box_truck', label: '16ft Box Truck' },
  { value: '12ft_box_truck', label: '12ft Box Truck' },
  { value: 'sprinter_van', label: 'Sprinter Van' },
  { value: 'cargo_van', label: 'Cargo Van' },
  { value: 'other', label: 'Other' },
];


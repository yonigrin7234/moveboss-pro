// Trip status
export type TripStatus = 'planned' | 'active' | 'en_route' | 'completed' | 'settled' | 'cancelled';

// Load workflow status
export type LoadStatus = 'pending' | 'accepted' | 'loading' | 'loaded' | 'in_transit' | 'delivered' | 'storage_completed';

// Expense categories
export type ExpenseCategory = 'fuel' | 'tolls' | 'driver_pay' | 'lumper' | 'parking' | 'maintenance' | 'other';

// Expense payment methods
export type ExpensePaidBy = 'driver_personal' | 'driver_cash' | 'company_card' | 'fuel_card' | null;

// Driver pay modes
export type DriverPayMode = 'per_mile' | 'per_cuft' | 'per_mile_and_cuft' | 'percent_of_revenue' | 'flat_daily_rate';

export interface Trip {
  id: string;
  owner_id: string;
  trip_number: number;
  status: TripStatus;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  start_date: string | null;
  end_date: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  odometer_start_photo_url: string | null;
  odometer_end_photo_url: string | null;
  total_miles: number | null;
  actual_miles: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Financial fields
  revenue_total: number | null;
  driver_pay_total: number | null;
  fuel_total: number | null;
  tolls_total: number | null;
  other_expenses_total: number | null;
  profit_total: number | null;
  total_cuft: number | null;
  // Driver pay snapshot
  trip_pay_mode: DriverPayMode | null;
  trip_rate_per_mile: number | null;
  trip_rate_per_cuft: number | null;
  trip_percent_of_revenue: number | null;
  trip_flat_daily_rate: number | null;
}

export interface Load {
  id: string;
  owner_id: string;
  job_number: string | null;
  load_number: string | null;
  load_type: 'pickup' | 'live_load' | 'company_load' | 'rfd' | 'local' | 'long_distance' | 'intrastate' | 'interstate';
  service_type: string | null;
  company_id: string | null;
  status: string;
  load_status: LoadStatus;
  // Pickup
  pickup_date: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_address_line1: string | null;
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  // Delivery
  delivery_date: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_address_line1: string | null;
  dropoff_city: string | null;
  dropoff_state: string | null;
  dropoff_address_line1: string | null;
  // Dimensions
  cubic_feet: number | null;
  actual_cuft_loaded: number | null;
  starting_cuft: number | null;
  ending_cuft: number | null;
  weight_lbs_estimate: number | null;
  pieces_count: number | null;
  description: string | null;
  // Pricing
  total_rate: number | null;
  total_revenue: number | null;
  balance_due_on_delivery: number | null;
  // Collection
  amount_collected_on_delivery: number | null;
  payment_method: string | null;
  // Timestamps
  accepted_at: string | null;
  loading_started_at: string | null;
  loading_finished_at: string | null;
  delivery_started_at: string | null;
  delivery_finished_at: string | null;
  created_at: string;
  updated_at: string;
  // Photos
  loading_start_photo: string | null;
  loading_end_photo: string | null;
  contract_photo_url: string | null;
  delivery_report_photo_url: string | null;
  // Storage
  storage_drop: boolean;
  storage_location_name: string | null;
  // Company info (joined)
  companies?: {
    name: string;
    phone: string | null;
    trust_level?: 'trusted' | 'cod_required';
  } | null;
}

export interface TripLoad {
  id: string;
  trip_id: string;
  load_id: string;
  sequence_index: number;
  role: 'primary' | 'backhaul' | 'partial';
  loads: Load;
}

export interface TripExpense {
  id: string;
  owner_id: string;
  trip_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  incurred_at: string | null;
  expense_type: string | null;
  paid_by: ExpensePaidBy;
  receipt_photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Vehicle info (for trucks and trailers)
export interface Vehicle {
  id: string;
  unit_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  plate_number: string | null;
}

export interface TripWithLoads extends Trip {
  trip_loads: TripLoad[];
  trip_expenses: TripExpense[];
  trucks?: Vehicle | null;
  trailers?: Vehicle | null;
}

export interface Driver {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive' | 'suspended';
  pay_mode: DriverPayMode | null;
  rate_per_mile: number | null;
  rate_per_cuft: number | null;
  percent_of_revenue: number | null;
  flat_daily_rate: number | null;
}

// Settlement status
export type SettlementStatus = 'pending' | 'review' | 'approved' | 'paid';

// Settlement preview
export interface SettlementPreview {
  grossPay: number;
  reimbursements: number;
  collections: number;
  netPay: number;
  breakdown: {
    label: string;
    value: number;
  }[];
}

// Trip settlement for earnings view
export interface TripSettlement {
  tripId: string;
  tripNumber: number;
  status: TripStatus;
  settlementStatus: SettlementStatus;
  route: string;
  startDate: string | null;
  endDate: string | null;
  // Pay calculation
  payMode: DriverPayMode | null;
  ratePerMile: number | null;
  ratePerCuft: number | null;
  percentOfRevenue: number | null;
  flatDailyRate: number | null;
  // Totals
  totalMiles: number | null;
  totalCuft: number | null;
  totalRevenue: number | null;
  // Calculated pay
  grossPay: number;
  // Expenses
  reimbursableExpenses: number;
  cashCollected: number;
  // Net
  netPay: number;
  // Payment info
  paidAt: string | null;
  paidMethod: string | null;
}

// Earnings summary
export interface EarningsSummary {
  totalEarned: number;
  pendingPay: number;
  paidOut: number;
  tripsCompleted: number;
  totalMiles: number;
  totalCuft: number;
}

-- Migration: Load Source, Contract Details, and Payment Collection
-- Purpose: Support different load scenarios (own customer, partner, marketplace)
--          and driver workflow for entering contract details after loading

BEGIN;
-- ============================================================================
-- PART 1: LOADS TABLE - Load Source
-- ============================================================================

-- Add load_source field
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_source TEXT;
-- Add constraint for load_source
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_load_source_check;
ALTER TABLE loads ADD CONSTRAINT loads_load_source_check
  CHECK (load_source IS NULL OR load_source IN ('own_customer', 'partner', 'marketplace'));
COMMENT ON COLUMN loads.load_source IS 'Source of load: own_customer (all details known), partner (driver enters contract after loading), marketplace (claimed from marketplace)';
-- ============================================================================
-- PART 2: LOADS TABLE - Update posting_type constraint to include live_load
-- ============================================================================

-- Update posting_type constraint to include 'live_load'
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_posting_type_check;
ALTER TABLE loads ADD CONSTRAINT loads_posting_type_check
  CHECK (posting_type IS NULL OR posting_type IN ('pickup', 'load', 'live_load'));
COMMENT ON COLUMN loads.posting_type IS 'Type of posting: pickup (full job for sale), load (RFD ready for delivery), live_load (crew at customer home)';
-- ============================================================================
-- PART 3: LOADS TABLE - Loading date for live loads
-- ============================================================================

-- Add specific loading date (for live loads - single day, not a range)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_date_specific DATE;
COMMENT ON COLUMN loads.loading_date_specific IS 'Specific loading date for live loads (single day, not a range)';
-- ============================================================================
-- PART 4: LOADS TABLE - Customer fields (full addresses)
-- ============================================================================

-- Add full address fields for own_customer and pickup types
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_address_full TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_address_full TEXT;
COMMENT ON COLUMN loads.pickup_address_full IS 'Complete pickup address as single text field';
COMMENT ON COLUMN loads.delivery_address_full IS 'Complete delivery address as single text field';
-- ============================================================================
-- PART 5: LOADS TABLE - Contract details (driver enters for partner/marketplace)
-- ============================================================================

-- Contract entry tracking
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_details_entered_at TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_details_entered_by UUID REFERENCES drivers(id);
-- Contract details from loading report
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_job_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_actual_cuft INTEGER;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_rate_per_cuft DECIMAL(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_linehaul_total DECIMAL(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_balance_due DECIMAL(10,2);
-- Contract accessorials
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_shuttle DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_long_carry DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_stairs DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_bulky DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_packing DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_other DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_accessorial_notes TEXT;
-- Amount owed to carrier
ALTER TABLE loads ADD COLUMN IF NOT EXISTS amount_company_owes DECIMAL(10,2);
-- Photo URLs for loading report and contract
ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_report_photo_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS contract_photo_url TEXT;
COMMENT ON COLUMN loads.contract_details_entered_at IS 'When driver entered contract details';
COMMENT ON COLUMN loads.contract_details_entered_by IS 'Driver who entered contract details';
COMMENT ON COLUMN loads.contract_job_number IS 'Job number from contract/loading report';
COMMENT ON COLUMN loads.contract_actual_cuft IS 'Actual cubic feet from loading report';
COMMENT ON COLUMN loads.contract_rate_per_cuft IS 'Rate per CF from contract';
COMMENT ON COLUMN loads.contract_linehaul_total IS 'Linehaul total from contract';
COMMENT ON COLUMN loads.contract_balance_due IS 'Balance due from customer per contract';
COMMENT ON COLUMN loads.amount_company_owes IS 'Amount company owes to carrier for this load';
-- ============================================================================
-- PART 6: LOADS TABLE - Balance collection fields
-- ============================================================================

-- Balance adjustment
ALTER TABLE loads ADD COLUMN IF NOT EXISTS balance_adjusted BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS balance_adjusted_amount DECIMAL(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS balance_adjusted_reason TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS balance_adjustment_proof_url TEXT;
-- Payment method (separate from existing collection_method)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS payment_zelle_recipient TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS payment_photo_front_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS payment_photo_back_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS payment_notes TEXT;
-- Add constraints
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_payment_method_check;
ALTER TABLE loads ADD CONSTRAINT loads_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cashier_check', 'money_order', 'personal_check', 'cash', 'zelle', 'already_paid'));
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_payment_zelle_recipient_check;
ALTER TABLE loads ADD CONSTRAINT loads_payment_zelle_recipient_check
  CHECK (payment_zelle_recipient IS NULL OR payment_zelle_recipient IN ('owner', 'driver', 'original_company'));
COMMENT ON COLUMN loads.balance_adjusted IS 'Whether the balance was adjusted from original amount';
COMMENT ON COLUMN loads.balance_adjusted_amount IS 'New balance amount after adjustment';
COMMENT ON COLUMN loads.balance_adjusted_reason IS 'Reason for balance adjustment';
COMMENT ON COLUMN loads.payment_method IS 'How customer paid: cashier_check, money_order, personal_check, cash, zelle, already_paid';
COMMENT ON COLUMN loads.payment_zelle_recipient IS 'For Zelle payments: who receives (owner, driver, original_company)';
-- ============================================================================
-- PART 7: LOADS TABLE - Delivery accessorials (charged at delivery)
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_shuttle DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_long_carry DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_stairs DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_bulky DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_packing DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_other DECIMAL(10,2) DEFAULT 0;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_accessorial_notes TEXT;
COMMENT ON COLUMN loads.delivery_accessorial_shuttle IS 'Shuttle charge at delivery';
COMMENT ON COLUMN loads.delivery_accessorial_long_carry IS 'Long carry charge at delivery';
COMMENT ON COLUMN loads.delivery_accessorial_stairs IS 'Stairs charge at delivery';
COMMENT ON COLUMN loads.delivery_accessorial_bulky IS 'Bulky item charge at delivery';
COMMENT ON COLUMN loads.delivery_accessorial_packing IS 'Packing materials charge at delivery';
COMMENT ON COLUMN loads.delivery_accessorial_other IS 'Other accessorial charge at delivery';
-- ============================================================================
-- PART 8: LOADS TABLE - Delivery document fields
-- ============================================================================

-- Single URL fields (in addition to existing JSONB arrays)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS bol_signed_photo_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS inventory_signed_photo_url TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS additional_docs_urls TEXT[];
COMMENT ON COLUMN loads.bol_signed_photo_url IS 'URL of signed BOL photo';
COMMENT ON COLUMN loads.inventory_signed_photo_url IS 'URL of signed inventory photo';
COMMENT ON COLUMN loads.additional_docs_urls IS 'Array of URLs for additional document photos';
-- ============================================================================
-- PART 9: LOADS TABLE - Order fields
-- ============================================================================

ALTER TABLE loads ADD COLUMN IF NOT EXISTS loading_order INTEGER;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_order INTEGER;
COMMENT ON COLUMN loads.loading_order IS 'Order in which this load should be loaded (1 = first)';
COMMENT ON COLUMN loads.delivery_order IS 'Order in which this load should be delivered (1 = first)';
-- ============================================================================
-- PART 10: COMPANIES TABLE - Capability and trust fields
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS can_do_pickups BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_fleet BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS has_crew BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trust_notes TEXT;
COMMENT ON COLUMN companies.can_do_pickups IS 'Company can perform pickup operations';
COMMENT ON COLUMN companies.has_fleet IS 'Company has trucks and trailers';
COMMENT ON COLUMN companies.has_crew IS 'Company has loading/unloading crew';
COMMENT ON COLUMN companies.is_trusted IS 'Company is a trusted partner';
COMMENT ON COLUMN companies.trust_notes IS 'Notes about trust level and relationship';
-- ============================================================================
-- PART 11: TRIPS TABLE - Delivery order tracking
-- ============================================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS current_delivery_index INTEGER DEFAULT 1;
COMMENT ON COLUMN trips.current_delivery_index IS 'Index of current delivery being worked on (1-based)';
-- ============================================================================
-- PART 12: Indexes for new fields
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loads_load_source ON loads(load_source) WHERE load_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_loading_date_specific ON loads(loading_date_specific) WHERE loading_date_specific IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_contract_entered ON loads(contract_details_entered_at) WHERE contract_details_entered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loads_payment_method ON loads(payment_method) WHERE payment_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_trusted ON companies(is_trusted) WHERE is_trusted = true;
CREATE INDEX IF NOT EXISTS idx_companies_capabilities ON companies(can_do_pickups, has_fleet, has_crew);
COMMIT;

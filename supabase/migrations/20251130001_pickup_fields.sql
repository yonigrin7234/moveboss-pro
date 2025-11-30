-- Pickup completion fields for tracking payment at origin and delivery scheduling
-- These fields are used when posting_type = 'pickup' (carrier picks up from customer's home)

-- Customer's ready-for-delivery date
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_rfd_date DATE;

-- Optional end of delivery window
ALTER TABLE loads ADD COLUMN IF NOT EXISTS customer_rfd_date_end DATE;

-- Delivery notes/instructions
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Payment collected at pickup (before delivery)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS amount_collected_at_pickup DECIMAL(10,2) DEFAULT 0;

-- Calculated: contract_balance_due - amount_collected_at_pickup
ALTER TABLE loads ADD COLUMN IF NOT EXISTS remaining_balance_for_delivery DECIMAL(10,2);

-- Timestamp when driver completed pickup flow
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_completed_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN loads.customer_rfd_date IS 'First available date for delivery (RFD - Ready for Delivery)';
COMMENT ON COLUMN loads.amount_collected_at_pickup IS 'Payment collected from customer at pickup, before delivery';
COMMENT ON COLUMN loads.remaining_balance_for_delivery IS 'Balance due at delivery = contract_balance_due - amount_collected_at_pickup';
COMMENT ON COLUMN loads.pickup_completed_at IS 'When driver completed the pickup completion flow';

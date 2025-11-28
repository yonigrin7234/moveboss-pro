-- Storage Location Payment Tracking
-- Add fields to track payments, alerts, and vacate status

-- Add new columns for payment tracking
ALTER TABLE storage_locations
ADD COLUMN IF NOT EXISTS track_payments boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS alert_days_before integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS next_payment_due date,
ADD COLUMN IF NOT EXISTS vacated_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN storage_locations.track_payments IS 'Whether to track payment due dates and show alerts';
COMMENT ON COLUMN storage_locations.alert_days_before IS 'How many days before due date to start showing alerts';
COMMENT ON COLUMN storage_locations.next_payment_due IS 'The next payment due date';
COMMENT ON COLUMN storage_locations.vacated_at IS 'When the location was vacated (stops tracking)';

-- Add storage_location_id to compliance_alerts table
ALTER TABLE compliance_alerts
ADD COLUMN IF NOT EXISTS storage_location_id uuid REFERENCES storage_locations(id);

COMMENT ON COLUMN compliance_alerts.storage_location_id IS 'Reference to storage location for payment due alerts';

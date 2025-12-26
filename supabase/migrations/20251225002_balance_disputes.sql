-- Balance Disputes: Allows drivers to report incorrect balances and dispatch to resolve
-- Part of the collect payment flow when balance shows as $0 but driver believes it's wrong

BEGIN;

-- Create the balance_disputes table
CREATE TABLE IF NOT EXISTS load_balance_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Load reference
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,

  -- Who initiated the dispute
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,

  -- Dispute details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'cancelled')),
  original_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_note TEXT, -- Optional note from driver explaining the issue

  -- Resolution (filled by dispatch)
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_type TEXT CHECK (resolution_type IN ('confirmed_zero', 'balance_updated', 'cancelled')),
  new_balance DECIMAL(10,2), -- If balance was updated, the new amount
  resolution_note TEXT, -- Note from dispatch explaining resolution

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_balance_disputes_load_id ON load_balance_disputes(load_id);
CREATE INDEX IF NOT EXISTS idx_balance_disputes_driver_id ON load_balance_disputes(driver_id);
CREATE INDEX IF NOT EXISTS idx_balance_disputes_status ON load_balance_disputes(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_balance_disputes_created_at ON load_balance_disputes(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE load_balance_disputes IS 'Tracks driver-reported balance discrepancies for resolution by dispatch';
COMMENT ON COLUMN load_balance_disputes.status IS 'pending = awaiting dispatch review, resolved = dispatch has responded, cancelled = driver cancelled';
COMMENT ON COLUMN load_balance_disputes.resolution_type IS 'confirmed_zero = balance was correct at $0, balance_updated = new balance set, cancelled = dispute withdrawn';

-- Enable Row Level Security
ALTER TABLE load_balance_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Drivers can view their own disputes
DROP POLICY IF EXISTS "Drivers can view own disputes" ON load_balance_disputes;
CREATE POLICY "Drivers can view own disputes"
  ON load_balance_disputes
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
  );

-- Drivers can create disputes
DROP POLICY IF EXISTS "Drivers can create disputes" ON load_balance_disputes;
CREATE POLICY "Drivers can create disputes"
  ON load_balance_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
  );

-- Drivers can cancel their own pending disputes
DROP POLICY IF EXISTS "Drivers can cancel own pending disputes" ON load_balance_disputes;
CREATE POLICY "Drivers can cancel own pending disputes"
  ON load_balance_disputes
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE auth_user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Workspace members can view disputes for loads in their workspace
DROP POLICY IF EXISTS "Workspace members can view workspace disputes" ON load_balance_disputes;
CREATE POLICY "Workspace members can view workspace disputes"
  ON load_balance_disputes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads l
      JOIN companies c ON l.owner_id = c.owner_id
      JOIN company_memberships cm ON cm.company_id = c.id
      WHERE l.id = load_balance_disputes.load_id
        AND cm.user_id = auth.uid()
    )
  );

-- Workspace members can resolve disputes for loads in their workspace
DROP POLICY IF EXISTS "Workspace members can resolve disputes" ON load_balance_disputes;
CREATE POLICY "Workspace members can resolve disputes"
  ON load_balance_disputes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads l
      JOIN companies c ON l.owner_id = c.owner_id
      JOIN company_memberships cm ON cm.company_id = c.id
      WHERE l.id = load_balance_disputes.load_id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('resolved', 'cancelled')
    AND resolved_by = auth.uid()
  );

-- Owners can view and manage all disputes for their loads
DROP POLICY IF EXISTS "Owners can manage own load disputes" ON load_balance_disputes;
CREATE POLICY "Owners can manage own load disputes"
  ON load_balance_disputes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_balance_disputes.load_id
        AND l.owner_id = auth.uid()
    )
  );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_dispute_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS balance_disputes_updated_at ON load_balance_disputes;
CREATE TRIGGER balance_disputes_updated_at
  BEFORE UPDATE ON load_balance_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_dispute_updated_at();

-- Add notification type for balance disputes to the notification_log enum if not exists
-- (notification_log uses text type, so we just need to ensure it accepts our new types)

COMMIT;

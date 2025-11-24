-- MANUAL INSERT TEST FOR DRIVERS TABLE
-- Run this directly in Supabase SQL Editor to test if the table/schema works

-- Step 1: Get your user ID (replace with your actual email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Insert a test driver (replace USER_ID_HERE with your actual user ID from step 1)
INSERT INTO drivers (
  owner_id,
  first_name,
  last_name,
  status,
  pay_mode,
  driver_type,
  license_number,
  license_state,
  license_expiry,
  medical_card_expiry
) VALUES (
  'USER_ID_HERE',  -- Replace with your actual user ID
  'Test',
  'Driver',
  'active',
  'per_mile',
  'company_driver',
  'TEST-123',
  'CA',
  CURRENT_DATE + INTERVAL '1 year',
  CURRENT_DATE + INTERVAL '1 year'
)
RETURNING id, owner_id, first_name, last_name, created_at;

-- Step 3: Verify the row exists
-- SELECT id, owner_id, first_name, last_name, created_at 
-- FROM drivers 
-- WHERE first_name = 'Test' AND last_name = 'Driver'
-- ORDER BY created_at DESC;


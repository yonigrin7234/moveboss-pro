-- ============================================================================
-- ADD PROFILES READ POLICY FOR MESSAGING
-- ============================================================================
-- Allow users to read profiles of others in the same company or conversation
-- This enables showing sender names in messaging
-- ============================================================================

-- Allow reading profiles of users in the same company
DROP POLICY IF EXISTS profiles_select_same_company ON profiles;

CREATE POLICY profiles_select_same_company
  ON profiles FOR SELECT
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Same company members
    EXISTS (
      SELECT 1 FROM company_memberships cm1
      JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = profiles.id
    )
    OR
    -- Drivers can see profiles of users in their company
    EXISTS (
      SELECT 1 FROM drivers d
      JOIN company_memberships cm ON d.company_id = cm.company_id
      WHERE d.auth_user_id = auth.uid()
        AND cm.user_id = profiles.id
    )
  );

-- ============================================================================
-- DONE
-- ============================================================================

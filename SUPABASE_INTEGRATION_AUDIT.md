# Supabase Integration Audit

**Generated:** December 2024  
**Scope:** Complete audit of all Supabase tables, RPC functions, and edge functions

---

## 📊 SUMMARY

- **Total Tables Defined:** 40+
- **Tables Used in App:** 35
- **Unused Tables:** 5
- **Total RPC Functions Defined:** 25+
- **RPC Functions Used:** 7
- **Unused RPC Functions:** 18+
- **Edge Functions:** 0 (none defined)
- **Invalid API Calls:** 1 (payments table doesn't exist)

---

## ✅ TABLES - USAGE STATUS

### Fully Used Tables (35)

#### Core Entities
1. ✅ **trips** - Used extensively in `data/trips.ts`, trip management pages
2. ✅ **trip_loads** - Used in `data/trips.ts`, trip detail pages
3. ✅ **trip_expenses** - Used in `data/trips.ts`, expense tracking
4. ✅ **drivers** - Used extensively in `data/drivers.ts`, driver management
5. ✅ **trucks** - Used in `data/fleet.ts`, fleet management
6. ✅ **trailers** - Used in `data/fleet.ts`, fleet management
7. ✅ **loads** - Used extensively in `data/loads.ts`, load management
8. ✅ **companies** - Used extensively in `data/companies.ts`, company management
9. ✅ **profiles** - Used in `data/profiles.ts`, auth callback, team management

#### Financial & Settlements
10. ✅ **trip_settlements** - Used in `data/settlements.ts`, settlement management
11. ✅ **settlement_line_items** - Used in `data/settlements.ts`, settlement details
12. ✅ **receivables** - Used in `data/settlements.ts`, receivables tracking
13. ✅ **payables** - Used in `data/settlements.ts`, payables tracking

#### Marketplace & Partnerships
14. ✅ **load_requests** - Used extensively in `data/marketplace.ts`, marketplace operations
15. ✅ **company_partnerships** - Used in `data/partnerships.ts`, partnership management
16. ✅ **partnership_invitations** - Used in `data/partnerships.ts`, invitation flow

#### Compliance & Documents
17. ✅ **compliance_documents** - Used in `data/compliance-documents.ts`, document management
18. ✅ **compliance_document_types** - Used in `data/compliance-documents.ts`, document types
19. ✅ **compliance_requests** - Used in `data/compliance.ts`, partner document requests
20. ✅ **compliance_alerts** - Used in `data/compliance-alerts.ts`, alert tracking

#### Storage & Locations
21. ✅ **storage_locations** - Used in `data/storage-locations.ts`, storage management

#### Notifications & Activity
22. ✅ **notifications** - Used in `data/notifications.ts`, notification system
23. ✅ **activity_log** - Used in `data/activity-log.ts`, activity tracking
24. ✅ **load_cancellations** - Used in `data/cancellations.ts`, cancellation tracking

#### Photos & Media
25. ✅ **load_photos** - Used in `data/load-photos.ts`, photo management

#### Status & History
26. ✅ **load_status_history** - Used in `data/load-status.ts`, status tracking
27. ✅ **load_status_updates** - Used in `data/marketplace.ts` (referenced), status updates

#### Access & Permissions
28. ✅ **company_memberships** - Used in `data/companies.ts`, `settings/team/actions.ts`, team management
29. ✅ **team_invitations** - Used in `settings/team/actions.ts`, invitation management

#### Onboarding & Setup
30. ✅ **setup_progress** - Used in `data/setup-progress.ts`, onboarding tracking
31. ✅ **driver_invite_codes** - Used in `data/onboarding.ts`, driver onboarding

#### Email & Preferences
32. ✅ **email_preferences** - Used in `lib/email/notifications.ts`, email settings

#### Ratings & Reviews
33. ✅ **ratings** - Used in `data/ratings.ts`, rating system

#### Location Tracking
34. ✅ **driver_locations** - Used in `data/location.ts`, live fleet tracking

#### Push Notifications
35. ✅ **push_tokens** - Used in `lib/push-notifications.ts`, mobile notifications
36. ✅ **notification_log** - Used in `lib/push-notifications.ts`, notification tracking

---

## ⚠️ UNUSED TABLES (5)

### 1. **customers**
**Status:** ❌ Not Used  
**Defined In:** `20251126007_comprehensive_platform_foundation.sql`  
**Purpose:** Store customer information (residential, commercial, military, corporate)  
**Why Unused:** Customer data is currently stored directly in loads table (customer_name, customer_phone fields)  
**Recommendation:** Either migrate to use this table or remove it

### 2. **corporate_accounts**
**Status:** ❌ Not Used  
**Defined In:** `20251126007_comprehensive_platform_foundation.sql`  
**Purpose:** Store corporate account information with negotiated rates  
**Why Unused:** Corporate account functionality not yet implemented  
**Recommendation:** Keep for future corporate account feature

### 3. **compliance_requirements**
**Status:** ❌ Not Used  
**Defined In:** `20251126007_comprehensive_platform_foundation.sql`  
**Purpose:** Define compliance requirements per company type  
**Why Unused:** Compliance requirements are currently hardcoded in app logic  
**Recommendation:** Consider using this table for dynamic compliance requirements

### 4. **load_payments**
**Status:** ❌ Not Used  
**Defined In:** `20251125001_trust_level_and_delivery_flow.sql`  
**Purpose:** Track COD payments, customer balances, accessorials  
**Why Unused:** Payment tracking is not yet implemented in the UI  
**Recommendation:** Keep for future payment tracking feature

### 5. **accessorials**
**Status:** ❌ Not Used  
**Defined In:** `20251125001_trust_level_and_delivery_flow.sql`  
**Purpose:** Track accessorial charges (shuttle, stairs, long carry, etc.)  
**Why Unused:** Accessorial tracking not yet implemented  
**Recommendation:** Keep for future accessorial feature

---

## ❌ INVALID API CALLS

### 1. **payments table**
**Status:** ❌ Table Does Not Exist  
**Called In:** `data/company-ledger.ts` (lines 113, 341)  
**Issue:** Code queries `.from('payments')` but no `payments` table exists in migrations  
**What Exists:** `load_payments` table (unused)  
**Error Handling:** Code has error handling (`if (lastPaymentError)`) but will fail silently  
**Fix Required:** Either:
- Create `payments` table, OR
- Use `load_payments` table, OR
- Remove the queries if payments feature not needed

**Code Location:**
```typescript
// apps/web/src/data/company-ledger.ts:113
const { data: lastPayment, error: lastPaymentError } = await supabase
  .from('payments')  // ❌ Table doesn't exist
  .select('amount, payment_date')
  .eq('company_id', companyId)
  .eq('owner_id', userId)
  .order('payment_date', { ascending: false })
  .limit(1)
  .maybeSingle();

// apps/web/src/data/company-ledger.ts:341
let query = supabase
  .from('payments')  // ❌ Table doesn't exist
  .select(`id, amount, payment_date, payment_method, ...`)
  .eq('company_id', companyId)
  .eq('owner_id', userId)
```

---

## 🔧 RPC FUNCTIONS - USAGE STATUS

### Used RPC Functions (7)

1. ✅ **increment_loads_accepted** - Called in `data/marketplace.ts:834`
   - **Purpose:** Increment carrier's loads_accepted_total counter
   - **Status:** ✅ Correctly called

2. ✅ **increment_loads_assigned** - Called in `data/marketplace.ts:835`
   - **Purpose:** Increment company's loads_assigned_total counter
   - **Status:** ✅ Correctly called

3. ✅ **increment_loads_given_back** - Called in `data/cancellations.ts:155,277`
   - **Purpose:** Increment carrier's loads_given_back counter
   - **Status:** ✅ Correctly called

4. ✅ **increment_loads_canceled** - Called in `data/cancellations.ts:275`
   - **Purpose:** Increment company's loads_canceled_on_carriers counter
   - **Status:** ✅ Correctly called

5. ✅ **generate_invite_code** - Called in `data/onboarding.ts:338`
   - **Purpose:** Generate driver invite code
   - **Status:** ✅ Correctly called

6. ✅ **increment_invite_uses** - Called in `data/onboarding.ts:416`
   - **Purpose:** Increment invite code usage count
   - **Status:** ✅ Correctly called

7. ✅ **increment_platform_loads_completed** - Called in `data/load-status.ts:158`
   - **Purpose:** Increment company's platform_loads_completed counter
   - **Status:** ✅ Correctly called

---

## ⚠️ UNUSED RPC FUNCTIONS (18+)

### Statistics & Counter Functions
1. ❌ **increment_carrier_loads_given_back** - Defined but never called
   - **Defined In:** `20251129003_load_release_tracking.sql`
   - **Note:** App uses `increment_loads_given_back` instead (different function name)

2. ❌ **increment_carrier_loads_accepted** - Defined but never called
   - **Defined In:** `20251129003_load_release_tracking.sql`
   - **Note:** App uses `increment_loads_accepted` instead

### Load Numbering Functions
3. ❌ **generate_load_number** - Defined but never directly called
   - **Defined In:** `20251129002_global_load_numbering.sql`
   - **Status:** Used by trigger `set_load_number()`, not directly called
   - **Note:** This is correct - it's a trigger function

4. ❌ **set_load_number** - Defined but never directly called
   - **Defined In:** `20251129002_global_load_numbering.sql`
   - **Status:** Used as trigger on loads table, not directly called
   - **Note:** This is correct - it's a trigger function

### User Management Functions
5. ❌ **handle_new_user** - Defined but never directly called
   - **Defined In:** `20251127011_onboarding.sql`
   - **Status:** Used as trigger on auth.users, not directly called
   - **Note:** This is correct - it's a trigger function

### Rating Functions
6. ❌ **update_company_platform_rating** - Defined but never directly called
   - **Defined In:** `20251127006_ratings.sql`
   - **Status:** Used as trigger on ratings table, not directly called
   - **Note:** This is correct - it's a trigger function

### Load Status Functions
7. ❌ **update_load_operational_status** - Defined but never called
   - **Defined In:** `20251128005_marketplace_trip_integration.sql`
   - **Purpose:** Update load operational status and log change
   - **Recommendation:** Should be used when updating load status

### Photo Functions
8. ❌ **update_load_photo_counts** - Defined but never directly called
   - **Defined In:** `20251127009_photo_proof.sql`
   - **Status:** Used as trigger on load_photos table, not directly called
   - **Note:** This is correct - it's a trigger function

### Setup Progress Functions
9. ❌ **create_setup_progress_for_company** - Defined but never called
   - **Defined In:** `20251130004_setup_progress.sql`
   - **Purpose:** Auto-create setup_progress when company is created
   - **Status:** Should be used as trigger, but trigger may not be set up

### RLS Helper Functions (Used by Policies, Not Directly Called)
10. ❌ **is_trip_driver** - Defined but never directly called
    - **Defined In:** `20251128024_driver_mobile_rls.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

11. ❌ **user_owns_assigned_carrier** - Defined but never directly called
    - **Defined In:** `20251201011_fix_loads_select_policy.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

12. ❌ **user_owns_load_requested_by_company** - Defined but never directly called
    - **Defined In:** `20251201009_fix_companies_carrier_requests_policy.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

13. ❌ **user_requested_load_from_company** - Defined but never directly called
    - **Defined In:** `20251201009_fix_companies_carrier_requests_policy.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

14. ❌ **company_has_marketplace_loads** - Defined but never directly called
    - **Defined In:** `20251201006_companies_marketplace_visibility.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

15. ❌ **driver_has_company_access** - Defined but never directly called
    - **Defined In:** `20251201004_fix_companies_driver_policy.sql`
    - **Status:** Used in RLS policies, not directly called
    - **Note:** This is correct - it's an RLS helper

### Calculation Functions (Used by Triggers)
16. ❌ **calculate_net_weight** - Defined but never directly called
    - **Defined In:** `20251126007_comprehensive_platform_foundation.sql`
    - **Status:** Used by triggers, not directly called
    - **Note:** This is correct - it's a trigger function

17. ❌ **calculate_linehaul** - Defined but never directly called
    - **Defined In:** `20251126007_comprehensive_platform_foundation.sql`
    - **Status:** Used by triggers, not directly called
    - **Note:** This is correct - it's a trigger function

18. ❌ **trigger_origin_net_weight** - Defined but never directly called
    - **Defined In:** `20251126007_comprehensive_platform_foundation.sql`
    - **Status:** Used as trigger, not directly called
    - **Note:** This is correct - it's a trigger function

19. ❌ **trigger_dest_net_weight** - Defined but never directly called
    - **Defined In:** `20251126007_comprehensive_platform_foundation.sql`
    - **Status:** Used as trigger, not directly called
    - **Note:** This is correct - it's a trigger function

20. ❌ **trigger_update_partnership_stats** - Defined but never directly called
    - **Defined In:** `20251126007_comprehensive_platform_foundation.sql`
    - **Status:** Used as trigger, not directly called
    - **Note:** This is correct - it's a trigger function

### Utility Functions (Used by Triggers)
21. ❌ **update_updated_at_column** - Defined but never directly called
    - **Defined In:** `20251125001_trust_level_and_delivery_flow.sql`
    - **Status:** Used by triggers, not directly called
    - **Note:** This is correct - it's a trigger function

22. ❌ **set_updated_at** - Defined but never directly called
    - **Defined In:** `202411210001_trips_module.sql`, `202411210003_drivers_fleet_module.sql`
    - **Status:** Used by triggers, not directly called
    - **Note:** This is correct - it's a trigger function

### FMCSA Functions
23. ❌ **check_dot_availability** - Defined but never called
    - **Defined In:** `20251128020_fmcsa_unique_dot_hhg.sql`
    - **Purpose:** Check if DOT number is available/unique
    - **Recommendation:** Should be used when validating DOT numbers

---

## 🔍 EDGE FUNCTIONS

**Status:** ❌ No Edge Functions Defined  
**Note:** No Supabase Edge Functions are currently deployed or referenced in the codebase.

---

## 📋 DETAILED FINDINGS

### Correct Usage Patterns ✅

1. **Trigger Functions** - Functions like `set_updated_at`, `generate_load_number`, `update_load_photo_counts` are correctly used as triggers, not directly called
2. **RLS Helper Functions** - Functions like `is_trip_driver`, `user_owns_assigned_carrier` are correctly used in RLS policies
3. **Counter Functions** - Statistics functions are correctly called when events occur

### Issues Found ⚠️

1. **Missing Table:** `payments` table is queried but doesn't exist
   - **Location:** `data/company-ledger.ts`
   - **Impact:** Will cause runtime errors
   - **Fix:** Create table or use `load_payments` or remove queries

2. **Unused Function:** `update_load_operational_status` should be used for status updates
   - **Current:** Status updates may be done directly without logging
   - **Recommendation:** Use this function to ensure proper audit trail

3. **Unused Function:** `check_dot_availability` should be used for DOT validation
   - **Current:** DOT validation may not check uniqueness
   - **Recommendation:** Use this function in company creation/update

4. **Duplicate Functions:** `increment_carrier_loads_given_back` vs `increment_loads_given_back`
   - **Issue:** Two similar functions exist, app uses one but not the other
   - **Recommendation:** Consolidate or clarify which to use

5. **Unused Tables:** Several tables defined but never queried
   - **Impact:** Database bloat, confusion about data model
   - **Recommendation:** Either implement features or remove tables

---

## 🎯 RECOMMENDATIONS

### High Priority

1. **Fix Invalid API Call**
   - **Action:** Remove or fix `payments` table queries in `company-ledger.ts`
   - **Options:**
     - Create `payments` table if needed
     - Use `load_payments` table instead
     - Remove queries if feature not needed

2. **Use Status Update Function**
   - **Action:** Use `update_load_operational_status` RPC when updating load status
   - **Benefit:** Ensures proper audit trail in `load_status_updates` table

3. **Use DOT Validation Function**
   - **Action:** Use `check_dot_availability` when validating DOT numbers
   - **Benefit:** Ensures DOT uniqueness

### Medium Priority

4. **Consolidate Counter Functions**
   - **Action:** Decide between `increment_carrier_loads_given_back` and `increment_loads_given_back`
   - **Recommendation:** Use one consistently or remove the other

5. **Implement or Remove Unused Tables**
   - **Tables:** `customers`, `corporate_accounts`, `compliance_requirements`, `load_payments`, `accessorials`
   - **Action:** Either implement features or remove tables to reduce confusion

6. **Setup Progress Trigger**
   - **Action:** Ensure `create_setup_progress_for_company` trigger is set up
   - **Benefit:** Auto-creates setup progress when company is created

### Low Priority

7. **Document RLS Functions**
   - **Action:** Add comments explaining RLS helper functions are for policies only
   - **Benefit:** Reduces confusion about "unused" functions

8. **Review Trigger Functions**
   - **Action:** Verify all triggers are properly set up
   - **Benefit:** Ensures data consistency

---

## 📊 USAGE STATISTICS

### Table Usage
- **Used:** 35 tables (87.5%)
- **Unused:** 5 tables (12.5%)
- **Invalid Calls:** 1 table

### RPC Function Usage
- **Directly Called:** 7 functions
- **Used as Triggers:** 15+ functions (correct usage)
- **Used in RLS:** 6 functions (correct usage)
- **Truly Unused:** 2 functions (`update_load_operational_status`, `check_dot_availability`)

### Overall Health
- **✅ Good:** Most tables and functions are properly used
- **⚠️ Warning:** One invalid table reference needs fixing
- **💡 Opportunity:** Several unused tables could be implemented or removed

---

**End of Audit**


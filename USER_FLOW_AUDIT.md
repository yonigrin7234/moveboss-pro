# User Flow Audit

**Generated:** December 2024  
**Scope:** Complete trace of all user flows from start to finish

---

## 📊 SUMMARY

- **Total Flows Audited:** 6 major flows + 3 sub-flows
- **Fully Functional:** 2 flows
- **Partially Working:** 3 flows
- **Broken/Incomplete:** 1 flow
- **Critical Issues:** 5

---

## 1. ONBOARDING/SIGNUP FLOW

### Flow Path
1. User visits `/signup` → `SignupForm` component
2. User enters email/password → `supabase.auth.signUp()`
3. Email confirmation sent (if enabled)
4. User clicks confirmation link → `/auth/callback`
5. Callback creates profile if missing → Redirects to `/onboarding`
6. User selects role → `setRoleAction()` → Saves to `profiles.role`
7. User completes role-specific setup → `setupCompanyAction()` / `setupCarrierAction()` / etc.
8. Onboarding marked complete → `completeOnboarding()` → Sets `onboarding_completed = true`
9. Redirect to `/dashboard` (or `/driver` for driver role)

### Status: ✅ **FULLY FUNCTIONAL**

**Files:**
- `apps/web/src/app/(auth)/signup/signup-form.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/(app)/onboarding/page.tsx`
- `apps/web/src/app/(app)/onboarding/role-selection.tsx`
- `apps/web/src/app/(app)/onboarding/actions.ts`
- `apps/web/src/data/onboarding.ts`

**What Works:**
- ✅ Signup form with validation
- ✅ Email/password and OAuth (Google, Apple)
- ✅ Profile auto-creation via trigger (`handle_new_user`)
- ✅ Role selection (company, carrier, owner_operator, driver)
- ✅ Role-specific setup forms
- ✅ Company creation with owner membership
- ✅ Driver invite code system
- ✅ Onboarding completion tracking
- ✅ Redirect to appropriate dashboard

**Minor Issues:**
- ⚠️ No email verification enforcement (relies on Supabase config)
- ⚠️ OAuth users may not have `full_name` in metadata (handled gracefully)

---

## 2. LOGIN FLOW

### Flow Path by Role

#### All Roles
1. User visits `/login` → `LoginForm` component
2. User enters credentials → `supabase.auth.signInWithPassword()`
3. On success → `router.refresh()` → Middleware checks auth
4. Middleware checks `onboarding_completed` and `role`
5. Redirect to:
   - `/onboarding` if not completed
   - `/dashboard` if role is `company`, `carrier`, or `owner_operator`
   - `/driver` if role is `driver`

#### OAuth Login (Google/Apple)
1. User clicks OAuth button → `supabase.auth.signInWithOAuth()`
2. Redirects to provider → User authorizes
3. Callback to `/auth/callback`
4. Same flow as signup callback

### Status: ✅ **FULLY FUNCTIONAL**

**Files:**
- `apps/web/src/app/(auth)/login/login-form.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/middleware.ts`

**What Works:**
- ✅ Email/password login
- ✅ OAuth login (Google, Apple)
- ✅ Proper redirects based on onboarding status
- ✅ Role-based dashboard routing
- ✅ Protected route enforcement

**Minor Issues:**
- ⚠️ No "Remember me" option
- ⚠️ No password reset flow visible (may be handled by Supabase)

---

## 3. JOB POSTING AND CLAIMING FLOW

### Flow Path: Posting a Load

#### Step 1: Post Load
1. User navigates to `/dashboard/post-load`
2. User selects load type: `live_load` or `rfd`
3. User fills form (origin, destination, dates, rates, etc.)
4. For RFD loads: Select storage location or create new
5. Submit → Creates `loads` record
6. If `marketplace_listed = true` → Load appears on marketplace

#### Step 2: Load Appears on Marketplace
1. Load visible at `/dashboard/load-board`
2. Carriers can browse and filter loads
3. Click load → `/dashboard/load-board/[id]`

#### Step 3: Carrier Requests Load
1. Carrier views load details
2. Carrier submits request via `LoadRequestForm`
3. `createLoadRequest()` creates `load_requests` record
4. Notification sent to company owner
5. Request status: `pending`

#### Step 4: Company Accepts/Declines Request
1. Company views requests at `/dashboard/posted-jobs/[id]` or `/dashboard/carrier-requests`
2. Company accepts → `acceptLoadRequest()`
3. Updates `load_requests.status = 'accepted'`
4. Updates `loads.assigned_carrier_id`
5. Sets `loads.is_marketplace_visible = false`
6. Declines all other pending requests
7. Creates partnership if not exists
8. Notification sent to carrier

#### Step 5: Carrier Confirms Assignment
1. Carrier sees accepted request at `/dashboard/marketplace-loads`
2. Carrier can assign to trip or confirm directly
3. Load moves to carrier's loads list

### Status: ⚠️ **PARTIALLY WORKING**

**Files:**
- `apps/web/src/app/(app)/dashboard/post-load/page.tsx`
- `apps/web/src/app/(app)/dashboard/load-board/[id]/page.tsx`
- `apps/web/src/data/marketplace.ts`
- `apps/web/src/components/loads/LoadRequestForm.tsx`

**What Works:**
- ✅ Load posting form (live loads and RFD)
- ✅ Storage location selection/creation
- ✅ Marketplace listing
- ✅ Load browsing and filtering
- ✅ Request submission
- ✅ Request acceptance/decline
- ✅ Partnership auto-creation
- ✅ Notifications

**Issues Found:**

1. **❌ Missing: Load Assignment to Trip**
   - **Location:** After carrier accepts, no clear flow to assign load to trip
   - **Expected:** Carrier should be able to assign accepted load to existing trip or create new trip
   - **Current:** Load just appears in carrier's loads list
   - **Impact:** Medium - Workflow incomplete

2. **❌ Missing: Counter Offer Flow**
   - **Location:** `LoadRequestForm` supports counter offers, but company-side UI unclear
   - **Expected:** Company should see counter offer and accept/reject
   - **Current:** Counter offers may be stored but UI not clear
   - **Impact:** Low - Feature partially implemented

3. **⚠️ Missing: Load Release Flow**
   - **Location:** Carrier releasing load back to marketplace
   - **Expected:** Carrier should be able to release assigned load
   - **Current:** Function exists (`increment_carrier_loads_given_back`) but UI not found
   - **Impact:** Medium - Important for marketplace health

4. **⚠️ Missing: Load Status Updates**
   - **Location:** Operational status tracking
   - **Expected:** Use `update_load_operational_status` RPC for status changes
   - **Current:** Status may be updated directly without audit trail
   - **Impact:** Low - Function exists but not used

---

## 4. DRIVER VERIFICATION/FMCSA FLOW

### Flow Path

#### Step 1: Company Enters DOT Number
1. Company navigates to `/dashboard/settings/company-profile`
2. Company enters DOT number in form
3. Company clicks "Verify DOT" button

#### Step 2: FMCSA Verification
1. Frontend calls `/api/fmcsa/verify?dot=1234567` (GET)
2. Backend calls `verifyCarrier()` from `@/lib/fmcsa`
3. Returns FMCSA data (legal name, DBA, authority, insurance, etc.)

#### Step 3: Save Verification
1. Company clicks "Save Verification" or similar
2. Frontend calls `/api/fmcsa/verify` (POST) with `{ dotNumber, companyId }`
3. Backend checks DOT uniqueness (not claimed by another workspace company)
4. Backend verifies with FMCSA
5. Backend updates `companies` table with FMCSA fields
6. Sets `fmcsa_verified = true` if authorized for HHG

#### Step 4: Display Verification Status
1. `DOTVerificationCard` displays verification status
2. Shows legal name, DBA, authority types, insurance, etc.
3. Badge shows "Verified" if `fmcsa_verified = true`

### Status: ⚠️ **PARTIALLY WORKING**

**Files:**
- `apps/web/src/app/(app)/dashboard/settings/company-profile/page.tsx`
- `apps/web/src/app/api/fmcsa/verify/route.ts`
- `apps/web/src/lib/fmcsa.ts` (assumed)

**What Works:**
- ✅ DOT number verification API
- ✅ FMCSA data fetching
- ✅ DOT uniqueness check
- ✅ Company record update
- ✅ Verification status display

**Issues Found:**

1. **❌ Missing: DOT Validation Function Usage**
   - **Location:** `check_dot_availability` RPC exists but not called
   - **Expected:** Should validate DOT before allowing company creation/update
   - **Current:** DOT validation only happens on manual verification
   - **Impact:** Medium - Could prevent duplicate DOTs earlier

2. **⚠️ Missing: Auto-Verification on Company Creation**
   - **Location:** Company creation during onboarding
   - **Expected:** If DOT provided, auto-verify during onboarding
   - **Current:** DOT entered but not verified until manual action
   - **Impact:** Low - Manual verification is acceptable

3. **⚠️ Missing: Verification Expiration Tracking**
   - **Location:** FMCSA data freshness
   - **Expected:** Track when verification was last checked, warn if stale
   - **Current:** `fmcsa_last_checked` exists but no expiration warnings
   - **Impact:** Low - Nice to have

---

## 5. PAYMENT/FINANCIAL TRACKING FLOW

### Flow Path: Receivables

#### Step 1: View Receivables
1. User navigates to `/dashboard/finance/receivables`
2. `listReceivables()` fetches from `receivables` table
3. Displays grouped by company with totals

#### Step 2: Mark as Paid (Expected)
1. User clicks "Mark as Paid" on receivable
2. Updates `receivables.status = 'paid'`
3. Updates `receivables.paid_at`

### Flow Path: Settlements

#### Step 1: View Settlements
1. User navigates to `/dashboard/finance/settlements`
2. `listTripSettlements()` fetches from `trip_settlements` table
3. Displays revenue, driver pay, expenses, profit

#### Step 2: Create Settlement (Expected)
1. User completes trip
2. Creates `trip_settlements` record
3. Creates `settlement_line_items` for revenue, pay, expenses
4. Creates `receivables` for customer/broker
5. Creates `payables` for driver/vendor

### Status: ❌ **BROKEN/INCOMPLETE**

**Files:**
- `apps/web/src/app/(app)/dashboard/finance/receivables/page.tsx`
- `apps/web/src/app/(app)/dashboard/finance/settlements/page.tsx`
- `apps/web/src/data/settlements.ts`
- `apps/web/src/data/company-ledger.ts`

**What Works:**
- ✅ Receivables list view
- ✅ Settlements list view
- ✅ Financial summaries
- ✅ Grouping by company

**Critical Issues:**

1. **❌ CRITICAL: Invalid `payments` Table Query**
   - **Location:** `apps/web/src/data/company-ledger.ts:113, 341`
   - **Issue:** Code queries `.from('payments')` but table doesn't exist
   - **Impact:** Runtime errors when viewing company ledger
   - **Fix Required:** Either create `payments` table or use `load_payments` or remove queries

2. **❌ Missing: Mark Receivable as Paid**
   - **Location:** Receivables page has no action buttons
   - **Expected:** Button to mark receivable as paid
   - **Current:** Read-only view
   - **Impact:** High - Cannot track payments

3. **❌ Missing: Create Settlement Flow**
   - **Location:** No UI to create settlement from trip
   - **Expected:** Button on trip detail page to "Create Settlement"
   - **Current:** Settlements must be created manually or via API
   - **Impact:** High - Core financial workflow missing

4. **❌ Missing: Payment Recording**
   - **Location:** `load_payments` table exists but unused
   - **Expected:** Record COD payments, customer balances, accessorials
   - **Current:** No UI to record payments
   - **Impact:** High - Cannot track actual money collected

5. **❌ Missing: Accessorial Tracking**
   - **Location:** `accessorials` table exists but unused
   - **Expected:** Record accessorial charges (shuttle, stairs, etc.)
   - **Current:** No UI to add accessorials
   - **Impact:** Medium - Revenue tracking incomplete

6. **⚠️ Missing: Receivable Creation**
   - **Location:** Receivables should be auto-created from settlements
   - **Expected:** When settlement finalized, create receivable
   - **Current:** Receivables may need manual creation
   - **Impact:** Medium - Workflow incomplete

---

## 6. OTHER CORE FLOWS

### 6.1 Trip Creation and Management

**Status:** ⚠️ **PARTIALLY WORKING**

**What Works:**
- ✅ Trip creation form
- ✅ Trip list view
- ✅ Trip detail view
- ✅ Load assignment to trips
- ✅ Expense tracking

**Issues:**
- ⚠️ Missing: Trip settlement creation UI (see Payment Flow)
- ⚠️ Missing: Trip status workflow (pending → active → completed)

### 6.2 Driver Management

**Status:** ✅ **FULLY FUNCTIONAL**

**What Works:**
- ✅ Driver list view
- ✅ Driver creation
- ✅ Driver invite codes
- ✅ Driver profile management
- ✅ Compliance tracking

**Issues:**
- ⚠️ Minor: No bulk driver import

### 6.3 Partnership Management

**Status:** ⚠️ **PARTIALLY WORKING**

**What Works:**
- ✅ Partnership list view
- ✅ Partnership creation
- ✅ Partnership invitations
- ✅ Compliance document requests

**Issues:**
- ⚠️ Missing: Partnership termination flow
- ⚠️ Missing: Partnership performance metrics

### 6.4 Storage Location Management

**Status:** ✅ **FULLY FUNCTIONAL**

**What Works:**
- ✅ Storage location creation
- ✅ Storage location list
- ✅ Payment tracking setup
- ✅ Load assignment to storage

**Issues:**
- ⚠️ Minor: No bulk import

---

## 🔴 CRITICAL ISSUES SUMMARY

### High Priority (Blocks Core Functionality)

1. **Invalid `payments` Table Query**
   - **File:** `apps/web/src/data/company-ledger.ts`
   - **Impact:** Runtime errors
   - **Fix:** Create table or remove queries

2. **Missing Payment Recording UI**
   - **Impact:** Cannot track money collected
   - **Fix:** Create UI to record payments using `load_payments` table

3. **Missing Settlement Creation Flow**
   - **Impact:** Cannot finalize trips financially
   - **Fix:** Add "Create Settlement" button on trip detail page

4. **Missing Receivable Payment Tracking**
   - **Impact:** Cannot mark receivables as paid
   - **Fix:** Add "Mark as Paid" action on receivables page

### Medium Priority (Workflow Incomplete)

5. **Missing Load-to-Trip Assignment Flow**
   - **Impact:** Carriers cannot easily assign marketplace loads to trips
   - **Fix:** Add assignment UI after load acceptance

6. **Missing Load Release Flow**
   - **Impact:** Carriers cannot release loads back to marketplace
   - **Fix:** Add "Release Load" action for carriers

7. **Missing Accessorial Tracking UI**
   - **Impact:** Cannot record additional charges
   - **Fix:** Create UI to add accessorials to loads

### Low Priority (Nice to Have)

8. **Missing DOT Validation on Company Creation**
   - **Impact:** Could prevent duplicate DOTs earlier
   - **Fix:** Use `check_dot_availability` RPC during onboarding

9. **Missing Load Status Update Function Usage**
   - **Impact:** No audit trail for status changes
   - **Fix:** Use `update_load_operational_status` RPC

---

## 📋 FLOW COMPLETENESS MATRIX

| Flow | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Status |
|------|--------|--------|--------|--------|--------|--------|
| **Onboarding** | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| **Login** | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| **Post Load** | ✅ | ✅ | ✅ | ✅ | ⚠️ | 80% |
| **Request Load** | ✅ | ✅ | ✅ | ✅ | ⚠️ | 80% |
| **Accept Request** | ✅ | ✅ | ✅ | ✅ | ❌ | 75% |
| **FMCSA Verify** | ✅ | ✅ | ✅ | ✅ | ⚠️ | 90% |
| **View Receivables** | ✅ | ❌ | ❌ | ❌ | ❌ | 20% |
| **Create Settlement** | ❌ | ❌ | ❌ | ❌ | ❌ | 0% |
| **Record Payment** | ❌ | ❌ | ❌ | ❌ | ❌ | 0% |

---

## 🎯 RECOMMENDATIONS

### Immediate Actions (This Week)

1. **Fix `payments` Table Issue**
   - Remove queries or create table
   - Test company ledger page

2. **Add Receivable Payment Tracking**
   - Add "Mark as Paid" button
   - Add payment date field
   - Update status

3. **Add Settlement Creation Flow**
   - Add button on trip detail page
   - Create settlement form
   - Auto-create receivables/payables

### Short Term (This Month)

4. **Complete Load Assignment Flow**
   - Add "Assign to Trip" action
   - Show available trips
   - Create trip if needed

5. **Add Payment Recording UI**
   - Create form for `load_payments`
   - Support COD, customer balance, accessorials
   - Link to loads

6. **Add Load Release Flow**
   - Add "Release Load" button
   - Capture reason
   - Update marketplace visibility

### Long Term (Next Quarter)

7. **Enhance Financial Reporting**
   - Add payment vs receivable reconciliation
   - Add profit/loss reports
   - Add aging reports

8. **Improve Workflow Automation**
   - Auto-create receivables on settlement
   - Auto-update load status
   - Auto-send notifications

---

**End of Audit**








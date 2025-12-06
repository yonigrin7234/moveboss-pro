# Mobile App Comprehensive Audit

**Date:** January 2025  
**Purpose:** Deep understanding of mobile app architecture, flows, and issues before making fixes

---

## 📱 APP ARCHITECTURE OVERVIEW

### Tech Stack
- **Framework:** Expo (React Native) with Expo Router
- **Language:** TypeScript
- **State Management:** React hooks + Context API
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Navigation:** Expo Router (file-based routing)

### Project Structure
```
apps/mobile/
├── app/                    # Routes (Expo Router)
│   ├── (auth)/            # Auth screens
│   └── (app)/             # Main app screens
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks (data fetching)
├── lib/                   # Utilities (supabase client, helpers)
├── providers/            # Context providers
├── services/             # Services (location tracking)
└── types/                # TypeScript definitions
```

---

## 🔄 COMPLETE USER FLOW

### 1. Authentication Flow
```
Login Screen → AuthProvider → Supabase Auth
  ↓
Session stored in AsyncStorage
  ↓
RootLayoutNav checks session → Routes to (app) or (auth)
```

**Key Files:**
- `app/(auth)/login.tsx` - Login form
- `providers/AuthProvider.tsx` - Auth context, session management
- `app/_layout.tsx` - Root layout with auth routing logic

**Integration Points:**
- Uses `supabase.auth.signInWithPassword()`
- Session persisted in AsyncStorage
- Auto-refresh tokens enabled

---

### 2. Dashboard Flow (Home Screen)
```
Home Screen → useDriverDashboard()
  ↓
Fetches driver profile → Gets trips with loads
  ↓
getNextAction() analyzes all trips/loads
  ↓
Returns single highest-priority action
  ↓
NextActionCard displays action
```

**Key Files:**
- `app/(app)/index.tsx` - Home/dashboard screen
- `hooks/useDriverDashboard.ts` - Fetches dashboard data
- `lib/getNextAction.ts` - Smart action engine (priority system)

**Data Flow:**
1. `useDriverDashboard()` calls Supabase:
   - Gets driver by `auth_user_id`
   - Fetches trips with nested `trip_loads` and `loads`
   - Filters to active/planned trips
2. `getNextAction()` analyzes:
   - Trip status (planned → start trip)
   - Load statuses (pending → accepted → loading → loaded → in_transit → delivered)
   - Payment requirements
   - Delivery order constraints
3. Returns prioritized action with navigation route

**Action Priority (from getNextAction.ts):**
1. `collect_payment` - Money waiting (Priority 1)
2. `complete_delivery` - Active delivery (Priority 2)
3. `start_delivery` - Ready for delivery (Priority 3)
4. `finish_loading` - Active loading (Priority 4)
5. `start_loading` - Ready to load (Priority 5)
6. `accept_load` - Pending load (Priority 6)
7. `start_trip` - Trip needs start (Priority 7)
8. `complete_trip` - All loads done (Priority 8)

---

### 3. Trip Management Flow

#### Start Trip Flow
```
Trip Detail → Start Trip Button
  ↓
TripStartScreen component
  ↓
User enters odometer + takes photo
  ↓
useTripActions.startTrip()
  ↓
Updates trip status to 'active'
  ↓
notifyOwnerTripStarted() (fire-and-forget)
```

**Key Files:**
- `app/(app)/trips/[id]/start.tsx` - Trip start screen
- `hooks/useTripActions.ts` - Trip actions (start/complete)
- `components/ui/TripStartScreen.tsx` - UI component

**Data Updates:**
- `trips.status` → 'active'
- `trips.start_date` → current timestamp
- `trips.odometer_start` → user input
- `trips.odometer_start_photo_url` → uploaded photo URL

#### Complete Trip Flow
```
Trip Detail → Complete Trip Button (when all loads delivered)
  ↓
useTripActions.completeTrip()
  ↓
Updates trip status to 'completed'
  ↓
notifyOwnerTripCompleted() (fire-and-forget)
```

---

### 4. Load Workflow Flow

#### Load Status State Machine
```
pending → accepted → loading → loaded → in_transit → delivered
```

**Key Files:**
- `hooks/useLoadActions.ts` - All load status transitions
- `app/(app)/trips/[id]/loads/[loadId].tsx` - Load detail screen

#### Accept Load Flow
```
Load Detail → Accept Load Button
  ↓
useLoadActions.acceptLoad()
  ↓
Updates load_status to 'accepted'
  ↓
Sets accepted_at timestamp
  ↓
notifyOwnerLoadAccepted()
```

#### Loading Flow
```
Load Detail → Start Loading
  ↓
useLoadActions.startLoading(cuft?, photoUrl?)
  ↓
load_status → 'loading'
  ↓
Sets loading_started_at, starting_cuft, loading_start_photo
  ↓
notifyOwnerLoadingStarted()

  ↓

Finish Loading
  ↓
useLoadActions.finishLoading(cuft?, photoUrl?)
  ↓
load_status → 'loaded'
  ↓
Sets loading_finished_at, ending_cuft, actual_cuft_loaded
  ↓
notifyOwnerLoadingFinished()

  ↓

Post-Loading Branch (depends on load type):
  - Pickup loads → pickup-completion screen
  - Partner/Marketplace → contract-details screen
  - Own customer → ready for delivery
```

#### Delivery Flow
```
Load Detail → Start Delivery (or Collect Payment & Start)
  ↓
checkDeliveryOrder() - Validates delivery order
  ↓
If balance due:
  → collect-payment screen
  → useLoadActions.collectPaymentAndStartDelivery()
Else:
  → useLoadActions.startDelivery()
  ↓
load_status → 'in_transit'
  ↓
Sets delivery_started_at
  ↓
notifyOwnerDeliveryStarted()

  ↓

Complete Delivery
  ↓
useLoadActions.completeDelivery()
  ↓
load_status → 'delivered'
  ↓
Sets delivery_finished_at
  ↓
incrementDeliveryIndex() - Updates trip.current_delivery_index
  ↓
notifyOwnerDeliveryCompleted()
```

**Delivery Order Logic:**
- Each load can have `delivery_order` (1, 2, 3, etc.)
- Trip has `current_delivery_index` tracking which delivery is next
- `checkDeliveryOrder()` prevents out-of-order deliveries
- Only allows delivery if all lower-order loads are delivered

---

### 5. Special Load Types

#### Pickup Loads (`posting_type = 'pickup'`)
```
After finishLoading() → Auto-navigate to pickup-completion screen
  ↓
User enters:
  - Contract details (rate, linehaul, accessorials)
  - Payment at pickup
  - Delivery schedule (RFD date)
  - Paperwork photos
  ↓
useLoadActions.completePickup()
  ↓
Sets pickup_completed_at, contract fields, payment fields
  ↓
Calculates remaining_balance_for_delivery
  ↓
notifyOwnerPickupCompleted()
```

**Key Files:**
- `app/(app)/trips/[id]/loads/[loadId]/pickup-completion.tsx`

#### Partner/Marketplace Loads (`load_source = 'partner' | 'marketplace'`)
```
After finishLoading() → Auto-navigate to contract-details screen
  ↓
User enters:
  - Loading report (OCR or manual)
  - Bill of Lading (OCR or manual)
  - Customer info
  - Accessorials
  ↓
useLoadActions.saveContractDetails()
  ↓
Sets contract_details_entered_at, contract fields
  ↓
Sets balance_due_on_delivery for delivery workflow
```

**Key Files:**
- `app/(app)/trips/[id]/loads/[loadId]/contract-details.tsx`
- Uses OCR API endpoints (may not exist):
  - `/api/ocr/loading-report`
  - `/api/ocr/bill-of-lading`

---

### 6. Payment Collection Flow

```
Load Detail → Collect Payment (if balance_due_on_delivery > 0)
  ↓
collect-payment screen
  ↓
User selects payment method, enters amount, takes photos
  ↓
useLoadActions.collectPaymentAndStartDelivery()
  ↓
Updates load:
  - payment_method
  - amount_collected_on_delivery
  - payment_photo_front_url / payment_photo_back_url
  - payment_zelle_recipient (if Zelle)
  ↓
Also starts delivery (load_status → 'in_transit')
```

**Key Files:**
- `app/(app)/trips/[id]/loads/[loadId]/collect-payment.tsx`

---

### 7. Expense Tracking Flow

```
Trips → Expenses Tab
  ↓
Expenses screen
  ↓
User adds expense (category, amount, receipt photo)
  ↓
useExpenseActions.createExpense()
  ↓
Inserts into trip_expenses table
  ↓
notifyOwnerExpenseAdded() (fire-and-forget)
```

**Key Files:**
- `app/(app)/trips/[id]/expenses.tsx`
- `hooks/useExpenseActions.ts`

---

### 8. Earnings Flow

```
Earnings Screen
  ↓
useDriverEarnings()
  ↓
Fetches trip_settlements filtered by driver
  ↓
Displays:
  - Earnings summary (total, pending, paid)
  - Settlement cards with pay breakdown
  - Filter by status (All, Pending, Paid)
```

**Key Files:**
- `app/(app)/earnings.tsx`
- `hooks/useDriverEarnings.ts`

---

### 9. Documents Flow

```
Documents Screen
  ↓
useVehicleDocuments()
  ↓
Fetches:
  - Driver profile
  - Company info
  - Truck documents (from trucks table)
  - Trailer documents (from trailers table)
  ↓
Shows document status (valid, expiring, expired, missing)
```

**Key Files:**
- `app/(app)/documents.tsx`
- `hooks/useVehicleDocuments.ts`

---

## 🔌 SUPABASE INTEGRATION PATTERNS

### Authentication
- Uses `@supabase/supabase-js` client
- Session stored in AsyncStorage
- Auto-refresh tokens enabled
- All queries filtered by `owner_id` (multi-tenant)

### Data Fetching Pattern
1. Get driver record first:
   ```typescript
   const { data: driver } = await supabase
     .from('drivers')
     .select('id, owner_id')
     .eq('auth_user_id', user.id)
     .single();
   ```
2. Query with owner_id filter:
   ```typescript
   .eq('owner_id', driver.owner_id)
   ```

### Common Query Pattern
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, nested:relation_id (*)')
  .eq('owner_id', ownerId)
  .single(); // or .order() etc.
```

### Notification Pattern
- All actions call `notifyOwner*()` functions
- These are fire-and-forget (don't block UI)
- Send to web app API: `/api/notifications/driver-action`
- Uses Supabase session token for auth

---

## 🐛 IDENTIFIED ISSUES

### Issue 1: TypeScript Compilation Errors (CRITICAL)

**Problem:**
- `withTimeout()` function expects `Promise<T>`
- Supabase query builders return `PostgrestBuilder` (Promise-like but not Promise type)
- TypeScript doesn't recognize them as Promises

**Affected Files:**
1. `app/(app)/trips/[id]/start.tsx` - Lines 58-66, 77-92, 184-192, 203-220
2. `providers/TripDetailProvider.tsx` - Lines 73-81, 91-133

**Root Cause:**
```typescript
// Current (broken):
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T>

// Supabase query builders are Promise-like but TypeScript sees them as PostgrestBuilder
const query = supabase.from('drivers').select('id').single(); // Type: PostgrestBuilder
await withTimeout(query, 10000, 'timeout'); // ❌ Type error
```

**Fix:**
Change `withTimeout` to accept `PromiseLike<T>` instead of `Promise<T>`:
```typescript
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T>
```

This allows both Promises and thenable objects (like Supabase query builders).

---

### Issue 2: Missing Environment Variables (HIGH)

**Problem:**
- `lib/supabase.ts` requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- No `.env` file exists
- No error handling if env vars are missing
- App will crash on startup with undefined values

**Current Code:**
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

**Fix:**
1. Create `.env.example` template
2. Add validation with clear error message
3. Fail fast if missing

---

### Issue 3: Potential Runtime Issues (MEDIUM)

**Areas of Concern:**
- No error boundaries wrapping screens
- Some hooks may fail silently
- Missing null checks in some components
- Notification API may not exist (returns 404)

---

## ✅ WHAT'S WORKING WELL

1. **Architecture:** Clean separation of concerns
2. **Data Flow:** Consistent pattern across hooks
3. **Type Safety:** Good TypeScript coverage
4. **State Management:** Proper use of React hooks and Context
5. **Navigation:** Expo Router working correctly
6. **UI Components:** Reusable component library
7. **Business Logic:** Smart action engine works correctly
8. **Multi-tenancy:** Proper owner_id filtering

---

## 📋 FIXES REQUIRED

### Priority 1: Fix TypeScript Errors
- Update `withTimeout` signature in 3 files:
  - `app/(app)/trips/[id]/start.tsx`
  - `providers/TripDetailProvider.tsx`
  - `hooks/useDriverTrips.ts` (if it has the same pattern)

### Priority 2: Environment Setup
- Create `.env.example`
- Add env var validation in `lib/supabase.ts`

### Priority 3: Testing
- Verify app compiles
- Test authentication flow
- Test trip/load workflows

---

## 🎯 UNDERSTANDING CONFIRMED

✅ **Authentication Flow** - Understood  
✅ **Dashboard Flow** - Understood  
✅ **Trip Management** - Understood  
✅ **Load Workflow** - Understood  
✅ **Payment Collection** - Understood  
✅ **Expense Tracking** - Understood  
✅ **Earnings View** - Understood  
✅ **Documents View** - Understood  
✅ **Supabase Integration** - Understood  
✅ **Notification System** - Understood  
✅ **Delivery Order Logic** - Understood  
✅ **Special Load Types** - Understood  

---

**Ready to proceed with fixes.**


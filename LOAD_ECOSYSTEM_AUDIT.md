# MoveBoss Pro - Complete Load Ecosystem Audit

**Generated:** 2025-01-XX  
**Scope:** Complete load lifecycle from creation to delivery across Web and Mobile platforms  
**Purpose:** Document current state, identify gaps, contradictions, and critical issues

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Broker Flow (Web)](#2-broker-flow-web)
3. [Moving Company Flow (Web)](#3-moving-company-flow-web)
4. [Carrier Flow (Web)](#4-carrier-flow-web)
5. [Assigned Loads Module (Web)](#5-assigned-loads-module-web)
6. [Trip Management (Web + Mobile)](#6-trip-management-web--mobile)
7. [Driver Assignment Flow (Web + Mobile)](#7-driver-assignment-flow-web--mobile)
8. [Load Status Pipeline (Web + Mobile)](#8-load-status-pipeline-web--mobile)
9. [Mobile Driver App](#9-mobile-driver-app)
10. [Finance Logic (Web)](#10-finance-logic-web)
11. [Dashboard Behavior (Web)](#11-dashboard-behavior-web)
12. [Database Structure + RLS](#12-database-structure--rls)
13. [Problems, Contradictions, and Gaps](#13-problems-contradictions-and-gaps)

---

## 1. System Overview

### Load Lifecycle (Web + Mobile)

```
CREATION (Web)
    │
    ├── Own Customer Load: LoadCreateForm.tsx → createLoad() 
    │   └── load_flow_type = 'hhg_originated'
    │
    ├── Partner Load: LoadCreateForm.tsx → createLoad()
    │   └── load_flow_type = 'carrier_intake'
    │
    └── Marketplace Purchase: acceptLoadRequest()
        └── load_flow_type = 'marketplace_purchase'
    │
    ▼
POSTING TO MARKETPLACE (Web - Brokers Only)
    │
    └── postToMarketplaceAction() in /dashboard/loads/[id]/page.tsx
        ├── Sets: posting_status = 'posted'
        ├── Sets: is_marketplace_visible = true
        └── Sets: posted_to_marketplace_at = NOW()
    │
    ▼
CARRIER REQUEST (Web)
    │
    └── createLoadRequest() in marketplace.ts
        ├── Creates load_request record
        ├── request_type: 'accept_listed' | 'counter_offer'
        └── status = 'pending'
    │
    ▼
ACCEPTANCE (Web)
    │
    └── acceptLoadRequest() in marketplace.ts
        ├── Updates load_request.status = 'accepted'
        ├── Sets load.assigned_carrier_id
        ├── Sets load.is_marketplace_visible = false
        ├── Sets load.load_flow_type = 'marketplace_purchase'
        └── Declines all other pending requests
    │
    ▼
CONFIRMATION (Web)
    │
    └── confirmLoadAssignment() in marketplace.ts
        ├── Sets load.carrier_confirmed_at = NOW()
        ├── Sets load.expected_load_date
        ├── Sets load.load_status = 'accepted'
        └── Optional: assigned_driver_id/name/phone
    │
    ▼
DRIVER ASSIGNMENT (Web)
    │
    ├── At confirmation: optional driver selection
    └── Later: updateLoadDriver() in marketplace.ts
        └── Sets: assigned_driver_id, assigned_driver_name, assigned_driver_phone
    │
    ▼
TRIP ASSIGNMENT (Web)
    │
    └── assignLoadToTrip() / addLoadToTrip() in marketplace.ts / trips.ts
        ├── Creates trip_loads record
        ├── Sets load.trip_id
        ├── Sets load.delivery_order
        └── Syncs trip driver to load
    │
    ▼
MOBILE DRIVER WORKFLOW
    │
    ├── Accept: driverAcceptLoad() → load_status = 'accepted'
    ├── Start Loading: driverStartLoading() → load_status = 'loading'
    ├── Finish Loading: driverFinishLoading() → load_status = 'loaded'
    │   └── If pickup type → pickup-completion screen
    │   └── If partner/marketplace → contract-details screen
    ├── Collect Payment: collectPaymentAndStartDelivery() → load_status = 'in_transit'
    └── Complete Delivery: driverCompleteDelivery() → load_status = 'delivered'
    │
    ▼
DELIVERY (Mobile)
    │
    └── driverCompleteDelivery() in driver-workflow.ts
        ├── Sets load_status = 'delivered'
        ├── Sets delivery_finished_at = NOW()
        └── Increments trip.current_delivery_index
```

### All Load Status Values

#### Primary Status Field: `load_status`

| Status | Trigger | Set By |
|--------|---------|--------|
| `pending` | Initial creation / give back | Web |
| `accepted` | confirmLoadAssignment() / driverAcceptLoad() | Web/Mobile |
| `loading` | driverStartLoading() | Mobile |
| `loaded` | driverFinishLoading() | Mobile |
| `in_transit` | startDelivery() / collectPaymentAndStartDelivery() | Mobile |
| `delivered` | driverCompleteDelivery() | Mobile |
| `storage_completed` | driverSetStorageDrop() | Mobile |

#### Secondary Status Field: `posting_status`

| Status | Meaning |
|--------|---------|
| `draft` | Not published |
| `posted` | Live on marketplace |
| `assigned` | Given to carrier |
| `in_progress` | Load in progress |
| `completed` | Load completed |
| `cancelled` | Load cancelled |

#### Tertiary Status Field: `operational_status` (Marketplace loads only)

| Status | Meaning |
|--------|---------|
| `unassigned` | No driver assigned |
| `assigned_to_driver` | Driver assigned via trip |
| `en_route_to_pickup` | Heading to pickup |
| `at_pickup` | At pickup location |
| `loading` | Loading in progress |
| `loaded` | Loaded on truck |
| `in_transit` | En route to delivery |
| `at_delivery` | At delivery location |
| `delivered` | Delivered |
| `completed` | Fully complete |

---

## 2. Broker Flow (Web)

### Posting Logic

**Files:**
- `/dashboard/loads/[id]/page.tsx` - `postToMarketplaceAction()`
- `/dashboard/post-load/page.tsx` - Direct posting
- `/dashboard/post-pickup/page.tsx` - Pickup posting

**Key Function:** `postToMarketplaceAction()`

```sql
-- DB Updates:
UPDATE loads SET
  posting_status = 'posted',
  posted_at = NOW(),
  posting_type = 'load' | 'pickup',
  posted_by_company_id = workspace_company.id,
  is_marketplace_visible = true,
  posted_to_marketplace_at = NOW(),
  load_status = 'pending',
  cubic_feet_estimate = ?,
  rate_per_cuft = ?,
  linehaul_amount = ?
WHERE id = ?
```

**Broker-Only Check:**
```typescript
// In page.tsx line 173
if (!workspaceCompanyData?.is_broker) {
  return { success: false, error: 'Only brokers and moving companies can post to marketplace' };
}
```

### Load Board Visibility

**File:** `/data/marketplace.ts` - `getMarketplaceLoads()`

**Query Conditions:**
```sql
SELECT * FROM loads
WHERE is_marketplace_visible = true
  AND posting_status = 'posted'
  AND assigned_carrier_id IS NULL
  AND posted_by_company_id != current_user_company_id
```

### Handling Carrier Requests

**Files:**
- `/dashboard/carrier-requests/page.tsx`
- `/data/marketplace.ts`

**View Requests:** `getLoadRequests(loadId)`
```sql
SELECT * FROM load_requests
WHERE load_id = ?
ORDER BY is_partner DESC, created_at ASC
```

**Accept/Reject Flow:**

**Accept:** `acceptLoadRequest()` in marketplace.ts
```sql
-- DB Updates:
UPDATE load_requests SET status = 'accepted', responded_at = NOW() WHERE id = ?

UPDATE loads SET
  assigned_carrier_id = carrier_id,
  carrier_assigned_at = NOW(),
  carrier_rate = final_rate,
  is_marketplace_visible = false,
  load_flow_type = 'marketplace_purchase'
WHERE id = ?

-- Decline all other pending requests
UPDATE load_requests SET status = 'declined' WHERE load_id = ? AND id != ? AND status = 'pending'
```

**Decline:** `declineLoadRequest()` in marketplace.ts
```sql
UPDATE load_requests SET status = 'declined', responded_at = NOW() WHERE id = ?
```

---

## 3. Moving Company Flow (Web)

### Posting Loads (Same as Broker)

Moving companies with `is_broker = true` use the same posting flow as brokers.

**Key Distinction:**
- `is_broker = true` AND `is_carrier = true` = Moving Company (Hybrid)
- Can post AND haul loads

### My Posted Jobs

**File:** `/dashboard/posted-jobs/page.tsx`

**Query:**
```sql
SELECT * FROM loads
WHERE posted_by_company_id = workspace_company.id
ORDER BY created_at DESC
```

**Tabs:** Active, Completed, Cancelled, Drafts

### Loads Given Out

**File:** `/data/marketplace.ts` - `getLoadsGivenOut()`

**Query:**
```sql
SELECT * FROM loads
WHERE posted_by_company_id = workspace_company.id
  AND assigned_carrier_id IS NOT NULL
```

### Find Trucks

**File:** `/api/marketplace/capacity/route.ts`

**Query:**
```sql
SELECT trips.*, drivers.*, trucks.*
FROM trips
JOIN drivers ON trips.driver_id = drivers.id
JOIN trucks ON trips.truck_id = trucks.id
WHERE trips.status IN ('active', 'en_route', 'planned')
  AND (trips.trip_capacity_visibility = 'public' OR drivers.capacity_visibility = 'public')
```

### Web-Mobile Dependencies

- **Driver Assignment:** Web sets `assigned_driver_id` → Mobile uses to verify access
- **Trip Assignment:** Web creates `trip_loads` record → Mobile displays loads under trip
- **Load Status:** Web sets initial status → Mobile updates through workflow
- **Contract Details:** Mobile enters `contract_details_entered_at` → Web displays in UI

---

## 4. Carrier Flow (Web)

### Request a Load

**File:** `/data/marketplace.ts` - `createLoadRequest()`

**Process:**
1. Carrier views load board → selects load
2. Submits request (accept listed rate OR counter offer)
3. Creates `load_requests` record

**DB Insert:**
```sql
INSERT INTO load_requests (
  load_id, carrier_id, carrier_owner_id,
  request_type, -- 'accept_listed' | 'counter_offer'
  counter_offer_rate,
  proposed_load_date_start, proposed_load_date_end,
  proposed_delivery_date_start, proposed_delivery_date_end,
  status, -- 'pending'
  message,
  accepted_company_rate
) VALUES (...)
```

### Gets Accepted

**File:** `/data/marketplace.ts` - `acceptLoadRequest()`

**DB Updates:**
```sql
UPDATE loads SET
  assigned_carrier_id = ?,
  carrier_assigned_at = NOW(),
  carrier_rate = ?,
  carrier_rate_type = ?,
  is_marketplace_visible = false,
  load_flow_type = 'marketplace_purchase'
WHERE id = ?
```

### My Requests Page

**File:** `/dashboard/my-requests/page.tsx`

**Function:** `getCarrierRequests()` in marketplace.ts

**Query:**
```sql
SELECT lr.*, l.*, c.*
FROM load_requests lr
JOIN loads l ON lr.load_id = l.id
JOIN companies c ON l.posted_by_company_id = c.id
WHERE lr.carrier_owner_id = auth.uid()
ORDER BY lr.created_at DESC
```

**Tabs:** Pending, Accepted, Declined, All

### Confirms Load Details

**File:** `/dashboard/assigned-loads/[id]/confirm/page.tsx`

**Function:** `confirmLoadAssignment()` in marketplace.ts

**Required:** `expected_load_date`  
**Optional:** `assigned_driver_id`, `assigned_driver_name`, `assigned_driver_phone`

**DB Updates:**
```sql
UPDATE loads SET
  carrier_confirmed_at = NOW(),
  expected_load_date = ?,
  assigned_driver_id = ?,
  assigned_driver_name = ?,
  assigned_driver_phone = ?,
  load_status = 'accepted'
WHERE id = ?
```

### Assigns a Driver

**Options:**
1. At confirmation: Select from drivers or enter manually
2. Later: `updateLoadDriver()` in marketplace.ts

**DB Updates:**
```sql
UPDATE loads SET
  assigned_driver_id = ?,
  assigned_driver_name = ?,
  assigned_driver_phone = ?
WHERE id = ?
```

### Moves to Assigned Loads

**File:** `/dashboard/assigned-loads/page.tsx`

Load appears in "Active Loads" section when `carrier_confirmed_at IS NOT NULL`

---

## 5. Assigned Loads Module (Web)

### File Location

`/dashboard/assigned-loads/`

### Status Categories

**Needs Confirmation:**
```sql
SELECT * FROM loads
WHERE assigned_carrier_id = carrier.id
  AND carrier_confirmed_at IS NULL
  AND load_status != 'cancelled'
```

**Active Loads:**
```sql
SELECT * FROM loads
WHERE assigned_carrier_id = carrier.id
  AND carrier_confirmed_at IS NOT NULL
  AND load_status NOT IN ('delivered', 'cancelled')
```

**Completed Loads:**
```sql
SELECT * FROM loads
WHERE assigned_carrier_id = carrier.id
  AND load_status = 'delivered'
LIMIT 5
```

### Load Details Screen

**File:** `/dashboard/assigned-loads/[id]/page.tsx`

**Sections:**
- Release Load option (if `posting_status = 'assigned'` AND `load_status = 'accepted'`)
- Quick stats (CUFT, rate, expected date)
- Pickup location (after confirmation)
- Delivery location
- Driver assignment form
- Trip assignment form
- Status timeline
- Photo uploads
- Company rating (after delivery)

### Trip Assignment UI

**Component:** `TripAssignmentForm` in `trip-assignment-form.tsx`

**Available Trips Query:**
```sql
SELECT * FROM trips
WHERE owner_id = auth.uid()
  AND status IN ('planned', 'active', 'en_route')
ORDER BY created_at DESC
LIMIT 50
```

### Release Load Logic

**File:** `/data/cancellations.ts` - `giveLoadBack()`

**Conditions:** `load_status IN ('accepted', 'loading')` AND `posting_status = 'assigned'`

**DB Updates:**
```sql
-- Record cancellation
INSERT INTO load_cancellations (
  load_id, canceled_by_type, canceled_by_company_id,
  reason_code, fault_party, load_stage
) VALUES (...)

-- Reset load
UPDATE loads SET
  assigned_carrier_id = NULL,
  carrier_assigned_at = NULL,
  carrier_confirmed_at = NULL,
  carrier_rate = NULL,
  expected_load_date = NULL,
  assigned_driver_id = NULL,
  load_status = 'pending',
  posting_status = 'posted',
  is_marketplace_visible = TRUE
WHERE id = ?

-- Update request
UPDATE load_requests SET status = 'withdrawn' WHERE load_id = ? AND carrier_id = ?
```

---

## 6. Trip Management (Web + Mobile)

### Trip Creation (Web)

**File:** `/data/trips.ts` - `createTrip()`

**Required Fields:**
- `owner_id` (auto from auth)
- `trip_number` (auto-generated)

**Optional Fields:**
- `driver_id`, `truck_id`, `trailer_id`
- `origin_city/state/postal_code`
- `destination_city/state/postal_code`
- `start_date`, `end_date`
- `reference_number`

### Adding Loads to Trips (Web)

**Function:** `addLoadToTrip()` in trips.ts

**DB Updates:**
```sql
INSERT INTO trip_loads (owner_id, trip_id, load_id, sequence_index, role)
VALUES (?, ?, ?, ?, 'primary')

UPDATE loads SET
  trip_id = ?,
  delivery_order = sequence_index + 1,
  assigned_driver_id = trip.driver_id
WHERE id = ?
```

### Missing Fields on Trips

**Identified Gaps:**
- `total_cuft` - Often NULL, should be sum of load cubic feet
- `revenue_total` - Often NULL, calculated at settlement time
- `profit_total` - Often NULL, calculated at settlement time
- `odometer_start` / `odometer_end` - Required for settlement but often missing

### Mobile Driver Trip View

**Files:**
- `/mobile/app/(app)/trips/index.tsx` - Trip list
- `/mobile/app/(app)/trips/[id].tsx` - Trip detail

**Hooks:**
- `useDriverTrips()` - Fetches driver's trips
- `useDriverTripDetail(tripId)` - Fetches trip with loads

**Query:**
```sql
SELECT *,
  trucks:truck_id (*),
  trailers:trailer_id (*),
  trip_loads (*, loads (*))
FROM trips
WHERE driver_id = current_driver.id
ORDER BY start_date DESC
```

### Trip Assignment Reflection on Mobile

Loads appear under trip when:
1. `trip_loads` record exists linking load to trip
2. `loads.trip_id` is set
3. Trip's `driver_id` matches mobile driver's `drivers.id`

### DB Inconsistencies

- **Load without `trip_id` but has `trip_loads` record** - Can happen if `trip_loads` created but `load.trip_id` not updated
- **Trip with no loads** - Empty trips allowed but carrier may expect loads
- **Driver assigned to load but not to trip** - Load can have `assigned_driver_id` without being on a trip

---

## 7. Driver Assignment Flow (Web + Mobile)

### Assign Driver Later (Web)

Load created without driver → `assigned_driver_id = NULL`

**Later assignment via:**
1. Confirmation page: `confirmLoadAssignment()` with driver data
2. Detail page: `updateLoadDriver()` with driver data

### Select from Existing Drivers

**Query:**
```sql
SELECT id, first_name, last_name, phone
FROM drivers
WHERE owner_id = auth.uid() AND status = 'active'
```

### Manual Driver Entry

**Fields captured:**
- `assigned_driver_name` (text)
- `assigned_driver_phone` (text)

**No `assigned_driver_id` set when manually entered.**

### Mobile Uses Driver ID

**Mobile Access Check:**
```sql
-- Driver can see load if:
EXISTS (
  SELECT 1 FROM trip_loads tl
  JOIN trips t ON t.id = tl.trip_id
  WHERE tl.load_id = loads.id
  AND t.driver_id = current_driver.id
)
```

**Critical:** If load has `assigned_driver_id` but NO trip assignment, mobile driver CANNOT see it.

### Load Assigned to Driver Without Trip

**This is possible and problematic:**
- **Web allows:** `assigned_driver_id` set via `updateLoadDriver()`
- **Mobile requires:** Trip assignment for visibility
- **Result:** Load is "assigned" to driver but driver cannot access it on mobile.

### Downstream Effects

**On Mobile UI:**
- Driver sees only loads linked via `trip_loads`
- Push notifications sent to driver when assigned to trip
- Driver cannot update loads they can't see

**On Web Dashboard:**
- "Drivers on Road" metric counts drivers with active trips
- Load shows driver name but driver may not have access

---

## 8. Load Status Pipeline (Web + Mobile)

### Complete Status Transition Map

```
PENDING
  │
  ├── [Web: confirmLoadAssignment()]
  ▼
ACCEPTED
  │
  ├── [Mobile: startLoading()]
  ▼
LOADING
  │
  ├── [Mobile: finishLoading()]
  ▼
LOADED
  │
  ├── [Mobile: startDelivery() or collectPaymentAndStartDelivery()]
  ▼
IN_TRANSIT
  │
  ├── [Mobile: completeDelivery()]
  ▼
DELIVERED (terminal)

STORAGE_COMPLETED (alternative terminal - from LOADED via setStorageDrop())
```

### Where Status Changes (Web)

| Status Change | Location | Function |
|---------------|----------|----------|
| → `pending` | `/data/loads.ts` | `createLoad()` |
| → `accepted` | `/data/marketplace.ts` | `confirmLoadAssignment()` |
| → `delivered` | `/data/load-status.ts` | `updateLoadStatus()` (admin) |

### Where Status Changes (Mobile)

| Status Change | Location | Function |
|---------------|----------|----------|
| `pending` → `accepted` | `hooks/useLoadActions.ts` | `acceptLoad()` |
| `accepted` → `loading` | `hooks/useLoadActions.ts` | `startLoading()` |
| `loading` → `loaded` | `hooks/useLoadActions.ts` | `finishLoading()` |
| `loaded` → `in_transit` | `hooks/useLoadActions.ts` | `collectPaymentAndStartDelivery()` |
| `in_transit` → `delivered` | `hooks/useLoadActions.ts` | `completeDelivery()` |
| `loaded` → `storage_completed` | `hooks/useLoadActions.ts` | `setStorageDrop()` |

### DB Fields Updated Per Status

**`pending` → `accepted`:**
- `load_status = 'accepted'`
- `accepted_at = NOW()`
- `carrier_confirmed_at = NOW()`

**`accepted` → `loading`:**
- `load_status = 'loading'`
- `loading_started_at = NOW()`
- `starting_cuft = ?`
- `loading_start_photo = ?`

**`loading` → `loaded`:**
- `load_status = 'loaded'`
- `loading_finished_at = NOW()`
- `ending_cuft = ?`
- `actual_cuft_loaded = ending_cuft - starting_cuft`
- `loading_end_photo = ?`

**`loaded` → `in_transit`:**
- `load_status = 'in_transit'`
- `delivery_started_at = NOW()`
- `payment_method = ?`
- `amount_collected_on_delivery = ?`

**`in_transit` → `delivered`:**
- `load_status = 'delivered'`
- `delivery_finished_at = NOW()`

### UI Components Reflecting Status

**Web:**
- `LoadForm.tsx` - Status display
- `assigned-loads/[id]/page.tsx` - Timeline

**Mobile:**
- `trips/[id]/loads/[loadId].tsx` - `WorkflowActionCard`
- `TripDetailScreen.tsx` - `LoadCard`

### Unreachable/Missing Transitions

- **No way to revert status** - Once loaded, cannot go back to loading
- **No cancelled transition** - Load cancellation uses `posting_status = 'cancelled'`
- **No direct `pending` → `loading`** - Must go through `accepted`

---

## 9. Mobile Driver App

### How Assigned Loads Appear

**File:** `/mobile/app/(app)/trips/[id].tsx`

**Query Chain:**
1. Driver authenticates → `auth_user_id` verified
2. Fetch trips WHERE `driver_id` matches `driver.id`
3. For each trip, fetch `trip_loads` with nested loads
4. Display loads under trip

**Hook:** `useDriverTripDetail(tripId)`

### Starting Loading

**File:** `/mobile/hooks/useLoadActions.ts`

**Function:** `startLoading(startingCuft?, photoUrl?)`

**DB Update:**
```sql
UPDATE loads SET
  load_status = 'loading',
  loading_started_at = NOW(),
  starting_cuft = ?,
  loading_start_photo = ?
WHERE id = ?
```

### Marking Load as Loaded

**Function:** `finishLoading(endingCuft?, photoUrl?)`

**DB Update:**
```sql
UPDATE loads SET
  load_status = 'loaded',
  loading_finished_at = NOW(),
  ending_cuft = ?,
  actual_cuft_loaded = ending_cuft - starting_cuft,
  loading_end_photo = ?
WHERE id = ?
```

**Post-Action Navigation:**
- If `posting_type = 'pickup'` → `/pickup-completion`
- If `load_source IN ('partner', 'marketplace')` → `/contract-details`

### Marking In Transit

**Function:** `collectPaymentAndStartDelivery(data)`

**DB Update:**
```sql
UPDATE loads SET
  load_status = 'in_transit',
  delivery_started_at = NOW(),
  payment_method = ?,
  amount_collected_on_delivery = ?,
  payment_zelle_recipient = ?,
  payment_photo_front_url = ?
WHERE id = ?
```

### Marking Delivered

**Function:** `completeDelivery()`

**DB Update:**
```sql
UPDATE loads SET
  load_status = 'delivered',
  delivery_finished_at = NOW()
WHERE id = ?

-- Also increments trip.current_delivery_index
```

### GPS Tracking Integration

**Files:**
- `/mobile/hooks/useLocationTracking.ts`
- `/mobile/services/locationTracking.ts`

**DB Updates:**
```sql
UPDATE trips SET
  current_location_lat = ?,
  current_location_lng = ?,
  current_location_city = ?,
  current_location_state = ?,
  current_location_updated_at = NOW()
WHERE id = ?
```

**Visibility Control:**
- `drivers.location_sharing_enabled` - Driver-level toggle
- `trips.share_location` - Trip-level override

### Mismatches Between Mobile Assumptions and Web Structure

| Mobile Expects | Web Reality | Impact |
|----------------|-------------|--------|
| Load on trip to be visible | Load can have driver without trip | Driver can't see load |
| `actual_cuft_loaded` set by driver | Field may be NULL | Financial calculations fail |
| `contract_details_entered_at` required for partner loads | Web doesn't enforce | Mobile blocks but web allows |
| Trip has driver | Trip can have no driver | Load appears on trip but can't update |

### All Mobile Files for Loads/Trips

**Screens:**
- `/mobile/app/(app)/trips/index.tsx` - Trip list
- `/mobile/app/(app)/trips/[id].tsx` - Trip detail
- `/mobile/app/(app)/trips/[id]/start.tsx` - Start trip
- `/mobile/app/(app)/trips/[id]/loads/[loadId].tsx` - Load detail
- `/mobile/app/(app)/trips/[id]/loads/[loadId]/pickup-completion.tsx` - Pickup flow
- `/mobile/app/(app)/trips/[id]/loads/[loadId]/contract-details.tsx` - Contract entry
- `/mobile/app/(app)/trips/[id]/loads/[loadId]/collect-payment.tsx` - Payment collection
- `/mobile/app/(app)/trips/[id]/loads/[loadId]/complete-delivery.tsx` - Delivery completion

**Hooks:**
- `useDriverTrips()` - Trip list
- `useDriverTripDetail(tripId)` - Trip with loads
- `useLoadDetail(loadId)` - Single load
- `useLoadActions(loadId)` - Status transitions
- `useTripActions(tripId)` - Trip status
- `useImageUpload()` - Photo uploads
- `useLocationTracking()` - GPS

---

## 10. Finance Logic (Web)

### Value Calculation (CUFT × Rate)

**File:** `/data/load-financials.ts`

**Formula:**
```typescript
base_revenue = actual_cuft_loaded × rate_per_cuft

// Uses contract_rate_per_cuft if available, else rate_per_cuft
const ratePerCuft = load.contract_rate_per_cuft || load.rate_per_cuft;
```

### Total Revenue

```typescript
total_revenue = base_revenue 
  + contract_accessorials_total 
  + extra_accessorials_total 
  + storage_total

// Where:
storage_total = storage_move_in_fee + (storage_daily_fee × storage_days_billed)
```

### "Owed to You" (Receivables)

**File:** `/data/settlements.ts`

**Calculation:**
```typescript
company_owes = total_revenue - amount_collected_on_delivery - amount_paid_directly_to_company
```

**Query:**
```sql
SELECT * FROM receivables
WHERE owner_id = auth.uid() AND status = 'open'
```

### "You Owe" (Payables)

```sql
SELECT * FROM payables
WHERE owner_id = auth.uid() AND status = 'open'
```

### Settlements Pull Load Data

**Function:** `createTripSettlement()` in settlements.ts

**Process:**
1. Fetch trip with all loads via `trip_loads`
2. Sum `load.total_revenue` for each load
3. Calculate driver pay based on `driver.pay_mode`
4. Create `settlement_line_items` for breakdown
5. Create receivables for each company with positive `company_owes`
6. Create payables for driver

### Inconsistencies from Missing Statuses

| Missing Field | Impact |
|---------------|--------|
| `actual_cuft_loaded = NULL` | `base_revenue = 0` |
| `rate_per_cuft = NULL` | `base_revenue = 0` |
| `total_revenue = NULL` | Settlement shows $0 |
| `company_owes = NULL` | No receivable created |
| `load_status != 'delivered'` | Trip can't settle |

---

## 11. Dashboard Behavior (Web)

### Carrier Dashboard Metrics

**Components:**
- `KeyMetrics.tsx`
- `DriversNow.tsx`

| Metric | Query | Breaks If |
|--------|-------|-----------|
| Active Loads | `loads WHERE assigned_carrier_id = company AND load_status NOT IN (delivered, cancelled)` | No loads assigned |
| Drivers on Road | `COUNT(DISTINCT driver_id) FROM trips WHERE status IN (active, en_route)` | No active trips |
| Total Drivers | `COUNT(*) FROM drivers WHERE status = 'active'` | No drivers |
| Pending Requests | `COUNT(*) FROM load_requests WHERE carrier_owner_id = uid AND status = 'pending'` | - |

### Broker Dashboard Metrics

**Components:**
- `LoadsAwaitingDispatch.tsx`
- `WhoOwesYouMoney.tsx`

| Metric | Query | Breaks If |
|--------|-------|-----------|
| Jobs Needing Assignment | `loads WHERE assigned_driver_id IS NULL AND assigned_carrier_id IS NULL` | No unassigned loads |
| Money Owed | `SUM(amount) FROM receivables WHERE status = 'open'` | No receivables |
| Collected Today | `SUM(amount) FROM payments WHERE created_at >= TODAY` | No payments |

### Moving Company Dashboard

Combines both Carrier and Broker metrics based on `is_carrier` and `is_broker` flags.

### Metrics That Break

- **Active Trips** - Requires trips with `status IN (active, en_route)`
- **Drivers on Road** - Requires trips with `driver_id` set
- **Pending Settlements** - Requires trips with `status = completed`
- **Today's Schedule** - Requires `pickup_date` and `delivery_date` set

### Component Data Sources

**File:** `/data/dashboard-data.ts`

| Component | Function | Tables |
|-----------|----------|--------|
| `KeyMetrics` | `getDashboardMetrics()` | `loads`, `trips`, `drivers`, `receivables` |
| `DriversNow` | `getLiveDriverStatuses()` | `drivers`, `trips`, `trucks` |
| `TodaysSchedule` | `getTodaysSchedule()` | `loads` |
| `WhoOwesYouMoney` | `getReceivablesByCompany()` | `receivables`, `companies` |
| `LoadsAwaitingDispatch` | `getUnassignedJobs()` | `loads` |

---

## 12. Database Structure + RLS

### Core Tables

#### `loads`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Primary key |
| `owner_id` | UUID FK → `profiles` | Load creator |
| `company_id` | UUID FK → `companies` | Load owner company |
| `assigned_carrier_id` | UUID FK → `companies` | Carrier assigned to load |
| `assigned_driver_id` | UUID FK → `drivers` | Driver assigned to load |
| `trip_id` | UUID FK → `trips` | Trip containing this load |
| `load_status` | TEXT | Primary status field |
| `posting_status` | TEXT | Marketplace posting status |
| `operational_status` | TEXT | Marketplace operational status |
| `rate_per_cuft` | NUMERIC | Rate per cubic foot |
| `actual_cuft_loaded` | NUMERIC | Actual cubic feet loaded |
| `total_revenue` | NUMERIC | Total revenue for load |
| `company_owes` | NUMERIC | Amount company owes carrier |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `carrier_confirmed_at` | TIMESTAMPTZ | When carrier confirmed |
| `loading_started_at` | TIMESTAMPTZ | When loading started |
| `delivered_at` | TIMESTAMPTZ | When delivered |

#### `trips`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Primary key |
| `owner_id` | UUID FK → `profiles` | Trip creator |
| `driver_id` | UUID FK → `drivers` | Driver on trip |
| `truck_id` | UUID FK → `trucks` | Truck used |
| `trailer_id` | UUID FK → `trailers` | Trailer used |
| `status` | TEXT | `planned/active/en_route/completed/settled/cancelled` |
| `revenue_total` | NUMERIC | Total trip revenue |
| `driver_pay_total` | NUMERIC | Total driver pay |
| `profit_total` | NUMERIC | Total profit |

#### `trip_loads` (Junction)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Primary key |
| `owner_id` | UUID | Owner of junction record |
| `trip_id` | UUID FK → `trips` | Trip reference |
| `load_id` | UUID FK → `loads` | Load reference |
| `sequence_index` | INT | Order of load in trip |
| `role` | TEXT | `primary/backhaul/partial` |

#### `load_requests`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Primary key |
| `load_id` | UUID FK → `loads` | Load being requested |
| `carrier_id` | UUID FK → `companies` | Carrier requesting |
| `carrier_owner_id` | UUID FK → `profiles` | Owner of carrier company |
| `status` | TEXT | `pending/accepted/declined/withdrawn` |
| `request_type` | TEXT | `accept_listed/counter_offer` |

#### `drivers`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Primary key |
| `owner_id` | UUID FK → `profiles` | Company owner who created driver |
| `auth_user_id` | UUID FK → `auth.users` | Driver's own auth account |
| `status` | TEXT | `active/inactive` |
| `pay_mode` | TEXT | Payment mode |

### RLS Policies

#### `loads`:

```sql
-- Owner can see own loads
USING (owner_id = auth.uid())

-- Marketplace visibility
USING (is_marketplace_visible = true AND posting_status = 'posted' AND assigned_carrier_id IS NULL)

-- Assigned carrier can see
USING (user_owns_assigned_carrier(assigned_carrier_id))

-- Driver can see via trip
USING (EXISTS (SELECT 1 FROM trip_loads tl JOIN trips t ON t.id = tl.trip_id 
  WHERE tl.load_id = loads.id AND is_trip_driver(t.driver_id)))
```

#### `trips`:

```sql
-- Owner access
USING (owner_id = auth.uid())

-- Driver access
USING (is_trip_driver(driver_id))
```

#### `load_requests`:

```sql
-- Carrier can see own requests
USING (carrier_owner_id = auth.uid())

-- Load owner can see requests on their loads
USING (EXISTS (SELECT 1 FROM loads WHERE loads.id = load_requests.load_id AND loads.owner_id = auth.uid()))
```

#### `drivers`:

```sql
-- Company owner access
USING (owner_id = auth.uid())

-- Driver self-access
USING (auth_user_id = auth.uid())
```

### Schema Mismatches

1. **Two field names for same concept:**
   - `company_owes` vs `amount_company_owes`
   - `contract_accessorial_*` vs `contract_accessorials_*`

2. **Dual ownership model for drivers:**
   - `owner_id` = company admin who created
   - `auth_user_id` = driver's own auth account

3. **Optional `trip_id` on loads:**
   - Load can have `assigned_driver_id` without `trip_id`
   - Creates orphaned loads invisible to mobile

---

## 13. Problems, Contradictions, and Gaps

### Critical Issues

#### 1. Loads can be assigned to drivers without trips

- **Web:** `updateLoadDriver()` sets `assigned_driver_id` without trip
- **Mobile:** Driver cannot see loads without `trip_loads` record
- **Result:** Load "assigned" but inaccessible

#### 2. Trips can be empty while carrier believes load is active

- Trip created without loads
- Load assigned to driver but not to trip
- Dashboard shows trip active, but load orphaned

#### 3. Mobile cannot update statuses due to missing fields

- `contract_details_entered_at` required for partner loads
- Web doesn't enforce contract entry before status change
- Mobile blocks transitions web allows

#### 4. Web shows statuses mobile never triggers

- `operational_status` has 10 values
- Mobile only updates: `unassigned`, `assigned_to_driver`, `delivered`
- Values like `en_route_to_pickup`, `at_pickup` never set

#### 5. UI allows illogical sequences

- Can "Give Back" a load in `loading` status
- Can assign driver after load is `loaded`
- No validation of workflow sequence

#### 6. Loads become orphaned

- Released load: `assigned_carrier_id = NULL` but may still have stale `trip_id`
- Cancelled trip: Loads may still reference `trip_id`
- Deleted driver: `assigned_driver_id` points to nothing

### Data Inconsistencies

#### Financial fields often NULL

- `actual_cuft_loaded` not set until mobile entry
- `total_revenue` not calculated until settlement
- `company_owes` not set until delivery

#### Status field conflicts

- `load_status = 'accepted'` but `posting_status = 'posted'`
- `operational_status = 'delivered'` but `load_status = 'in_transit'`

#### Missing required timestamps

- Trips without `odometer_start` can't calculate miles
- Loads without `loading_started_at` show broken timeline

### RLS Access Issues

- Carrier can't see company after acceptance
- RLS requires complex `SECURITY DEFINER` functions
- Queries fail if functions not in place

#### Driver has dual identity

- `owner_id` for admin access
- `auth_user_id` for self-service
- Policies must handle both

### UI/UX Contradictions

#### "Needs Confirmation" vs "Active Loads"

- Same load can appear in both during race condition
- `carrier_confirmed_at` set but UI hasn't refreshed

#### Driver assignment options inconsistent

- Confirmation: Select from list OR manual entry
- Detail page: Only select from list
- Trip sync: Overrides whatever was set

#### Payment collection screen expects balance

- If `balance_due_on_delivery = 0`, screen still shows
- Driver confused when nothing to collect

### Database Design Issues

#### No foreign key constraints enforced

- `assigned_driver_id` can point to deleted driver
- `trip_id` can point to deleted trip

#### Duplicate column naming

- `contract_accessorial_*` (singular) in some migrations
- `contract_accessorials_*` (plural) in others

#### Missing indexes

- No index on `load_status + owner_id`
- Slow dashboard queries

---

## Summary

### Key Findings

**17 Critical Issues Identified:**
1. Loads assigned to drivers without trips (inaccessible on mobile)
2. Empty trips with orphaned loads
3. Mobile status transitions blocked by missing web-enforced fields
4. Unused `operational_status` values
5. Illogical workflow sequences allowed
6. Orphaned loads from releases/cancellations
7. Financial fields often NULL
8. Status field conflicts
9. Missing required timestamps
10. RLS access complexity
11. Driver dual identity complexity
12. UI race conditions
13. Inconsistent driver assignment flows
14. Payment collection UX issues
15. No foreign key constraints
16. Duplicate column naming
17. Missing database indexes

### Impact Assessment

**High Priority:**
- Loads invisible to mobile drivers (Issue #1)
- Financial calculations fail due to NULL fields (Issue #7)
- Status conflicts cause UI confusion (Issue #8)

**Medium Priority:**
- Orphaned loads (Issue #6)
- Missing timestamps break timelines (Issue #9)
- RLS access failures (Issue #10)

**Low Priority:**
- Naming inconsistencies (Issue #16)
- Missing indexes (Issue #17)

### Next Steps

This audit provides the complete factual basis for identifying what changes are needed. No solutions have been proposed - only documentation of what currently exists.

**Recommended Actions:**
1. Fix critical mobile visibility issues (driver assignment requires trip)
2. Enforce required fields before status transitions
3. Standardize status field usage
4. Add foreign key constraints
5. Create data migration scripts for orphaned records
6. Add database indexes for performance
7. Standardize column naming conventions

---

**End of Audit**


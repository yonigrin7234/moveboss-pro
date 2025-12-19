# Driver Mobile App: Loading & Delivery Flow

**Complete end-to-end flow for drivers handling loads from assignment to delivery**

---

## Overview

This document outlines the complete workflow for drivers in the mobile app, from when a load is assigned to them through completion of delivery. The flow is driven by load status transitions and includes conditional branching based on load type.

---

## Load Status Pipeline

The core flow follows this status progression:

```
PENDING → ACCEPTED → LOADING → LOADED → IN_TRANSIT → DELIVERED
```

Each status transition triggers specific actions and may branch into different workflows based on load characteristics.

---

## Complete Flow Breakdown

### 1. **Load Assignment (PENDING Status)**

**When:** Owner/broker assigns a load to a driver's trip

**Driver Experience:**
- Load appears in the trip's load list
- Load Detail screen shows "Accept Load" button
- Driver can review:
  - Load number, company info
  - Pickup and delivery addresses
  - Estimated CUFT, weight, pieces
  - Contact information

**Action:**
- Driver taps "Accept Load"
- Status changes: `pending` → `accepted`
- `accepted_at` timestamp recorded
- Owner notified automatically

**Next Step:** Load ready for loading

---

### 2. **Start Loading (ACCEPTED → LOADING)**

**When:** Driver arrives at pickup location

**Driver Experience:**
- Load Detail screen shows "Start Loading" action card
- Driver can optionally:
  - Enter starting CUFT (trailer capacity before loading)
  - Take photo of trailer/odometer

**Action:**
- Driver taps "Start Loading"
- Status changes: `accepted` → `loading`
- `loading_started_at` timestamp recorded
- `starting_cuft` saved (if provided)
- `loading_start_photo` saved (if provided)
- Owner notified automatically

**Next Step:** Driver begins loading items

---

### 3. **Finish Loading (LOADING → LOADED)**

**When:** Driver completes loading items onto trailer

**Driver Experience:**
- Load Detail screen shows "Finish Loading" action card
- Driver can optionally:
  - Enter ending CUFT (trailer capacity after loading)
  - Take photo of loaded trailer
- System automatically calculates `actual_cuft_loaded` = `ending_cuft` - `starting_cuft`

**Action:**
- Driver taps "Finish Loading"
- Status changes: `loading` → `loaded`
- `loading_finished_at` timestamp recorded
- `ending_cuft` saved (if provided)
- `actual_cuft_loaded` calculated and saved
- `loading_end_photo` saved (if provided)
- Owner notified automatically

**Next Step:** Branch based on load type (see below)

---

### 4. **Post-Loading Branching**

After finishing loading, the flow branches based on load characteristics:

#### **Branch A: Pickup Loads** (`posting_type = 'pickup'`)

**Automatic Navigation:** Pickup Completion Screen

**Driver Must Complete:**

1. **Loading Summary** (read-only)
   - Actual CUFT loaded
   - Loading photos

2. **Pre-Existing Damage Documentation**
   - Add damage items with photos
   - Document condition of items before transport

3. **Contract Details Entry**
   - Rate per CUFT
   - Linehaul total (calculated or manual override)
   - Accessorials (collapsible sections):
     - Shuttle
     - Long carry
     - Stairs
     - Bulky items
     - Packing
     - Other
   - Balance due on contract (total - collected at pickup)

4. **Payment at Pickup**
   - Amount collected
   - Payment method:
     - Cash
     - Check (front/back photos required)
     - Zelle (select recipient)
     - Money order
     - Venmo
     - Already paid
   - Payment photos (if check/money order)
   - Zelle recipient (if Zelle)

5. **Delivery Schedule**
   - First available date (RFD) - **REQUIRED**
   - Delivery window end (optional)
   - Delivery notes

6. **Paperwork Capture**
   - Contract/BOL photo
   - Inventory photos (multiple)

**Action:**
- Driver completes all required fields
- Taps "Complete Pickup"
- `pickup_completed_at` timestamp recorded
- Contract details saved to load
- Payment recorded in `load_payments` table
- `remaining_balance_for_delivery` calculated
- `balance_due_on_delivery` set for delivery workflow
- Owner notified automatically

**Next Step:** Ready for delivery (see Delivery section)

---

#### **Branch B: Partner/Marketplace Loads** (`load_source IN ('partner', 'marketplace')`)

**Automatic Navigation:** Contract Details Screen

**Driver Must Complete:**

1. **Loading Report Details**
   - Scan loading report (OCR) - extracts:
     - Balance due
     - Job number
   - OR manual entry of:
     - Balance due
     - Job number
   - Shows actual CUFT, rate, linehaul total

2. **Pre-Existing Damage Documentation**
   - Add damage items with photos

3. **Customer & Delivery Info**
   - Scan Bill of Lading (OCR) - extracts:
     - Customer name
     - Customer phone
     - Delivery address
   - OR manual entry of customer info
   - Tap to call customer
   - Tap to navigate to delivery address

4. **Pre-Charged Accessorials** (collapsible)
   - Shuttle
   - Long carry
   - Stairs
   - Bulky
   - Packing
   - Other

5. **Summary Display**
   - Total Revenue (Linehaul + Accessorials)
   - Balance Driver Collects
   - Amount Company Owes Driver

6. **Document Photos**
   - Loading report photo
   - BOL photo

**Action:**
- Driver completes contract details
- Taps "Save Contract Details"
- `contract_details_entered_at` timestamp recorded
- Contract info saved to load
- `balance_due_on_delivery` set for delivery workflow
- Owner notified automatically

**Note:** OCR endpoints may not exist - manual entry always available

**Next Step:** Ready for delivery (see Delivery section)

---

#### **Branch C: Own Customer Loads** (all other types)

**No Additional Screen Required**

- Load status remains `loaded`
- Ready for delivery immediately

**Next Step:** Ready for delivery (see Delivery section)

---

### 5. **Start Delivery (LOADED → IN_TRANSIT)**

**When:** Driver is ready to begin delivery

**Pre-Delivery Checks:**

1. **Delivery Order Enforcement**
   - System checks if load has `delivery_order` set
   - If yes, verifies all loads with lower `delivery_order` are delivered
   - If blocked, shows: "Complete delivery #X first"
   - If no `delivery_order`, allows delivery anytime

2. **Payment Check**
   - System checks `balance_due_on_delivery` vs `amount_collected_on_delivery`
   - If balance > collected → redirects to Collect Payment screen
   - If no balance → proceeds to delivery start

---

#### **Scenario A: Payment Required**

**Automatic Navigation:** Collect Payment Screen

**Driver Must Complete:**

1. **Balance Display**
   - Shows balance due (from `balance_due_on_delivery` or `remaining_balance_for_delivery`)

2. **Payment Collection**
   - Payment method selection:
     - Cash
     - Check (front/back photos required)
     - Zelle (select recipient)
     - Money order
     - Venmo
     - Already paid
   - Amount collected
   - Zelle recipient (if Zelle)
   - Payment photos (if check/money order)
   - Confirmation checkbox

**Action:**
- Driver collects payment
- Taps "Start Delivery"
- Status changes: `loaded` → `in_transit`
- `delivery_started_at` timestamp recorded
- Payment info saved to load
- Payment recorded in `load_payments` table
- Owner notified automatically

**Next Step:** Driver navigates to delivery location

---

#### **Scenario B: No Payment Required**

**Driver Experience:**
- Load Detail screen shows "Start Delivery" button
- May show trust level badge:
  - **Trusted Customer** - No COD required
  - **COD Required** - Warning to verify payment before unloading

**Action:**
- Driver taps "Start Delivery"
- Status changes: `loaded` → `in_transit`
- `delivery_started_at` timestamp recorded
- Owner notified automatically

**Next Step:** Driver navigates to delivery location

---

### 6. **Complete Delivery (IN_TRANSIT → DELIVERED)**

**When:** Driver finishes unloading at delivery location

**Driver Experience:**
- Load Detail screen shows "Complete Delivery" button
- Driver can review:
  - Delivery address
  - Customer info
  - Payment status
  - Timeline of events

**Action:**
- Driver taps "Complete Delivery"
- Status changes: `in_transit` → `delivered`
- `delivery_finished_at` timestamp recorded
- If load has `delivery_order`:
  - Trip's `current_delivery_index` increments
  - Enables next load in delivery sequence
- Owner notified automatically

**Next Step:** 
- If more loads on trip → Continue with next load
- If all loads delivered → Trip can be completed

---

## Action Priority System

The mobile app uses a smart action engine that prioritizes tasks:

1. **Collect Payment** (Priority 1) - Money waiting to be collected
2. **Complete Delivery** (Priority 2) - Active delivery in progress
3. **Start Delivery** (Priority 3) - Load ready for delivery
4. **Finish Loading** (Priority 4) - Active loading in progress
5. **Start Loading** (Priority 5) - Load ready to start loading
6. **Accept Load** (Priority 6) - Pending load to accept
7. **Start Trip** (Priority 7) - Trip needs to be started
8. **Complete Trip** (Priority 8) - All loads delivered

The app shows the single highest-priority action to guide the driver.

---

## Delivery Order Enforcement

**Purpose:** Prevents drivers from delivering loads out of sequence

**How It Works:**
- Each load can have a `delivery_order` number (1, 2, 3, etc.)
- Trip tracks `current_delivery_index` (starts at 1)
- Driver can only start delivery if:
  - Load has no `delivery_order` (null) → Always allowed
  - Load's `delivery_order` matches trip's `current_delivery_index`
  - All loads with lower `delivery_order` are already delivered

**Example:**
- Load A: `delivery_order = 1`
- Load B: `delivery_order = 2`
- Load C: `delivery_order = 3`

Driver must deliver in order: A → B → C

After Load A is delivered, `current_delivery_index` becomes 2, allowing Load B to start.

---

## Payment Collection Workflow

**When Payment is Required:**
- Load has `balance_due_on_delivery > 0`
- Or `remaining_balance_for_delivery > 0`

**Payment Methods Supported:**
- Cash
- Check (requires front/back photos)
- Zelle (requires recipient selection)
- Money order (requires photo)
- Venmo
- Already paid (no collection needed)

**Payment Tracking:**
- `amount_collected_on_delivery` - Total collected
- `payment_method` - Method used
- `payment_zelle_recipient` - If Zelle
- `payment_photo_front_url` / `payment_photo_back_url` - If check/money order
- Payment also recorded in `load_payments` table for dashboard tracking

---

## Document Management

**Throughout the flow, drivers can:**

1. **Upload Documents** (at any time)
   - Contract/BOL
   - Inventory photos
   - Damage photos
   - Other documents

2. **View Documents**
   - Tap to view full-size images
   - See document metadata

3. **Delete Documents**
   - Remove incorrectly uploaded documents

**Document Types:**
- Contract/BOL
- Inventory
- Damage
- Other

Documents stored in Supabase Storage bucket: `load-photos`

---

## Pre-Existing Damage Documentation

**When:** During loading (before `in_transit` status)

**Driver Can:**
- Add damage items with:
  - Description
  - Photo
  - Location on item
- Edit damage items
- Remove damage items

**After Delivery Starts:**
- Damage documentation becomes read-only
- Cannot add/edit/remove damages

**Purpose:** Protect driver and company from damage claims

---

## Notifications to Owner

**Automatic notifications sent when:**
- Load accepted (`pending` → `accepted`)
- Loading started (`accepted` → `loading`)
- Loading finished (`loading` → `loaded`)
- Pickup completed (for pickup loads)
- Delivery started (`loaded` → `in_transit`)
- Delivery completed (`in_transit` → `delivered`)

**Note:** Notifications are fire-and-forget (no confirmation required)

---

## Error Handling

**Delivery Order Blocked:**
- Shows clear message: "Complete delivery #X first"
- Displays which load must be delivered first
- Prevents out-of-order deliveries

**Payment Required:**
- Redirects to Collect Payment screen
- Cannot start delivery without payment collection

**Network Errors:**
- Basic error alerts shown
- No automatic retry (driver must retry manually)

---

## Trip Completion

**When All Loads Delivered:**
- Trip Detail screen shows "Complete Trip" button
- Driver enters ending odometer reading
- Driver takes photo of odometer
- Trip status changes: `active` → `completed`
- Owner notified

**After Completion:**
- Trip appears in "Recent Trips"
- Settlement process begins (owner side)
- Driver can view earnings once settled

---

## Key Data Fields Updated

### Loading Phase
- `load_status`: `accepted` → `loading` → `loaded`
- `loading_started_at`
- `loading_finished_at`
- `starting_cuft`
- `ending_cuft`
- `actual_cuft_loaded` (calculated)
- `loading_start_photo`
- `loading_end_photo`

### Pickup Completion (Pickup Loads)
- `pickup_completed_at`
- `contract_linehaul_total`
- `contract_balance_due`
- `rate_per_cuft`
- `contract_accessorials_*` (shuttle, stairs, etc.)
- `amount_collected_at_pickup`
- `remaining_balance_for_delivery`
- `balance_due_on_delivery`
- `customer_rfd_date`
- `contract_photo_url`

### Contract Details (Partner/Marketplace Loads)
- `contract_details_entered_at`
- `contract_balance_due`
- `contract_job_number`
- `customer_name`
- `customer_phone`
- `delivery_address_full`
- `contract_linehaul_total`
- `amount_company_owes`
- `loading_report_photo_url`
- `contract_photo_url`

### Delivery Phase
- `load_status`: `loaded` → `in_transit` → `delivered`
- `delivery_started_at`
- `delivery_finished_at`
- `amount_collected_on_delivery`
- `payment_method`
- `payment_zelle_recipient`
- `payment_photo_front_url`
- `payment_photo_back_url`

### Trip Tracking
- `current_delivery_index` (increments after each delivery)

---

## Summary Flow Diagram

```
LOAD ASSIGNED (pending)
    ↓
ACCEPT LOAD (accepted)
    ↓
START LOADING (loading)
    ↓
FINISH LOADING (loaded)
    ↓
    ├─→ PICKUP LOAD? → Pickup Completion Screen → Ready for Delivery
    ├─→ PARTNER/MARKETPLACE? → Contract Details Screen → Ready for Delivery
    └─→ OWN CUSTOMER? → Ready for Delivery
    ↓
CHECK PAYMENT
    ├─→ PAYMENT DUE? → Collect Payment Screen → Start Delivery
    └─→ NO PAYMENT → Start Delivery
    ↓
IN TRANSIT (in_transit)
    ↓
COMPLETE DELIVERY (delivered)
    ↓
ALL LOADS DELIVERED? → Complete Trip
```

---

## Technical Implementation Notes

**Key Files:**
- `apps/mobile/hooks/useLoadActions.ts` - All load status transitions
- `apps/mobile/lib/getNextAction.ts` - Action priority engine
- `apps/mobile/app/(app)/trips/[id]/loads/[loadId].tsx` - Load detail screen
- `apps/mobile/app/(app)/trips/[id]/loads/[loadId]/pickup-completion.tsx` - Pickup flow
- `apps/mobile/app/(app)/trips/[id]/loads/[loadId]/contract-details.tsx` - Contract flow
- `apps/mobile/app/(app)/trips/[id]/loads/[loadId]/collect-payment.tsx` - Payment flow

**Database Tables:**
- `loads` - Main load data
- `trips` - Trip tracking (includes `current_delivery_index`)
- `trip_loads` - Load-to-trip assignments
- `load_payments` - Payment tracking
- `load_documents` - Document storage

**Storage Buckets:**
- `load-photos` - Loading/delivery photos
- `trip-photos` - Odometer photos
- `documents` - Document storage

---

## Future Enhancements (Not Yet Implemented)

1. **Live Location Tracking** - Real-time GPS updates
2. **Push Notifications** - Real-time alerts (partially implemented)
3. **Offline Support** - Queue actions when offline
4. **OCR Scanning** - May not be fully functional
5. **Photo Compression** - Optimize uploads
6. **Error Recovery** - Automatic retry on failures

---

**Last Updated:** Based on codebase audit as of December 2024










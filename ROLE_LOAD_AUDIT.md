# Role & Load Flow Audit

This document captures the current state of company capabilities and load creation flows to safely introduce:
1. Company "modes"/capabilities (moving company, carrier, broker, hybrid)
2. Load types (hhg_originated, storage_out_rfd, marketplace_purchase, carrier_intake)

---

## A. Database Schema

### Company Role Flags

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_workspace_company` | boolean | false | Primary company for a user (vs partner companies they work with) |
| `is_broker` | boolean | false | Books jobs, coordinates between agents and carriers |
| `is_agent` | boolean | false | Does pickups, has warehouse/storage |
| `is_carrier` | boolean | false | Hauls loads, has trucks and drivers |

**Source:** `20251126007_comprehensive_platform_foundation.sql`

### Load Timing Fields

| Column | Type | Purpose |
|--------|------|---------|
| `pickup_date` | date | Single pickup date |
| `pickup_window_start` | timestamptz | Start of pickup window |
| `pickup_window_end` | timestamptz | End of pickup window |
| `pickup_date_start` | date | Alternative pickup range start |
| `pickup_date_end` | date | Alternative pickup range end |
| `delivery_date` | date | Single delivery date |
| `delivery_window_start` | timestamptz | Start of delivery window |
| `delivery_window_end` | timestamptz | End of delivery window |
| `rfd_date` | date | Ready-for-delivery date (NULL = ready now) |
| `customer_rfd_date` | date | First available date for delivery |
| `customer_rfd_date_end` | date | End of customer RFD window |

**Note:** Multiple overlapping date fields exist. `rfd_date` is used by marketplace/RFD flows. `pickup_date` + `pickup_window_*` are used by the general load form. `customer_rfd_date*` appear to be unused or legacy.

### Load Type Fields

| Column | Type | Values | Purpose |
|--------|------|--------|---------|
| `load_type` | text | `pickup`, `live_load`, `rfd`, `company_load`, `local`, `long_distance`, `intrastate`, `interstate`, `standard`, `van_line`, `military`, `corporate` | Overloaded - serves multiple purposes |
| `load_subtype` | text | `live`, `rfd` | For `posting_type='load'`: live pickup vs RFD |
| `posting_type` | text | `pickup`, `load` | Marketplace posting type. `pickup` = carrier does full job; `load` = freight needing delivery |

**Issue:** `load_type` is overloaded with both business classifications (military, van_line) and flow types (live_load, rfd, pickup). This should be split.

---

## B. Company Capabilities in Code

### Flags That Change Behavior

| Flag | Used In | Behavior |
|------|---------|----------|
| `is_broker` | Sidebar | Shows POSTING section (Post Pickup, My Posted Jobs, Carrier Requests, Find Trucks) |
| `is_carrier` | Sidebar | Shows CARRIER section (Operations: Load Board, My Loads, Assigned Loads, Trips) |
| `is_broker && is_carrier` | Sidebar | Shows "Post Load" (RFD/Live Load posting) |
| `is_broker && !is_carrier` | Dashboard | Renders `BrokerDashboard` |
| `is_carrier` (role=carrier) | Dashboard | Renders `CarrierDashboard` |
| `is_workspace_company` | Queries | Distinguishes user's own company from partner companies |

### Role Detection Logic (Dashboard)

```typescript
// Broker: role=company, isBroker=true, isCarrier=false
if (role === 'company' && isBroker && !isCarrier) → BrokerDashboard

// Carrier: role=carrier
if (role === 'carrier') → CarrierDashboard

// Owner-Operator: role=owner_operator
if (role === 'owner_operator') → OwnerOperatorDashboard

// Default (Moving Company): role=company, isBroker=true, isCarrier=true
→ Full Operations Dashboard
```

### Flags That Exist But Are Not Used

| Flag | Notes |
|------|-------|
| `is_agent` | Defined in schema, used in partnerships display, but NOT used for feature gating or UI branching |

### Duplication Issues

- `role` from `onboarding_progress` table vs `is_broker`/`is_carrier` flags on companies
- Both are checked to determine dashboard view
- `role` values: `company`, `carrier`, `owner_operator`
- Company flags: `is_broker`, `is_carrier`

---

## C. Load Creation Flows

### Flow Comparison Table

| Flow | Path | Uses Pickup Date? | Uses Pickup Window? | Uses RFD Date? | Uses Delivery Window? | Uses Customer Fields? | Intended User |
|------|------|-------------------|---------------------|----------------|----------------------|----------------------|---------------|
| **Post Pickup** | `/dashboard/post-pickup` | Yes (required) | Yes (window fields) | No | No | Yes (customer name, phone) | Broker, Moving Company |
| **Post RFD Load** | `/dashboard/post-load` (RFD tab) | No | No | Yes (ready_now or date) | No | No | Moving Company only |
| **Post Live Load** | `/dashboard/post-load` (Live tab) | Yes | No | No | No | Yes (customer name, phone) | Moving Company only |
| **Add Load (My Customer)** | `/dashboard/loads/new` | Optional | No | No | No | Yes (name, phone, address) | Moving Company |
| **Add Load (From Company)** | `/dashboard/loads/new` | Optional | No | No | No | No (driver gets from loading report) | Carrier, Moving Company |
| **Edit Load Wizard** | `/dashboard/loads/[id]` | Yes | Yes (window_start/end) | No | Yes (window_start/end) | No | Any |

### Key Observations

1. **Post Pickup** is for brokers/moving companies selling a job to carriers - the carrier collects the balance
2. **Post Load (RFD/Live)** is for moving companies with freight to move - they pay the carrier
3. **Add Load** is the internal operations flow - not marketplace-focused
4. **No flow currently calculates delivery windows** based on business days (7/14/21 day presets)
5. **Carrier intake flow is missing** - when a carrier gets a load from another company ("Joe Schmoe"), they use the same Add Load form which asks irrelevant questions about pickup dates

---

## D. Load Wizard ("My Loads" Edit)

### Wizard Steps

Located in `LoadForm.tsx`, the wizard has 4 steps with "ready" indicators:

| Step | Title | Ready When | Fields |
|------|-------|------------|--------|
| **Basics** | "Basics ready" | `companyId && serviceType` | Load #, Service Type, Company, Driver, Truck, Trailer |
| **Pickup** | "Pickup ready" | `pickupCity` set | Pickup Date, Window Start/End, Address, City, State, ZIP |
| **Delivery** | "Delivery ready" | `deliveryCity` set | Delivery Date, Window Start/End, Address, City, State, ZIP |
| **Financials** | "Revenue ready" | `linehaulRate || totalRate || status` | Linehaul, Packing, Materials, Accessorials, Total, Status |

### Issues

1. **All loads assumed HHG-style** - Every load shows pickup date, pickup window, delivery date, delivery window
2. **No RFD awareness** - Wizard doesn't know about `rfd_date` or show RFD-specific fields
3. **No role-based field hiding** - Carrier users see the same fields as moving companies
4. **Delivery window is manual datetime** - No "7 business days" calculator

---

## E. Existing Role-Based UI

### Where UI Already Branches by Company Flags

| Location | Condition | Behavior |
|----------|-----------|----------|
| `sidebar.tsx` | `canPostLoads` (is_broker) | Shows POSTING section |
| `sidebar.tsx` | `canHaulLoads` (is_carrier) | Shows CARRIER/Operations section |
| `sidebar.tsx` | `canPostLoads && canHaulLoads` | Shows "Post Load" link |
| `dashboard/page.tsx` | `role === 'company' && isBroker && !isCarrier` | Broker dashboard |
| `dashboard/page.tsx` | `role === 'carrier'` | Carrier dashboard |
| `dashboard/page.tsx` | `role === 'owner_operator'` | Owner-Operator dashboard |
| `partnerships/page.tsx` | `is_carrier` flag on partner | Shows carrier icon vs broker icon |

### Where Loads Are Assumed HHG-Style

| Location | Assumption |
|----------|------------|
| `LoadForm.tsx` | Every load has pickup date + window + delivery date + window |
| `LoadCreateForm.tsx` | Only distinguishes "My Customer" vs "From Company" |
| `loads/[id]/page.tsx` | Edit wizard shows all 4 steps regardless of load type |

### Spots Ready for `load_type` Branching

| Location | Potential Change |
|----------|------------------|
| `LoadCreateForm.tsx` | Detect carrier role → hide pickup date fields, show warehouse-only |
| `LoadForm.tsx` wizard | Check `load_type` or `posting_type` → show/hide steps |
| `role-dashboards.ts` | Already role-aware, could filter differently by load type |

---

## F. Refactor Safe Points

### Safe to Add

1. **New `load_flow_type` column** on loads table:
   - Values: `hhg_originated`, `storage_out_rfd`, `marketplace_purchase`, `carrier_intake`
   - Add as nullable, backfill based on existing `load_type`/`posting_type`
   - Won't break existing flows since we're adding, not changing

2. **Company capability flags refinement**:
   - `is_agent` already exists but unused
   - Could add `has_warehouse`, `has_fleet` boolean flags
   - Won't break existing is_broker/is_carrier checks

3. **Delivery window calculator component**:
   - New component, doesn't modify existing forms
   - Can be added to forms opt-in

### Needs Caution

1. **LoadCreateForm.tsx** - Shared between:
   - `/dashboard/loads/new` (all roles)
   - Could break if we hide fields without checking role properly

2. **LoadForm.tsx** (wizard) - Used for:
   - Edit existing loads of ALL types
   - Changing step visibility could hide data on existing loads

3. **`load_type` column** - Already overloaded:
   - Used for both business type (military, van_line) AND flow type (live_load, rfd)
   - Recommend NEW column for flow type vs modifying this

### Recommended Approach

1. Add `load_flow_type` enum column (new, not modifying `load_type`)
2. Add role check to `LoadCreateForm` to simplify for carriers
3. Create `DeliveryWindowCalculator` component
4. Update wizard step visibility based on `load_flow_type`
5. Keep existing forms working, add new behavior incrementally

---

## Summary

**Current State:**
- Role flags (`is_broker`, `is_carrier`) exist and work for navigation/dashboard
- Load timing fields exist but are inconsistently used across flows
- `load_type` is overloaded and confusing
- No delivery window calculator
- Carrier intake flow uses wrong form

**Recommended Next Steps:**
1. Add `load_flow_type` column to distinguish flow types
2. Add `DeliveryWindowCalculator` component
3. Create carrier-specific load intake form or mode
4. Refactor wizard to be flow-type-aware

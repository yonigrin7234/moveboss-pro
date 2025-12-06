# Mobile App Audit

Deep audit of the mobile app (driver + owner views) for role/load-type refactor compatibility.

---

## A. Data Dependencies in Mobile

### Load Interface (from `types/index.ts`)

The mobile app uses a comprehensive `Load` interface with these key fields:

#### Load Type Fields
| Field | Type | Used For |
|-------|------|----------|
| `load_type` | `'pickup' \| 'live_load' \| 'company_load' \| 'rfd' \| ...` | UI labeling, workflow branching |
| `load_source` | `'own_customer' \| 'partner' \| 'marketplace'` | Contract details requirement |
| `posting_type` | `'pickup' \| 'load' \| 'live_load'` | Pickup completion workflow |

#### Pickup Fields
| Field | Used | Notes |
|-------|------|-------|
| `pickup_date` | ✅ | Display only |
| `pickup_city` | ✅ | Address formatting |
| `pickup_state` | ✅ | Address formatting |
| `pickup_address_line1` | ✅ | Navigation |
| `pickup_contact_name` | ✅ | Call/text buttons |
| `pickup_contact_phone` | ✅ | Call/text buttons |
| `pickup_window_start` | ❌ | **NOT USED** |
| `pickup_window_end` | ❌ | **NOT USED** |

#### Delivery Fields
| Field | Used | Notes |
|-------|------|-------|
| `delivery_date` | ✅ | Display only |
| `delivery_city` | ✅ | Address formatting |
| `delivery_state` | ✅ | Address formatting |
| `delivery_address_line1` | ✅ | Navigation |
| `dropoff_city/state/address` | ✅ | Fallback fields |
| `delivery_window_start` | ❌ | **NOT USED** |
| `delivery_window_end` | ❌ | **NOT USED** |

#### Customer Fields
| Field | Used | Notes |
|-------|------|-------|
| `customer_name` | ✅ | Display, action descriptions |
| `customer_phone` | ✅ | Call/text buttons |
| `customer_rfd_date` | ✅ | Pickup completion workflow |
| `customer_rfd_date_end` | ✅ | Pickup completion workflow |

#### Financial Fields
| Field | Used | Notes |
|-------|------|-------|
| `balance_due_on_delivery` | ✅ | Payment collection workflow |
| `amount_collected_on_delivery` | ✅ | Payment tracking |
| `rate_per_cuft` | ✅ | Contract details |
| `contract_*` | ✅ | Partner/marketplace loads |

### Trip Interface

| Field | Used | Notes |
|-------|------|-------|
| `current_delivery_index` | ✅ | Delivery order enforcement |
| `trip_pay_mode` | ✅ | Driver earnings calculation |
| All odometer fields | ✅ | Trip start/end workflows |

---

## B. Trip / Load Display Logic

### Data Flow

```
Driver Login → AuthProvider
    ↓
useDriverTrips() → Fetches trips with trip_loads and nested loads
    ↓
TripDetailProvider → Provides real-time trip/load state
    ↓
getNextAction() → Smart action engine determines priority
    ↓
Screen renders based on load_status
```

### Load Status Workflow

```
pending → accepted → loading → loaded → in_transit → delivered
```

The mobile app uses `load_status` as the primary state machine, NOT `load_type`.

### Action Priority (from `getNextAction.ts`)

1. **collect_payment** - Money waiting to be collected
2. **complete_delivery** - Active delivery in progress
3. **start_delivery** - Load ready for delivery
4. **finish_loading** - Active loading in progress
5. **start_loading** - Load ready to start loading
6. **accept_load** - Pending load to accept
7. **start_trip** - Trip needs to be started
8. **complete_trip** - All loads delivered

### Conditional Logic by Load Type

The mobile app **already branches** on `load_type` and `posting_type`:

#### In `trips/[id].tsx`:
```typescript
// Line 273-284
const getLoadLabel = (load: Load) => {
  if (load.load_type === 'pickup') {
    return 'Pickup';
  }
  // Everything else (company_load, live_load, rfd, etc.) = "Load"
  return 'Load';
};
```

#### In `useLoadActions.ts`:
```typescript
// Line 575-602 - Pickup completion check
const requiresPickupCompletion = async () => {
  const isPickup = load?.posting_type === 'pickup';
  const notYetCompleted = !load?.pickup_completed_at;
  return { required: isPickup && notYetCompleted };
};
```

### Contract Details Requirement

For `load_source === 'partner' || 'marketplace'`:
- Requires `contract_details_entered_at` before delivery
- Shows contract details entry screen

---

## C. Role-Dependent UI (Current State)

### No Company-Level Role Detection

The mobile app has **NO company capability checks**:
- No `is_broker` checks
- No `is_carrier` checks
- No `is_agent` checks

### Driver-Centric Design

The mobile app is designed exclusively for **drivers**:
- All data is fetched via driver's `auth_user_id` → `drivers.owner_id`
- UI assumes driver is working on trips/loads
- No owner/admin views in mobile

### Trip Load Role Field

Each `trip_load` has a `role` field:
- `'primary'` - Main load
- `'backhaul'` - Return load
- `'partial'` - Partial shipment

This is **not** company role - it's the load's role in the trip.

---

## D. Potential Risk Areas for Role/Load-Type Refactor

### Low Risk Areas

| Area | Why Low Risk |
|------|--------------|
| **pickup_window_start/end** | NOT used in mobile - can be null safely |
| **delivery_window_start/end** | NOT used in mobile - can be null safely |
| **Company capability flags** | NOT checked in mobile |

### Medium Risk Areas

| Area | Concern | Mitigation |
|------|---------|------------|
| `load_type` values | Used for UI labeling | Only checks `=== 'pickup'`, new values are safe |
| `posting_type` values | Used for workflow branching | Only checks `=== 'pickup'`, new values need handling |
| `load_source` values | Contract details requirement | Only checks `'partner' \| 'marketplace'`, extensible |

### High Risk Areas

| Area | Concern | Action Required |
|------|---------|-----------------|
| **getNextAction.ts** | Central action engine | Review if new load types affect priority |
| **pickup-completion.tsx** | `posting_type === 'pickup'` workflow | Ensure new types don't accidentally trigger |
| **contract-details.tsx** | `load_source` check | May need update for new source types |
| **customer_name fallback** | Uses `load.companies?.name` as fallback | Ensure all load types have company association |

### Fields That MUST Exist

The following fields are accessed without null-guards in critical paths:

```typescript
// getNextAction.ts
load.balance_due_on_delivery || 0
load.amount_collected_on_delivery || 0
load.customer_name || load.companies?.name || 'Customer'
load.delivery_order || 0
load.pickup_city, load.pickup_state
load.delivery_city || load.dropoff_city
```

These fields can be null but mobile handles gracefully with fallbacks.

---

## E. Safe Integration Points

### Natural Branching Points

#### 1. `getNextAction.ts` - Action Engine
```typescript
// Safe to add:
if (load.load_flow_type === 'carrier_intake') {
  // Skip pickup-related actions
  // Go straight to delivery workflow
}
```

#### 2. `useLoadActions.ts` - Workflow Hooks
```typescript
// Line 575 - Already branches on posting_type
// Can extend:
const requiresPickupCompletion = async () => {
  const isPickup = load?.posting_type === 'pickup';
  const isCarrierIntake = load?.load_flow_type === 'carrier_intake';
  // carrier_intake never requires pickup completion
  if (isCarrierIntake) return { required: false };
  ...
};
```

#### 3. `trips/[id].tsx` - Trip Detail Screen
```typescript
// Line 273 - Already has getLoadLabel function
// Can extend for new types
```

#### 4. `LoadDetailScreen` - Load Detail
```typescript
// Can conditionally hide sections based on load_flow_type
// e.g., hide customer section for carrier_intake loads
```

### Reusable Components Safe to Branch

| Component | File | Safe to Add Conditionals |
|-----------|------|-------------------------|
| StatusBadge | `StatusBadge.tsx` | ✅ Add new status colors |
| NextActionCard | `NextActionCard.tsx` | ✅ Based on action type |
| TripCard | `TripCard.tsx` | ✅ Based on load types in trip |
| LoadSuggestions | `LoadSuggestions.tsx` | ✅ Filter by load type |

### Recommended Integration Strategy

1. **Add `load_flow_type` to types/index.ts**
   ```typescript
   export type LoadFlowType = 'hhg_originated' | 'storage_out_rfd' | 'marketplace_purchase' | 'carrier_intake';

   export interface Load {
     load_flow_type?: LoadFlowType;
     // ... existing fields
   }
   ```

2. **Update getNextAction.ts**
   - Add early exit for non-applicable workflows
   - Adjust priorities based on flow type

3. **Update useLoadActions.ts**
   - Add `load_flow_type` checks to requirement functions
   - Skip inapplicable workflows

4. **No Changes Needed**
   - Pickup/delivery address formatting (graceful fallbacks exist)
   - Customer display (graceful fallbacks exist)
   - Payment collection (uses existing balance fields)

---

## Summary

### Mobile App Compatibility: HIGH

The mobile app is well-designed for extensibility:

1. **No HHG assumptions** - Window fields NOT used
2. **Graceful null handling** - All critical fields have fallbacks
3. **Existing branching patterns** - Already splits on `load_type`, `posting_type`, `load_source`
4. **Driver-only scope** - No company capability checks to conflict with

### Recommended Actions

| Priority | Action |
|----------|--------|
| **Before launch** | Add `load_flow_type` to TypeScript interface |
| **Before launch** | Update `getNextAction.ts` for new flow types |
| **After launch** | Optimize UI for specific flow types (hide irrelevant sections) |
| **Optional** | Add flow-type-specific screens if needed |

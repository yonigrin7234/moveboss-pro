# Marketplace & Financial Audit

Focused audit of marketplace posting flows and financial/revenue logic to safely introduce `load_flow_type`.

**Related Documents:**
- [ROLE_LOAD_AUDIT.md](./ROLE_LOAD_AUDIT.md) - Company flags, load_type chaos, wizard flows
- [MOBILE_AUDIT.md](./MOBILE_AUDIT.md) - Mobile app load/trip usage

---

## A. Marketplace Posting Flows

### A.1 Entry Points for Posting

| Entry Point | Location | Creates/Updates | Type Set |
|-------------|----------|-----------------|----------|
| **Post to Marketplace** (from My Loads) | `loads/[id]/page.tsx` → `postToMarketplaceAction` | Updates existing load | `posting_type: 'load'` |
| **Post Pickup** (direct) | `post-pickup/page.tsx` | Creates new load | `posting_type: 'pickup'` |
| **Post Load** (RFD/Live) | `post-load/page.tsx` | Creates new load | `posting_type: 'load'`, `load_subtype: 'rfd' \| 'live'` |
| **Company Portal** (partner) | `company/loads/new/page.tsx` | Creates new load | `is_marketplace_visible` toggle |

### A.2 Fields Written When Posting

**Post to Marketplace Action** (`loads/[id]/page.tsx:156-204`)

```typescript
.update({
  posting_status: 'posted',
  posted_at: new Date().toISOString(),
  posting_type: 'load',
  posted_by_company_id: workspaceCompany?.id,
  is_marketplace_visible: true,
  posted_to_marketplace_at: new Date().toISOString(),
  load_status: 'pending',
  // Rate fields
  cubic_feet_estimate: data.cubic_feet,
  rate_per_cuft: data.rate_per_cuft,
  linehaul_amount: data.linehaul_amount,
  company_rate: data.linehaul_amount,
  company_rate_type: 'flat',
  is_open_to_counter: data.is_open_to_counter,
  truck_requirement: data.truck_requirement,
})
```

**Post Pickup** (`post-pickup/page.tsx:127-141`)
- Sets `posting_type: 'pickup'`
- Sets `posting_status: 'posted'`
- Sets `is_marketplace_visible: true`
- Sets `balance_due`, `rate_per_cuft`, `linehaul_amount`

**Post Load (RFD/Live)** (`post-load/page.tsx:314-329`)
- Sets `posting_type: 'load'`
- Sets `load_subtype: 'rfd' | 'live'`
- Sets `posting_status: 'posted'`
- Sets `is_marketplace_visible: true`

### A.3 Posting Status State Machine

```
draft → posted → assigned → in_progress → completed
                    ↓
               cancelled
```

**Status Transitions:**

| Action | From | To | Where |
|--------|------|-----|-------|
| Post to marketplace | `draft`/null | `posted` | `loads/[id]/page.tsx` |
| Carrier request accepted | `posted` | `assigned` | `marketplace.ts:acceptLoadRequest` |
| Carrier confirms load | `assigned` | `in_progress` | `carrier-requests/request-actions.tsx` |
| Give back to marketplace | `assigned` | `posted` | `company-portal.ts:unassignCarrier` |
| Cancel posting | `posted` | `draft` | `company-portal.ts:unpublishLoad` |
| Delivery complete | `in_progress` | `completed` | (implicit) |
| Cancel load | any | `cancelled` | `company-portal.ts:cancelLoad` |

### A.4 Load Type Dependency in Posting Logic

**Does posting logic depend on `load_type`?**

| File | Uses `load_type`? | Notes |
|------|-------------------|-------|
| `loads/[id]/page.tsx` | ❌ NO | Posts any load regardless of type |
| `post-pickup/page.tsx` | ❌ NO | Creates with `posting_type: 'pickup'` |
| `post-load/page.tsx` | ❌ NO | Creates with `load_type` for display only |
| `marketplace.ts` | ✅ YES (display) | `load_type` shown in marketplace listing |
| `load-actions.tsx` | ❌ NO | Post button works for any draft load |

**The posting logic does NOT branch on `load_type`** - it only:
- Reads `posting_status` to show/hide the "Post" button
- Writes `posting_type` to distinguish pickup vs load listings
- Uses `load_type` for display/filtering only

### A.5 Coupling Between Wizard and Posting

**Wizard Steps vs Posting Eligibility:**

The wizard (Basics/Pickup/Delivery/Revenue) does NOT gate posting. A load can be posted to marketplace regardless of wizard completion status.

**Post to Marketplace button** (`load-actions.tsx:180-190`)
```typescript
const isDraft = !postingStatus || postingStatus === 'draft';
// Shows button only for draft loads - NO wizard check
{isDraft && <Button onClick={...}>Post to Marketplace</Button>}
```

**Recommendation:** Wizard step changes are SAFE for posting logic. The wizard is purely for data entry guidance, not marketplace eligibility.

---

## B. Financial / Revenue Logic

### B.1 Load-Level Financial Calculations

**Primary File:** `data/load-financials.ts`

**Revenue Formula:**
```
Base Revenue = actual_cuft_loaded × rate_per_cuft
Total Revenue = Base + Contract Accessorials + Extra Accessorials + Storage
Company Owes = Total Revenue - (Collected on Delivery + Paid to Company)
```

**Fields Used:**

| Field | Purpose |
|-------|---------|
| `actual_cuft_loaded` | Actual cubic feet loaded |
| `rate_per_cuft` | Rate per cubic foot |
| `contract_accessorials_*` | Pre-agreed fees (stairs, shuttle, long carry, packing, bulky, other) |
| `extra_*` | Day-of charges added by driver |
| `amount_collected_on_delivery` | Cash/check collected at delivery |
| `amount_paid_directly_to_company` | Direct payments to company |
| `storage_*` | Storage fees if applicable |

**Output Fields:**
- `base_revenue`
- `contract_accessorials_total`
- `extra_accessorials_total`
- `total_revenue`
- `company_owes`

### B.2 Trip-Level Financial Calculations

**Primary File:** `data/trip-financials.ts`

**Formula:**
```
Revenue Total = SUM(load.total_rate) for all trip loads
Driver Pay = calculated from pay_mode (per_mile, per_cuft, percent_of_revenue, flat_daily)
Profit = Revenue - (Driver Pay + Fuel + Tolls + Other Expenses)
```

**Fields Used:**

| Source | Field | Purpose |
|--------|-------|---------|
| Trip | `odometer_start`, `odometer_end` | Total miles for per_mile pay |
| Trip | `trip_pay_mode` | Snapshot of driver's pay mode |
| Trip | `trip_rate_per_*` | Snapshot of driver's rates |
| Trip Loads | `load.total_rate` | Revenue per load |
| Trip Loads | `load.actual_cuft_loaded` | Cuft for per_cuft pay |
| Expenses | `category`, `amount` | Fuel, tolls, other costs |

**Output Fields:**
- `revenue_total`
- `driver_pay_total`
- `fuel_total`, `tolls_total`, `other_expenses_total`
- `profit_total`
- `driver_pay_breakdown` (JSON)

### B.3 Pre-Delivery COD Check

**File:** `data/load-financials.ts:generatePreDeliveryCheck`

**Purpose:** Determine if COD is required before unloading

**Formula:**
```
Carrier Rate = actual_cuft × rate_per_cuft + contract_accessorials
Shortfall = Carrier Rate - Customer Balance
Requires COD = !trusted && shortfall > 0 && !cod_received
```

### B.4 Financial Fields in Marketplace

When accepting a marketplace request (`marketplace.ts:acceptLoadRequest`):

```typescript
.update({
  carrier_rate: finalRate,
  carrier_rate_type: finalRateType,
  ...
})
```

The marketplace writes:
- `carrier_rate` - Agreed rate for carrier
- `carrier_rate_type` - How rate is calculated

**These fields do NOT affect load financial calculations** - they're for the carrier's view of the job.

### B.5 Type Dependency in Financial Logic

**Does financial logic depend on `load_type` or `posting_type`?**

| File | Uses `load_type`? | Uses `posting_type`? | Notes |
|------|-------------------|---------------------|-------|
| `load-financials.ts` | ❌ NO | ❌ NO | Pure numeric calculation |
| `trip-financials.ts` | ❌ NO | ❌ NO | Pure numeric calculation |
| `settlements.ts` | ❌ NO | ❌ NO | Uses company relationships |
| `company-ledger.ts` | ❌ NO | ❌ NO | Uses receivables/payables |
| `reports.ts` | ❌ NO | ❌ NO | Aggregates from loads |

**Financial calculations are TYPE-AGNOSTIC.** They only care about:
- Cubic feet (actual and estimate)
- Rate per cuft
- Accessorial amounts
- Collection amounts

---

## C. Interactions Between Posting and Financials

### C.1 Does Posting Change Financial Fields?

| Posting Action | Financial Fields Written |
|----------------|-------------------------|
| Post to Marketplace | `rate_per_cuft`, `linehaul_amount`, `company_rate` |
| Post Pickup | `rate_per_cuft`, `linehaul_amount`, `balance_due` |
| Post Load (RFD/Live) | `rate_per_cuft`, `linehaul_amount` |
| Accept Request | `carrier_rate`, `carrier_rate_type` |

**Key Insight:** Posting WRITES financial fields (rates, linehaul), but financial calculations READ different fields (actual_cuft_loaded, total_rate, collected amounts).

### C.2 Type-Conditional Financial Logic

**Are there any places where money and type flags mix?**

Searched for: `posting_type.*revenue`, `load_type.*linehaul`, etc.

**Result: NO coupling found.**

Financial calculations are completely isolated from type flags.

### C.3 Summary of Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                    POSTING FLOW                                  │
│                                                                  │
│  [Post Load] → sets posting_type, posting_status                │
│             → writes rate_per_cuft, linehaul_amount             │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ (rate fields)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FINANCIAL FLOW                                │
│                                                                  │
│  [Load Financials] → reads actual_cuft, rate_per_cuft           │
│                    → calculates total_revenue, company_owes     │
│                                                                  │
│  [Trip Financials] → reads load.total_rate                       │
│                    → calculates profit, driver_pay               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

        NO COUPLING between posting_type/load_type and financials
```

---

## D. Safe Zones vs Risky Zones

### D.1 Safe Zones (Can Add `load_flow_type` Freely)

| Area | Why Safe |
|------|----------|
| **Financial calculations** (`load-financials.ts`, `trip-financials.ts`) | No type dependency; pure numeric |
| **Settlements** (`settlements.ts`) | Company relationship based, not load type |
| **Ledger/Receivables** (`company-ledger.ts`) | Uses company IDs, not load types |
| **Reports** (`reports.ts`) | Aggregates numbers only |
| **Marketplace display** (`marketplace.ts` reads) | Already uses `load_type` for display |
| **Post to Marketplace button** (`load-actions.tsx`) | Only checks `posting_status` |

### D.2 Caution Zones (Review Before Changing)

| Area | Concern | Risk Level |
|------|---------|------------|
| **Post to Marketplace action** | Writes `posting_type: 'load'` | LOW - can add `load_flow_type` alongside |
| **Marketplace accept** | Writes `carrier_rate` fields | LOW - no type dependency |
| **Give Back action** | Resets `posting_status` | LOW - type-agnostic |

### D.3 Risky Zones (Avoid Unless Necessary)

| Area | Concern | Recommendation |
|------|---------|----------------|
| **`posting_type` field** | Used for marketplace filtering | Do NOT reuse for `load_flow_type` - add new column |
| **`load_type` field** | Already overloaded (see ROLE_LOAD_AUDIT.md) | Do NOT add more values - use new column |
| **Wizard step visibility** | Changing steps could affect data entry | Keep wizard changes isolated from posting/financials |

### D.4 Integration Strategy for `load_flow_type`

**Recommended Approach:**

1. **Add new column** `load_flow_type` (enum: `hhg_originated`, `storage_out_rfd`, `marketplace_purchase`, `carrier_intake`)

2. **Do NOT modify**:
   - `posting_type` (keep as `'pickup' | 'load'`)
   - `load_type` (keep existing overloaded values)
   - Any financial calculation logic

3. **Safe to use `load_flow_type` for**:
   - Wizard step visibility (show/hide based on flow type)
   - UI customization (different labels, simplified forms)
   - Filtering in load lists
   - Mobile app workflow branching (see MOBILE_AUDIT.md)

4. **When posting to marketplace**:
   - Continue setting `posting_type` and `posting_status` as today
   - Optionally filter marketplace by `load_flow_type` for future features
   - Financial fields remain unchanged

---

## Summary

### Key Findings

1. **Marketplace posting is type-agnostic** - Any load can be posted regardless of `load_type`
2. **Financial calculations are isolated** - No dependency on `posting_type`, `load_type`, or `load_source`
3. **No coupling between posting and financials** - They share some rate fields but calculations are independent
4. **Wizard does not gate posting** - A load can be posted without completing all wizard steps

### Safe to Introduce `load_flow_type`

| Operation | Safe? |
|-----------|-------|
| Add `load_flow_type` column | ✅ YES |
| Use for wizard step visibility | ✅ YES |
| Use for UI customization | ✅ YES |
| Use for mobile workflow branching | ✅ YES |
| Modify posting logic | ⚠️ CAUTION - review first |
| Modify financial calculations | ❌ NO - not needed |

### Changes That Would Break Things

| Change | What Breaks |
|--------|-------------|
| Reusing `posting_type` for flow type | Marketplace filtering |
| Adding values to `load_type` | Existing type checks |
| Making wizard steps gate posting | Existing posted loads |
| Changing financial field names | All revenue calculations |

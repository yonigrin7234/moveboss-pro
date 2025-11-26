"use client";

import { useActionState } from "react";

import { PhotoField } from "@/components/ui/photo-field";
import type { DriverFormState } from "./driver-trip-forms";

type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

interface LoadFinancialSummaryProps {
  load: Record<string, any>;
}

export function LoadFinancialSummary({ load }: LoadFinancialSummaryProps) {
  // Calculate totals from load data
  const actualCuft = Number(load.actual_cuft_loaded) || 0;
  const ratePerCuft = Number(load.contract_rate_per_cuft || load.rate_per_cuft) || 0;
  const baseRevenue = actualCuft * ratePerCuft;

  // Individual contract accessorials
  const contractShuttle = Number(load.contract_accessorials_shuttle) || 0;
  const contractStairs = Number(load.contract_accessorials_stairs) || 0;
  const contractLongCarry = Number(load.contract_accessorials_long_carry) || 0;
  const contractPacking = Number(load.contract_accessorials_packing) || 0;
  const contractBulky = Number(load.contract_accessorials_bulky) || 0;
  const contractOther = Number(load.contract_accessorials_other) || 0;
  const contractTotal = contractShuttle + contractStairs + contractLongCarry + contractPacking + contractBulky + contractOther;

  // Individual extra accessorials
  const extraShuttle = Number(load.extra_shuttle) || 0;
  const extraStairs = Number(load.extra_stairs) || 0;
  const extraLongCarry = Number(load.extra_long_carry) || 0;
  const extraPacking = Number(load.extra_packing) || 0;
  const extraBulky = Number(load.extra_bulky) || 0;
  const extraOther = Number(load.extra_other) || 0;
  const extraTotal = extraShuttle + extraStairs + extraLongCarry + extraPacking + extraBulky + extraOther;

  const storageTotal =
    (Number(load.storage_move_in_fee) || 0) +
    (Number(load.storage_daily_fee) || 0) * (Number(load.storage_days_billed) || 0);

  const totalRevenue = baseRevenue + contractTotal + extraTotal + storageTotal;

  // Support both old field (amount_collected_on_delivery) and new field (collected_amount)
  const collectedAmount = Number(load.collected_amount) || Number(load.amount_collected_on_delivery) || 0;
  const paidToCompany = Number(load.amount_paid_directly_to_company) || 0;
  const companyOwes = totalRevenue - collectedAmount - paidToCompany;

  const hasContractAccessorials = contractTotal > 0;
  const hasExtraAccessorials = extraTotal > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-4 text-base font-semibold text-foreground">Load Financial Summary</h4>

      <div className="space-y-3 text-sm">
        {/* Base Revenue */}
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-foreground">Base Revenue</p>
            <p className="text-xs text-muted-foreground">
              {actualCuft.toLocaleString()} cf × ${ratePerCuft.toFixed(2)}
            </p>
          </div>
          <span className="font-medium">{formatCurrency(baseRevenue)}</span>
        </div>

        {/* Contract Accessorials - Full Breakdown */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="font-medium text-foreground">Contract Accessorials</p>

          {contractShuttle > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Shuttle</span>
              <span>{formatCurrency(contractShuttle)}</span>
            </div>
          )}
          {contractStairs > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Stairs</span>
              <span>{formatCurrency(contractStairs)}</span>
            </div>
          )}
          {contractLongCarry > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Long Carry</span>
              <span>{formatCurrency(contractLongCarry)}</span>
            </div>
          )}
          {contractPacking > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Packing</span>
              <span>{formatCurrency(contractPacking)}</span>
            </div>
          )}
          {contractBulky > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Bulky Items</span>
              <span>{formatCurrency(contractBulky)}</span>
            </div>
          )}
          {contractOther > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Other</span>
              <span>{formatCurrency(contractOther)}</span>
            </div>
          )}

          {!hasContractAccessorials && (
            <p className="text-xs text-muted-foreground italic pl-2">No contract accessorials</p>
          )}

          {hasContractAccessorials && (
            <div className="flex justify-between pl-2 pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(contractTotal)}</span>
            </div>
          )}
        </div>

        {/* Extra Accessorials - Full Breakdown */}
        {hasExtraAccessorials && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="font-medium text-foreground">Extra Accessorials</p>

            {extraShuttle > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Shuttle</span>
                <span>{formatCurrency(extraShuttle)}</span>
              </div>
            )}
            {extraStairs > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Stairs</span>
                <span>{formatCurrency(extraStairs)}</span>
              </div>
            )}
            {extraLongCarry > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Long Carry</span>
                <span>{formatCurrency(extraLongCarry)}</span>
              </div>
            )}
            {extraPacking > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Packing</span>
                <span>{formatCurrency(extraPacking)}</span>
              </div>
            )}
            {extraBulky > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Bulky Items</span>
                <span>{formatCurrency(extraBulky)}</span>
              </div>
            )}
            {extraOther > 0 && (
              <div className="flex justify-between pl-2">
                <span className="text-muted-foreground">Other</span>
                <span>{formatCurrency(extraOther)}</span>
              </div>
            )}

            <div className="flex justify-between pl-2 pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(extraTotal)}</span>
            </div>
          </div>
        )}

        {/* Storage */}
        {storageTotal > 0 && (
          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-medium text-foreground">Storage Fees</span>
            <span className="font-medium">{formatCurrency(storageTotal)}</span>
          </div>
        )}

        {/* Total Revenue */}
        <div className="flex justify-between border-t border-border pt-3">
          <span className="font-semibold text-foreground">Total Revenue</span>
          <span className="font-semibold text-lg">{formatCurrency(totalRevenue)}</span>
        </div>

        {/* Collection Info */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="font-medium text-foreground">Collection</p>

          {Number(load.balance_due_on_delivery) > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Balance Due on Delivery</span>
              <span>{formatCurrency(load.balance_due_on_delivery)}</span>
            </div>
          )}

          {collectedAmount > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">
                Collected {load.collection_method ? `(${load.collection_method})` : ""}
              </span>
              <span className="text-emerald-600">-{formatCurrency(collectedAmount)}</span>
            </div>
          )}

          {paidToCompany > 0 && (
            <div className="flex justify-between pl-2">
              <span className="text-muted-foreground">Paid to Company</span>
              <span className="text-emerald-600">-{formatCurrency(paidToCompany)}</span>
            </div>
          )}

          {collectedAmount === 0 && paidToCompany === 0 && (
            <p className="text-xs text-muted-foreground italic pl-2">No payments collected yet</p>
          )}
        </div>

        {/* Company Owes - Highlighted */}
        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg mt-2">
          <span className="font-bold text-foreground">Company Owes</span>
          <span className={`text-xl font-bold ${companyOwes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(companyOwes)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PickupFormProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function LoadPickupForm({ loadId, action, defaults }: PickupFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Mark as loaded</h4>
          <p className="text-sm text-muted-foreground">
            Capture contract values from the origin paperwork. Actual CUFT loaded is required.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : "Mark loaded"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Actual CUFT loaded</label>
          <input
            type="number"
            name="actual_cuft_loaded"
            defaultValue={defaults?.actual_cuft_loaded ?? ""}
            required
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Contract rate per CUFT</label>
          <input
            type="number"
            name="contract_rate_per_cuft"
            defaultValue={defaults?.contract_rate_per_cuft ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["contract_accessorials_shuttle", "Shuttle"],
          ["contract_accessorials_stairs", "Stairs"],
          ["contract_accessorials_long_carry", "Long carry"],
          ["contract_accessorials_bulky", "Bulky"],
          ["contract_accessorials_other", "Other"],
        ].map(([key, label]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contract {label}</label>
            <input
              type="number"
              name={key}
              defaultValue={defaults?.[key] ?? ""}
              min={0}
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Balance due on delivery</label>
          <input
            type="number"
            name="balance_due_on_delivery"
            defaultValue={defaults?.balance_due_on_delivery ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Origin arrival time</label>
          <input
            type="datetime-local"
            name="origin_arrival_at"
            defaultValue={defaults?.origin_arrival_at ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <PhotoField
        name="load_report_photo_url"
        label="Load report / contract photo"
        defaultValue={defaults?.load_report_photo_url ?? ""}
        description="Upload the contract or load report photo from the origin."
      />

      {state?.error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      ) : null}
    </form>
  );
}

interface DeliveryFormProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
  company?: { name: string; trust_level?: string } | null;
}

export function LoadDeliveryForm({ loadId, action, defaults, company }: DeliveryFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  // Calculate COD requirements
  const trustLevel = company?.trust_level || "cod_required";
  const isTrusted = trustLevel === "trusted";

  // Calculate carrier rate (what company owes us)
  const actualCuft = Number(defaults?.actual_cuft_loaded) || 0;
  const ratePerCuft = Number(defaults?.contract_rate_per_cuft || defaults?.rate_per_cuft) || 0;
  const carrierRate = actualCuft * ratePerCuft + (Number(defaults?.contract_accessorials_total) || 0);

  // Customer balance (what customer owes on delivery)
  const customerBalance = Number(defaults?.balance_due_on_delivery) || 0;

  // Shortfall is what company needs to pay us that customer won't cover
  const shortfall = Math.max(0, carrierRate - customerBalance);

  // COD is required when not trusted AND there's a shortfall
  const requiresCOD = !isTrusted && shortfall > 0;
  const codAmount = shortfall;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Deliver load</h4>
          <p className="text-sm text-muted-foreground">
            Record delivery payments and any on-site extras collected by the driver.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : "Mark delivered"}
        </button>
      </div>

      {/* COD Payment Alert */}
      {requiresCOD && (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-amber-600 text-xl">⚠️</div>
            <div className="flex-1">
              <h5 className="font-semibold text-amber-800">COD Payment Required</h5>
              <p className="text-sm text-amber-700 mt-1">
                {company?.name || "Company"} requires COD payment of{" "}
                <span className="font-bold">{formatCurrency(codAmount)}</span> before unloading.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="cod_payment_confirmed"
                  id="cod_payment_confirmed"
                  className="h-4 w-4 rounded border-amber-400"
                  required
                />
                <label htmlFor="cod_payment_confirmed" className="text-sm font-medium text-amber-800">
                  I confirm I received {formatCurrency(codAmount)} COD payment from {company?.name || "the company"}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trusted Company Notice */}
      {isTrusted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-700">
            ✓ <span className="font-medium">{company?.name || "Company"}</span> is a trusted company. No COD payment required.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Amount collected on delivery</label>
          <input
            type="number"
            name="amount_collected_on_delivery"
            defaultValue={defaults?.amount_collected_on_delivery ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Paid directly to company</label>
          <input
            type="number"
            name="amount_paid_directly_to_company"
            defaultValue={defaults?.amount_paid_directly_to_company ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Payment method</label>
          <select
            name="payment_method"
            defaultValue={defaults?.payment_method ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="certified_check">Certified check</option>
            <option value="customer_paid_directly_to_company">Customer paid company</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Payment notes</label>
          <input
            type="text"
            name="payment_method_notes"
            defaultValue={defaults?.payment_method_notes ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["extra_shuttle", "Shuttle (extra)"],
          ["extra_stairs", "Stairs (extra)"],
          ["extra_long_carry", "Long carry (extra)"],
          ["extra_packing", "Packing (extra)"],
          ["extra_bulky", "Bulky (extra)"],
          ["extra_other", "Other (extra)"],
        ].map(([key, label]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <input
              type="number"
              name={key}
              defaultValue={defaults?.[key] ?? ""}
              min={0}
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <PhotoField
        name="delivery_report_photo_url"
        label="Delivery report photo"
        defaultValue={defaults?.delivery_report_photo_url ?? ""}
        description="Upload delivery paperwork or proof photo."
      />

      {state?.error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      ) : null}
    </form>
  );
}

interface StorageFormProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function LoadStorageForm({ loadId, action, defaults }: StorageFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Storage drop / exception</h4>
          <p className="text-sm text-muted-foreground">
            Use when the company instructs a storage drop instead of customer delivery.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save storage info"}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="storage_drop" defaultChecked={Boolean(defaults?.storage_drop)} className="h-4 w-4" />
          Storage drop (skip customer delivery)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="company_approved_exception_delivery"
            defaultChecked={Boolean(defaults?.company_approved_exception_delivery)}
            className="h-4 w-4"
          />
          Company approved exception delivery
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Storage location name</label>
          <input
            type="text"
            name="storage_location_name"
            defaultValue={defaults?.storage_location_name ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Storage unit number</label>
          <input
            type="text"
            name="storage_unit_number"
            defaultValue={defaults?.storage_unit_number ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Storage address</label>
        <input
          type="text"
          name="storage_location_address"
          defaultValue={defaults?.storage_location_address ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Move-in fee</label>
          <input
            type="number"
            name="storage_move_in_fee"
            defaultValue={defaults?.storage_move_in_fee ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Daily fee</label>
          <input
            type="number"
            name="storage_daily_fee"
            defaultValue={defaults?.storage_daily_fee ?? ""}
            min={0}
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Days billed</label>
          <input
            type="number"
            name="storage_days_billed"
            defaultValue={defaults?.storage_days_billed ?? ""}
            min={0}
            step="1"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Notes</label>
        <textarea
          name="storage_notes"
          rows={2}
          defaultValue={defaults?.storage_notes ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {state?.error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      ) : null}
    </form>
  );
}

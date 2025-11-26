"use client";

import { useState } from "react";
import { useActionState } from "react";
import { CheckCircle, Truck, Camera, Package, Calendar, Warehouse } from "lucide-react";
import { PhotoField } from "@/components/ui/photo-field";
import type { DriverFormState } from "./driver-trip-forms";

type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ============================================================================
// ACCEPT LOAD CARD
// ============================================================================
interface AcceptLoadCardProps {
  loadId: string;
  action: ServerAction;
}

export function AcceptLoadCard({ loadId, action }: AcceptLoadCardProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 shadow-sm">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-full bg-primary/20 p-2">
          <CheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Accept Load</h4>
          <p className="text-sm text-muted-foreground">
            Review the load details above and accept to begin the loading process.
          </p>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Accepting..." : "Accept Load"}
      </button>
      {state?.error && (
        <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

// ============================================================================
// START LOADING CARD
// ============================================================================
interface StartLoadingCardProps {
  loadId: string;
  action: ServerAction;
}

export function StartLoadingCard({ loadId, action }: StartLoadingCardProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-purple-100 p-2">
          <Truck className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Start Loading</h4>
          <p className="text-sm text-muted-foreground">
            Record the current trailer capacity before loading this shipment.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Starting CUFT (current trailer capacity used)</label>
        <input
          type="number"
          name="starting_cuft"
          defaultValue={0}
          min={0}
          step="0.01"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="0 if empty trailer"
        />
        <p className="text-xs text-muted-foreground">Enter 0 if this is the first load on an empty trailer.</p>
      </div>

      <PhotoField
        name="loading_start_photo"
        label="Trailer photo BEFORE loading"
        description="Take a photo of the trailer before loading this shipment."
        required
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-purple-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start Loading"}
      </button>
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

// ============================================================================
// FINISH LOADING CARD
// ============================================================================
interface FinishLoadingCardProps {
  loadId: string;
  action: ServerAction;
  startingCuft?: number | null;
}

export function FinishLoadingCard({ loadId, action, startingCuft }: FinishLoadingCardProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [endingCuft, setEndingCuft] = useState<number>(0);
  const startCuft = Number(startingCuft) || 0;
  const calculatedActual = Math.max(0, endingCuft - startCuft);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-green-100 p-2">
          <Package className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Finish Loading</h4>
          <p className="text-sm text-muted-foreground">
            Record the total trailer capacity after loading.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <p className="text-muted-foreground">Started at: <span className="font-semibold text-foreground">{startCuft} CUFT</span></p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Ending CUFT (total trailer capacity used now)</label>
        <input
          type="number"
          name="ending_cuft"
          value={endingCuft || ""}
          onChange={(e) => setEndingCuft(Number(e.target.value) || 0)}
          min={0}
          step="0.01"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {endingCuft > 0 && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-sm text-emerald-700">
            Calculated actual: <span className="font-bold">{calculatedActual.toFixed(2)} CUFT</span>
          </p>
          <p className="text-xs text-emerald-600 mt-1">({endingCuft} - {startCuft} = {calculatedActual.toFixed(2)})</p>
        </div>
      )}

      <PhotoField
        name="loading_end_photo"
        label="Trailer photo AFTER loading"
        description="Take a photo of the trailer after loading this shipment."
        required
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Finishing..." : "Finish Loading"}
      </button>
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

// ============================================================================
// COMPLETE LOAD DETAILS CARD
// ============================================================================
interface CompleteLoadDetailsCardProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function CompleteLoadDetailsCard({ loadId, action, defaults }: CompleteLoadDetailsCardProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Complete Load Details</h4>
          <p className="text-sm text-muted-foreground">
            Capture contract values from the origin paperwork.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Actual CUFT loaded</label>
          <input
            type="number"
            name="actual_cuft_loaded"
            defaultValue={defaults?.actual_cuft_loaded ?? ""}
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
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            First available delivery date
          </label>
          <input
            type="date"
            name="first_available_date"
            defaultValue={defaults?.first_available_date ?? ""}
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Load Details"}
      </button>
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

// ============================================================================
// DELIVER LOAD CARD
// ============================================================================
interface DeliverLoadCardProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
  company?: { name: string; trust_level?: string } | null;
}

export function DeliverLoadCard({ loadId, action, defaults, company }: DeliverLoadCardProps) {
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
    <form action={formAction} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-100 p-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Deliver Load</h4>
          <p className="text-sm text-muted-foreground">
            Record delivery payments and any on-site extras.
          </p>
        </div>
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Mark Delivered"}
      </button>
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

// ============================================================================
// STORAGE DROP CARD (with conditional expansion)
// ============================================================================
interface StorageDropCardProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function StorageDropCard({ loadId, action, defaults }: StorageDropCardProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [isStorageDrop, setIsStorageDrop] = useState(defaults?.storage_drop || false);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-orange-100 p-2">
          <Warehouse className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Storage Drop / Exception</h4>
          <p className="text-sm text-muted-foreground">
            Use when the company instructs a storage drop instead of customer delivery.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            name="storage_drop"
            checked={isStorageDrop}
            onChange={(e) => setIsStorageDrop(e.target.checked)}
            className="h-4 w-4"
          />
          Storage drop (skip customer delivery)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            name="company_approved_exception_delivery"
            defaultChecked={Boolean(defaults?.company_approved_exception_delivery)}
            className="h-4 w-4"
          />
          Company approved exception delivery
        </label>
      </div>

      {/* Only show storage fields when storage_drop is checked */}
      {isStorageDrop && (
        <div className="space-y-4 pt-2 border-t border-border">
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
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md border border-border bg-background py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Storage Info"}
      </button>
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
      )}
    </form>
  );
}

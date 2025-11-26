"use client";

import { useState } from "react";
import { useActionState } from "react";
import { CheckCircle, Truck, Camera, Package, Calendar, Warehouse, MapPin, FileText, DollarSign } from "lucide-react";
import { PhotoField } from "@/components/ui/photo-field";
import { MultiPhotoField } from "@/components/ui/multi-photo-field";
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
  const [loadingReportPhoto, setLoadingReportPhoto] = useState(defaults?.loading_report_photo || "");
  const [originPaperworkPhotos, setOriginPaperworkPhotos] = useState<string[]>(defaults?.origin_paperwork_photos || []);

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

      {/* Separator */}
      <div className="border-t border-border pt-4">
        <h5 className="font-medium text-foreground mb-3">Loading Documents</h5>
      </div>

      {/* Loading Report - Single Photo */}
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
        <PhotoField
          name="loading_report_photo"
          label="Loading Report"
          description="Photo of the loading report from the company"
          defaultValue={loadingReportPhoto}
          onUploaded={setLoadingReportPhoto}
        />
      </div>

      {/* Origin Paperwork - Multiple Photos */}
      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
        <MultiPhotoField
          name="origin_paperwork_photos"
          label="Origin Paperwork"
          description="Bill of lading, inventory pages, and other origin documents"
          defaultValue={originPaperworkPhotos}
          onChange={setOriginPaperworkPhotos}
          maxPhotos={10}
        />
      </div>

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

// ============================================================================
// READY FOR DELIVERY CARD (status: loaded)
// ============================================================================
interface ReadyForDeliveryCardProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function ReadyForDeliveryCard({ loadId, action, defaults }: ReadyForDeliveryCardProps) {
  const [state, formAction, pending] = useActionState(action, null);

  const deliveryCity = defaults?.delivery_city || defaults?.dropoff_city || "—";
  const deliveryState = defaults?.delivery_state || defaults?.dropoff_state || "";
  const balanceDue = Number(defaults?.balance_due_on_delivery) || 0;
  const actualCuft = Number(defaults?.actual_cuft_loaded) || 0;

  return (
    <form action={formAction} className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4 shadow-sm space-y-4">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <MapPin className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Ready for Delivery</h4>
          <p className="text-sm text-muted-foreground">
            Loading complete with {actualCuft} CUFT. Start delivery when you arrive.
          </p>
        </div>
      </div>

      {/* Delivery destination */}
      <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Delivery Address</p>
            <p className="text-sm text-muted-foreground">
              {deliveryCity}{deliveryState ? `, ${deliveryState}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Balance due reminder */}
      {balanceDue > 0 && (
        <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Balance Due on Delivery</span>
            </div>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start Delivery"}
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
// COMPLETE DELIVERY CARD (status: in_transit)
// ============================================================================
interface CompleteDeliveryCardProps {
  loadId: string;
  action: ServerAction;
  defaults?: Record<string, any>;
}

export function CompleteDeliveryCard({ loadId, action, defaults }: CompleteDeliveryCardProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [deliveryPhoto, setDeliveryPhoto] = useState(defaults?.delivery_location_photo || "");
  const [signedBolPhotos, setSignedBolPhotos] = useState<string[]>(defaults?.signed_bol_photos || []);
  const [signedInventoryPhotos, setSignedInventoryPhotos] = useState<string[]>(defaults?.signed_inventory_photos || []);

  const balanceDue = Number(defaults?.balance_due_on_delivery) || 0;

  return (
    <form action={formAction} className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4 shadow-sm space-y-5">
      <input type="hidden" name="load_id" value={loadId} />
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-100 p-2">
          <FileText className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Complete Delivery</h4>
          <p className="text-sm text-muted-foreground">
            Upload signed documents and collect payment.
          </p>
        </div>
      </div>

      {/* SECTION 1: Delivery Photo */}
      <div className="space-y-3 p-3 bg-white/80 rounded-lg border border-emerald-100">
        <PhotoField
          name="delivery_location_photo"
          label="Delivery Location Photo"
          description="Photo showing delivery at customer location"
          defaultValue={deliveryPhoto}
          onUploaded={setDeliveryPhoto}
        />
      </div>

      {/* SECTION 2: Signed Documents */}
      <div className="space-y-4 p-3 bg-white/80 rounded-lg border border-emerald-100">
        <div>
          <h5 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Signed Documents
          </h5>
          <p className="text-sm text-muted-foreground mt-1">
            Required for billing - owner needs these immediately
          </p>
        </div>

        <MultiPhotoField
          name="signed_bol_photos"
          label="Signed Bill of Lading"
          description="All pages of the signed BOL"
          defaultValue={signedBolPhotos}
          onChange={setSignedBolPhotos}
          maxPhotos={10}
        />

        <MultiPhotoField
          name="signed_inventory_photos"
          label="Signed Inventory Pages"
          description="All signed inventory/packing list pages"
          defaultValue={signedInventoryPhotos}
          onChange={setSignedInventoryPhotos}
          maxPhotos={20}
        />
      </div>

      {/* SECTION 3: Payment Collection */}
      <div className="space-y-4 p-3 bg-white/80 rounded-lg border border-emerald-100">
        <div>
          <h5 className="font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Payment Collection
          </h5>
          <p className="text-sm text-muted-foreground mt-1">
            Balance due: <span className="font-medium text-foreground">{formatCurrency(balanceDue)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount Collected</label>
            <input
              type="number"
              name="collected_amount"
              defaultValue={balanceDue || ""}
              min={0}
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Payment Method</label>
            <select
              name="collection_method"
              defaultValue="cash"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="money_order">Money Order</option>
              <option value="card">Card</option>
              <option value="none">No Collection (Bill Company)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 4: Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Delivery Notes (optional)</label>
        <textarea
          name="delivery_notes"
          rows={2}
          defaultValue={defaults?.delivery_notes || ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Any notes about the delivery, damages, issues, etc."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Completing..." : "Complete Delivery"}
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
// DELIVERY COMPLETE CARD (status: delivered) - Read-only summary
// ============================================================================
interface DeliveryCompleteCardProps {
  defaults?: Record<string, any>;
}

export function DeliveryCompleteCard({ defaults }: DeliveryCompleteCardProps) {
  const deliveredAt = defaults?.delivery_finished_at
    ? new Date(defaults.delivery_finished_at).toLocaleString()
    : "—";
  const collected = Number(defaults?.collected_amount) || 0;
  const method = defaults?.collection_method || "—";
  const signedDocsCount =
    (defaults?.signed_bol_photos?.length || 0) +
    (defaults?.signed_inventory_photos?.length || 0);

  // Calculate Company Owes = Total Revenue - Collected
  const actualCuft = Number(defaults?.actual_cuft_loaded) || 0;
  const ratePerCuft = Number(defaults?.contract_rate_per_cuft || defaults?.rate_per_cuft) || 0;
  const baseRevenue = actualCuft * ratePerCuft;
  const contractTotal =
    (Number(defaults?.contract_accessorials_shuttle) || 0) +
    (Number(defaults?.contract_accessorials_stairs) || 0) +
    (Number(defaults?.contract_accessorials_long_carry) || 0) +
    (Number(defaults?.contract_accessorials_packing) || 0) +
    (Number(defaults?.contract_accessorials_bulky) || 0) +
    (Number(defaults?.contract_accessorials_other) || 0);
  const extraTotal =
    (Number(defaults?.extra_shuttle) || 0) +
    (Number(defaults?.extra_stairs) || 0) +
    (Number(defaults?.extra_long_carry) || 0) +
    (Number(defaults?.extra_packing) || 0) +
    (Number(defaults?.extra_bulky) || 0) +
    (Number(defaults?.extra_other) || 0);
  const storageTotal =
    (Number(defaults?.storage_move_in_fee) || 0) +
    (Number(defaults?.storage_daily_fee) || 0) * (Number(defaults?.storage_days_billed) || 0);
  const totalRevenue = baseRevenue + contractTotal + extraTotal + storageTotal;
  const companyOwes = totalRevenue - collected;

  return (
    <div className="rounded-lg border-2 border-green-300 bg-green-50/50 p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-green-200 p-2">
          <CheckCircle className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h4 className="font-semibold text-green-800">Delivery Complete</h4>
          <p className="text-sm text-green-700">
            This load has been successfully delivered.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Delivered</p>
          <p className="font-medium text-foreground">{deliveredAt}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Revenue</p>
          <p className="font-medium text-foreground">{formatCurrency(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Collected ({method.replace("_", " ")})</p>
          <p className="font-medium text-green-600">-{formatCurrency(collected)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Documents</p>
          <p className="font-medium text-foreground">{signedDocsCount} photos</p>
        </div>
      </div>

      {/* Company Owes - Highlighted */}
      <div className="flex justify-between items-center bg-white/80 p-3 rounded-lg border border-green-200">
        <span className="font-bold text-foreground">
          Company Owes{defaults?.company?.name ? ` (${defaults.company.name})` : ""}
        </span>
        <span className={`text-xl font-bold ${companyOwes >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatCurrency(companyOwes)}
        </span>
      </div>

      {defaults?.delivery_notes && (
        <div className="bg-white/80 p-3 rounded-lg border border-green-200">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-foreground">{defaults.delivery_notes}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";

import { PhotoField } from "@/components/ui/photo-field";
import type { DriverFormState } from "./driver-trip-forms";

type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

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
}

export function LoadDeliveryForm({ loadId, action, defaults }: DeliveryFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

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

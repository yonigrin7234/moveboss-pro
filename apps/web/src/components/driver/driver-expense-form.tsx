"use client";

import { useActionState } from "react";

import { PhotoField } from "@/components/ui/photo-field";
import type { DriverFormState } from "./driver-trip-forms";

type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

const expenseTypes = [
  "fuel",
  "tolls",
  "supplies",
  "repair",
  "scale",
  "parking",
  "food",
  "hotel",
  "wash",
  "oil_change",
  "parts",
  "truck_stop_fee",
  "other",
];

const paidByOptions = [
  { value: "driver_cash", label: "Driver Paid (Cash)" },
  { value: "driver_card", label: "Driver Paid (Card)" },
  { value: "company_card", label: "Company Card" },
  { value: "fuel_card", label: "Fuel Card" },
  { value: "efs_card", label: "EFS Card" },
  { value: "comdata", label: "Comdata" },
];

interface DriverExpenseFormProps {
  tripId: string;
  action: ServerAction;
}

export function DriverExpenseForm({ tripId, action }: DriverExpenseFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="trip_id" value={tripId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Add expense</h4>
          <p className="text-sm text-muted-foreground">Receipt photo is required for every expense.</p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save expense"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Amount</label>
          <input
            type="number"
            name="amount"
            min={0}
            step="0.01"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Expense type</label>
          <select
            name="expense_type"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue="fuel"
          >
            {expenseTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Paid by</label>
          <select
            name="paid_by"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {paidByOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Date</label>
          <input
            type="date"
            name="incurred_at"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Optional notes"
        />
      </div>

      <PhotoField
        name="receipt_photo_url"
        label="Receipt photo"
        required
        description="Snap a picture of the receipt. Camera opens automatically on mobile."
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

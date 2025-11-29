"use client";

import { useActionState } from "react";

import { PhotoField } from "@/components/ui/photo-field";

export type DriverFormState = { error?: string; success?: string };

type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

interface StartTripFormProps {
  tripId: string;
  action: ServerAction;
  defaultOdometerStart?: number | null;
  defaultPhoto?: string | null;
}

export function StartTripForm({ tripId, action, defaultOdometerStart, defaultPhoto }: StartTripFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="trip_id" value={tripId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Start trip</h4>
          <p className="text-sm text-muted-foreground">
            Required to move from planned to active. Starting odometer + photo is mandatory.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : "Start trip"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Odometer start</label>
          <input
            type="number"
            name="odometer_start"
            defaultValue={defaultOdometerStart ?? ""}
            required
            min={0}
            step="0.1"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <PhotoField
          name="odometer_start_photo_url"
          label="Odometer start photo"
          required
          defaultValue={defaultPhoto ?? ""}
          description="Take a clear photo of the odometer at trip start."
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

interface CompleteTripFormProps {
  tripId: string;
  action: ServerAction;
  defaultOdometerEnd?: number | null;
  defaultPhoto?: string | null;
}

export function CompleteTripForm({
  tripId,
  action,
  defaultOdometerEnd,
  defaultPhoto,
}: CompleteTripFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="trip_id" value={tripId} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-foreground">Complete trip</h4>
          <p className="text-sm text-muted-foreground">
            Set the ending odometer and photo to move the trip to completed. Actual miles will be calculated.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : "Complete trip"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Odometer end</label>
          <input
            type="number"
            name="odometer_end"
            defaultValue={defaultOdometerEnd ?? ""}
            required
            min={0}
            step="0.1"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <PhotoField
          name="odometer_end_photo_url"
          label="Odometer end photo"
          required
          defaultValue={defaultPhoto ?? ""}
          description="Take a clear photo of the odometer at trip end."
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

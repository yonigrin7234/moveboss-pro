"use client";

import { useState, useActionState } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoField } from "@/components/ui/photo-field";
import { cn } from "@/lib/utils";

export type DriverFormState = { error?: string; success?: string };
type ServerAction = (state: DriverFormState | null, formData: FormData) => Promise<DriverFormState | null>;

const statusTone: Record<string, string> = {
  planned: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  en_route: "bg-blue-100 text-blue-800",
  completed: "bg-slate-100 text-slate-800",
  settled: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

interface TripHeaderCompactProps {
  trip: {
    id: string;
    trip_number: string;
    status: string;
    origin_city?: string | null;
    origin_state?: string | null;
    destination_city?: string | null;
    destination_state?: string | null;
    odometer_start?: number | null;
    odometer_end?: number | null;
    odometer_start_photo_url?: string | null;
    odometer_end_photo_url?: string | null;
  };
  startTripAction: ServerAction;
  completeTripAction: ServerAction;
  canCompleteTrip: boolean;
}

function formatCityState(city?: string | null, state?: string | null) {
  if (!city && !state) return "Not set";
  return [city, state].filter(Boolean).join(", ");
}

export function TripHeaderCompact({
  trip,
  startTripAction,
  completeTripAction,
  canCompleteTrip,
}: TripHeaderCompactProps) {
  const [showOdometerForm, setShowOdometerForm] = useState(false);
  const [startState, startFormAction, startPending] = useActionState(startTripAction, null);
  const [completeState, completeFormAction, completePending] = useActionState(completeTripAction, null);

  // Calculate miles
  const miles = trip.odometer_start && trip.odometer_end
    ? trip.odometer_end - trip.odometer_start
    : null;

  // Determine what action is needed
  const needsStart = trip.status === "planned" && !trip.odometer_start;
  const needsEnd = (trip.status === "active" || trip.status === "en_route") && trip.odometer_start && !trip.odometer_end && canCompleteTrip;
  const tripCompleted = trip.status === "completed" || trip.status === "settled";

  // Button label based on state
  const getButtonLabel = () => {
    if (needsStart) return "Start Trip";
    if (needsEnd) return "End Trip";
    if (tripCompleted) return null; // Hide button
    return null;
  };

  const buttonLabel = getButtonLabel();

  return (
    <div className="space-y-3">
      {/* Trip Number + Status + Route */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Trip</p>
            <h1 className="text-2xl font-bold text-foreground">{trip.trip_number}</h1>
          </div>
          <Badge className={cn("text-xs font-semibold capitalize", statusTone[trip.status])}>
            {trip.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatCityState(trip.origin_city, trip.origin_state)} →{" "}
          {formatCityState(trip.destination_city, trip.destination_state)}
        </p>
      </div>

      {/* Odometer Compact Card */}
      <Card>
        <CardContent className="p-4">
          {/* Odometer Values Row */}
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Start</p>
              <p className="text-lg font-semibold flex items-center justify-center gap-1">
                {trip.odometer_start ? trip.odometer_start.toLocaleString() : "—"}
                {trip.odometer_start_photo_url && (
                  <Camera className="h-3 w-3 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">End</p>
              <p className="text-lg font-semibold flex items-center justify-center gap-1">
                {trip.odometer_end ? trip.odometer_end.toLocaleString() : "—"}
                {trip.odometer_end_photo_url && (
                  <Camera className="h-3 w-3 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Miles</p>
              <p className="text-lg font-semibold text-primary">
                {miles !== null ? miles.toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {/* Expandable Button + Form */}
          {buttonLabel && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowOdometerForm(!showOdometerForm)}
              >
                {showOdometerForm ? "Cancel" : buttonLabel}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-2 transition-transform",
                    showOdometerForm && "rotate-180"
                  )}
                />
              </Button>

              {showOdometerForm && (
                <div className="pt-4 space-y-4 border-t border-border mt-4">
                  {/* Start Trip Form */}
                  {needsStart && (
                    <form action={startFormAction} className="space-y-3">
                      <input type="hidden" name="trip_id" value={trip.id} />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Starting Odometer *
                        </label>
                        <input
                          type="number"
                          name="odometer_start"
                          required
                          min={0}
                          step="0.1"
                          placeholder="e.g., 50000"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <PhotoField
                        name="odometer_start_photo_url"
                        label="Odometer Photo *"
                        required
                        description="Take a clear photo of the odometer"
                      />
                      <Button type="submit" className="w-full" disabled={startPending}>
                        {startPending ? "Saving..." : "Start Trip"}
                      </Button>
                      {startState?.error && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {startState.error}
                        </div>
                      )}
                      {startState?.success && (
                        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {startState.success}
                        </div>
                      )}
                    </form>
                  )}

                  {/* End Trip Form */}
                  {needsEnd && (
                    <form action={completeFormAction} className="space-y-3">
                      <input type="hidden" name="trip_id" value={trip.id} />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Ending Odometer *
                        </label>
                        <input
                          type="number"
                          name="odometer_end"
                          required
                          min={0}
                          step="0.1"
                          placeholder="e.g., 55000"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <PhotoField
                        name="odometer_end_photo_url"
                        label="Odometer Photo *"
                        required
                        description="Take a clear photo of the odometer"
                      />
                      <Button type="submit" className="w-full" disabled={completePending}>
                        {completePending ? "Saving..." : "Complete Trip"}
                      </Button>
                      {completeState?.error && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {completeState.error}
                        </div>
                      )}
                      {completeState?.success && (
                        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {completeState.success}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

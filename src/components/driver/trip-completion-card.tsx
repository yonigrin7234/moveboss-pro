"use client";

import { useActionState } from "react";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TripCompletionCheck, TripTotals } from "@/data/driver-workflow";

type ServerAction = (state: { error?: string; success?: string } | null, formData: FormData) => Promise<{ error?: string; success?: string } | null>;

interface TripCompletionCardProps {
  tripId: string;
  tripStatus: string;
  completionCheck: TripCompletionCheck;
  tripTotals: TripTotals;
  completeTripAction: ServerAction;
}

export function TripCompletionCard({
  tripId,
  tripStatus,
  completionCheck,
  tripTotals,
  completeTripAction,
}: TripCompletionCardProps) {
  const [state, formAction, pending] = useActionState(completeTripAction, null);

  const isActive = tripStatus === "active" || tripStatus === "en_route";
  const { canComplete, totalLoads, deliveredLoads, pendingLoads, hasOdometerEnd, reason } = completionCheck;

  // Don't render if trip is not active
  if (!isActive) return null;

  // Show progress bar if not all loads delivered
  if (!canComplete && totalLoads > 0 && deliveredLoads < totalLoads) {
    const progressPercent = totalLoads > 0 ? (deliveredLoads / totalLoads) * 100 : 0;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Trip Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-muted rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm font-medium whitespace-nowrap">
              {deliveredLoads} / {totalLoads} delivered
            </p>
          </div>

          {pendingLoads.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pending deliveries:</p>
              <ul className="text-sm space-y-1">
                {pendingLoads.map((load) => (
                  <li key={load.loadId} className="flex items-center gap-2">
                    <span className="text-yellow-500">○</span>
                    <span className="font-medium">{load.loadNumber}</span>
                    {load.destinationCity && (
                      <span className="text-muted-foreground">
                        - {load.destinationCity}
                        {load.destinationState ? `, ${load.destinationState}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">({load.status.replace("_", " ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show "enter odometer" warning if all loads delivered but no odometer end
  if (deliveredLoads === totalLoads && !hasOdometerEnd) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            Almost Ready to Complete
          </CardTitle>
          <CardDescription>
            All {totalLoads} loads delivered! Enter odometer end reading to complete the trip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 font-medium">
              Enter your ending odometer reading in the trip header above to enable trip completion.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show ready to complete card
  if (canComplete) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Ready to Complete Trip
          </CardTitle>
          <CardDescription>
            All {totalLoads} load{totalLoads !== 1 ? "s" : ""} delivered. Complete the trip to finalize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trip Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-foreground">Trip Summary</h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Miles</p>
                <p className="font-semibold text-lg text-foreground">
                  {tripTotals.actualMiles > 0 ? tripTotals.actualMiles.toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Cubic Feet</p>
                <p className="font-semibold text-lg text-foreground">
                  {tripTotals.totalCuft > 0 ? tripTotals.totalCuft.toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-semibold">${tripTotals.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Collected</p>
                <p className="font-semibold text-green-600">${tripTotals.totalCollected.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Expenses</p>
                <p className="font-semibold">${tripTotals.totalExpenses.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Driver Paid (Reimburse)</p>
                <p className="font-semibold text-green-600">${tripTotals.driverPaidExpenses.toFixed(2)}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <p className="font-medium text-foreground">Receivables (Company Owes)</p>
              <p className={`font-bold text-lg ${tripTotals.receivables >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${tripTotals.receivables.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Completion Form */}
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="trip_id" value={tripId} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Completion Notes (optional)</label>
              <textarea
                name="completion_notes"
                placeholder="Any final notes about the trip..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {state?.error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            {state?.success && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle className="h-5 w-5" />
              {pending ? "Completing Trip..." : "Complete Trip"}
            </button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Show reason why trip can't be completed
  if (reason) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Trip Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}

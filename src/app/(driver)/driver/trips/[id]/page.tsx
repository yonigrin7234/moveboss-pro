import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Package, DollarSign, MapPin, Target } from "lucide-react";

import {
  driverStartTrip,
  getDriverDbClientForActions,
  getDriverTripDetail,
  requireCurrentDriver,
} from "@/data/driver-workflow";
import { updateTrip } from "@/data/trips";
import { TripHeaderCompact, type DriverFormState } from "@/components/driver/trip-header-compact";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DriverTripDetailPageProps {
  params: Promise<{ id: string }>;
}

const loadStatusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  loading: "bg-purple-100 text-purple-800",
  loaded: "bg-green-100 text-green-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  storage_completed: "bg-purple-100 text-purple-800",
};

export default async function DriverTripDetailPage({ params }: DriverTripDetailPageProps) {
  const { id } = await params;
  let driver: Awaited<ReturnType<typeof requireCurrentDriver>> | null = null;
  try {
    driver = await requireCurrentDriver();
  } catch (error) {
    console.error("[DriverTripDetailPage] Failed to load current driver", error);
    notFound();
  }
  if (!driver?.owner_id) {
    notFound();
  }

  let detail: Awaited<ReturnType<typeof getDriverTripDetail>> | null = null;
  try {
    detail = await getDriverTripDetail(id, { id: driver.id, owner_id: driver.owner_id });
  } catch (error) {
    console.error("[DriverTripDetailPage] Failed to load trip detail", error);
    detail = null;
  }
  if (!detail?.trip) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Trip unavailable</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this trip. It may be missing, you may not have access, or there was a temporary
          error. Please try again or return to your trips list.
        </p>
        <Link
          href="/driver/trips"
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Back to trips
        </Link>
      </div>
    );
  }

  const { trip, loads, expenses } = detail;
  const loadsCompleted =
    loads.length === 0 ||
    loads.every(
      (tl) =>
        (tl.load as any)?.load_status === "delivered" || (tl.load as any)?.load_status === "storage_completed"
    );

  const expenseTotal = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const startTripAction = async (prevState: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const tripId = formData.get("trip_id");
      const odometerStart = Number(formData.get("odometer_start"));
      const photoUrl = formData.get("odometer_start_photo_url");
      if (typeof tripId !== "string") return { error: "Missing trip" };
      const tripCheck = await getDriverTripDetail(tripId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!tripCheck?.trip) return { error: "Trip not found" };
      if (!Number.isFinite(odometerStart) || odometerStart <= 0) {
        return { error: "Starting odometer is required" };
      }
      if (typeof photoUrl !== "string" || photoUrl.length === 0) {
        return { error: "Odometer start photo is required" };
      }

      await driverStartTrip(tripId, currentDriver.owner_id, {
        odometer_start: odometerStart,
        odometer_start_photo_url: photoUrl,
        driver_id: currentDriver.id,
      });

      revalidatePath(`/driver/trips/${tripId}`);
      revalidatePath("/driver");
      return { success: "Trip activated" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to start trip" };
    }
  };

  const completeTripAction = async (prevState: DriverFormState | null, formData: FormData) => {
    "use server";
    try {
      const currentDriver = await requireCurrentDriver();
      if (!currentDriver?.owner_id) return { error: "Not authorized" };
      const tripId = formData.get("trip_id");
      const odometerEnd = Number(formData.get("odometer_end"));
      const photoUrl = formData.get("odometer_end_photo_url");
      if (typeof tripId !== "string") return { error: "Missing trip" };
      const tripCheck = await getDriverTripDetail(tripId, {
        id: currentDriver.id,
        owner_id: currentDriver.owner_id,
      });
      if (!tripCheck?.trip) return { error: "Trip not found" };
      if (!Number.isFinite(odometerEnd) || odometerEnd <= 0) {
        return { error: "Ending odometer is required" };
      }
      if (typeof photoUrl !== "string" || photoUrl.length === 0) {
        return { error: "Odometer end photo is required" };
      }

      const supabase = await getDriverDbClientForActions();
      await updateTrip(
        tripId,
        {
          status: "completed",
          odometer_end: odometerEnd,
          odometer_end_photo_url: photoUrl,
        } as any,
        currentDriver.owner_id,
        supabase
      );

      revalidatePath(`/driver/trips/${tripId}`);
      revalidatePath("/driver");
      return { success: "Trip completed" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to complete trip" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Trip Header with Odometer */}
      <TripHeaderCompact
        trip={{
          id: trip.id,
          trip_number: trip.trip_number,
          status: trip.status,
          origin_city: (trip as any).origin_city,
          origin_state: (trip as any).origin_state,
          destination_city: (trip as any).destination_city,
          destination_state: (trip as any).destination_state,
          odometer_start: trip.odometer_start,
          odometer_end: trip.odometer_end,
          odometer_start_photo_url: trip.odometer_start_photo_url,
          odometer_end_photo_url: trip.odometer_end_photo_url,
        }}
        truck={(trip as any).truck}
        trailer={(trip as any).trailer}
        startTripAction={startTripAction}
        completeTripAction={completeTripAction}
        canCompleteTrip={loadsCompleted}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Loads</h3>
          <Link href={`/driver/trips/${trip.id}/expenses`} className="text-sm text-primary hover:underline">
            Expenses
          </Link>
        </div>
        <div className="grid gap-3">
          {loads.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No loads attached to this trip yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Your dispatcher will assign loads to this trip.</p>
              </CardContent>
            </Card>
          ) : (
            loads.map((tl, index) => {
              const load = tl.load as any;
              const company = Array.isArray(load?.company) ? load.company[0] : load?.company;
              const loadStatus = load?.load_status || "pending";
              const loadOrder = (tl as any).load_order ?? (tl as any).sequence_index ?? index + 1;

              // Build location strings
              const pickupLocation = [
                load?.loading_city || load?.pickup_city || load?.origin_city,
                load?.loading_state || load?.pickup_state || load?.origin_state,
                load?.loading_postal_code || load?.pickup_postal_code || load?.origin_zip,
              ].filter(Boolean).join(", ") || "Not set";

              const deliveryLocation = [
                load?.delivery_city || load?.dropoff_city || load?.destination_city,
                load?.delivery_state || load?.dropoff_state || load?.destination_state,
                load?.delivery_postal_code || load?.dropoff_postal_code || load?.destination_zip,
              ].filter(Boolean).join(", ") || "Not set";

              return (
                <Link key={tl.id} href={`/driver/trips/${trip.id}/loads/${tl.load_id}`}>
                  <Card className="transition hover:border-primary/60">
                    <CardContent className="p-4 space-y-3">
                      {/* Header: Load order badge + Status badge */}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Load #{loadOrder}
                        </Badge>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${loadStatusTone[loadStatus] || "bg-gray-100 text-gray-800"}`}>
                          {loadStatus.replace("_", " ")}
                        </span>
                      </div>

                      {/* Load number and company */}
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">{load?.load_number || tl.load_id}</h4>
                        <p className="text-sm text-muted-foreground">{company?.name || "Company n/a"}</p>
                      </div>

                      {/* Locations */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-muted-foreground">Pickup:</span>
                          <span className="font-medium truncate">{pickupLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">Deliver:</span>
                          <span className="font-medium truncate">{deliveryLocation}</span>
                        </div>
                      </div>

                      {/* CUFT and Rate */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Est:</span>
                          <span className="font-medium">
                            {load?.cubic_feet ? Number(load.cubic_feet).toLocaleString() : "—"} cf
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Rate:</span>
                          <span className="font-medium">
                            {load?.rate_per_cuft ? `$${Number(load.rate_per_cuft).toFixed(2)}` : "—"}/cf
                          </span>
                        </div>
                      </div>

                      {/* Actual CUFT if loaded */}
                      {load?.actual_cuft_loaded != null && (
                        <div className="border-t border-border pt-2 flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Actual:</span>
                          <span className="font-semibold text-green-600">
                            {Number(load.actual_cuft_loaded).toLocaleString()} cf
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Expenses</p>
            <h3 className="text-lg font-semibold text-foreground">
              {expenses.length} expense{expenses.length === 1 ? "" : "s"}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Total</p>
            <p className="text-lg font-semibold text-foreground">${expenseTotal.toFixed(2)}</p>
          </div>
        </div>
        <Link
          href={`/driver/trips/${trip.id}/expenses`}
          className="mt-3 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Manage expenses
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  driverStartTrip,
  getDriverDbClientForActions,
  getDriverTripDetail,
  requireCurrentDriver,
} from "@/data/driver-workflow";
import { updateTrip } from "@/data/trips";
import { CompleteTripForm, StartTripForm, type DriverFormState } from "@/components/driver/driver-trip-forms";

interface DriverTripDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusTone: Record<string, string> = {
  planned: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  en_route: "bg-blue-100 text-blue-800",
  completed: "bg-slate-100 text-slate-800",
  settled: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatCityState(city?: string | null, state?: string | null) {
  if (!city && !state) return "Not set";
  return [city, state].filter(Boolean).join(", ");
}

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
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Trip</p>
            <h1 className="text-2xl font-semibold text-foreground">{trip.trip_number}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[trip.status]}`}>
            {trip.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatCityState((trip as any).origin_city, (trip as any).origin_state)} →{" "}
          {formatCityState((trip as any).destination_city, (trip as any).destination_state)}
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs uppercase text-muted-foreground">Odometer start</p>
            <p className="text-base font-semibold text-foreground">
              {trip.odometer_start ?? "—"} {trip.odometer_start_photo_url ? "📷" : ""}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs uppercase text-muted-foreground">Odometer end</p>
            <p className="text-base font-semibold text-foreground">
              {trip.odometer_end ?? "—"} {trip.odometer_end_photo_url ? "📷" : ""}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs uppercase text-muted-foreground">Actual miles</p>
            <p className="text-base font-semibold text-foreground">{trip.actual_miles ?? "—"}</p>
          </div>
        </div>
      </div>

      {trip.status === "planned" ? (
        <StartTripForm
          tripId={trip.id}
          action={startTripAction}
          defaultOdometerStart={(trip as any).odometer_start}
          defaultPhoto={(trip as any).odometer_start_photo_url}
        />
      ) : null}

      {(trip.status === "active" || trip.status === "en_route") && loadsCompleted ? (
        <CompleteTripForm
          tripId={trip.id}
          action={completeTripAction}
          defaultOdometerEnd={(trip as any).odometer_end}
          defaultPhoto={(trip as any).odometer_end_photo_url}
        />
      ) : null}

      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Loads</h3>
          <Link href={`/driver/trips/${trip.id}/expenses`} className="text-sm text-primary hover:underline">
            Expenses
          </Link>
        </div>
        <div className="grid gap-3">
          {loads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              No loads attached to this trip yet.
            </div>
          ) : (
            loads.map((tl) => {
              const load = tl.load as any;
              const company = Array.isArray(load?.company) ? load.company[0] : load?.company;
              return (
                <Link
                  key={tl.id}
                  href={`/driver/trips/${trip.id}/loads/${tl.load_id}`}
                  className="rounded-lg border border-border bg-background p-3 transition hover:border-primary/60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Load</p>
                      <h4 className="text-base font-semibold text-foreground">{load?.load_number || tl.load_id}</h4>
                      <p className="text-sm text-muted-foreground">{company?.name || "Company n/a"}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {load?.load_status || "pending"}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        CUFT: {load?.actual_cuft_loaded ?? "—"}
                      </p>
                    </div>
                  </div>
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

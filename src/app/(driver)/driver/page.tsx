import Link from "next/link";
import { notFound } from "next/navigation";

import { DriverQuickActions } from "@/components/driver/driver-quick-actions";
import { getDriverTripsForDriver, requireCurrentDriver } from "@/data/driver-workflow";

const statusBadge: Record<string, string> = {
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

export default async function DriverHomePage() {
  let driver: Awaited<ReturnType<typeof requireCurrentDriver>> | null = null;
  try {
    driver = await requireCurrentDriver();
  } catch (error) {
    console.error("[DriverHomePage] Failed to load current driver", error);
    notFound();
  }
  if (!driver?.owner_id) {
    notFound();
  }

  const trips = await getDriverTripsForDriver(driver.id, driver.owner_id);
  const activeTrip = trips.find((t) => t.status === "active" || t.status === "en_route");
  const upcoming = trips.filter((t) => t.status === "planned");
  const recent = trips
    .filter((t) => t.status === "completed" || t.status === "settled")
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

  const driverName = [driver.first_name, driver.last_name].filter(Boolean).join(" ") || "Driver";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-foreground">Welcome back, {driverName}</h2>
          <p className="text-sm text-muted-foreground">
            Manage your trips, capture odometer photos, and keep expenses up to date. All changes stay within
            your owner&apos;s rules and settlement engine.
          </p>
        </div>
      </div>

      <DriverQuickActions activeTripId={activeTrip?.id} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Active Trip</h3>
          {activeTrip ? (
            <Link href={`/driver/trips/${activeTrip.id}`} className="text-primary text-sm hover:underline">
              Open trip
            </Link>
          ) : null}
        </div>
        {activeTrip ? (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trip</p>
                <h4 className="text-lg font-semibold text-foreground">{activeTrip.trip_number}</h4>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[activeTrip.status]}`}>
                {activeTrip.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCityState(activeTrip.origin_city as any, activeTrip.origin_state as any)} →{" "}
              {formatCityState(activeTrip.destination_city as any, activeTrip.destination_state as any)}
            </p>
            <p className="text-xs text-muted-foreground">
              Miles: {activeTrip.actual_miles ?? "—"} | Odometer: {activeTrip.odometer_start ?? "—"} →{" "}
              {activeTrip.odometer_end ?? "—"}
            </p>
            <div className="pt-2">
              <Link
                href={`/driver/trips/${activeTrip.id}`}
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Continue trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No active trip. Start your next planned trip from the list below.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Upcoming trips</h3>
          <Link href="/driver/trips" className="text-primary text-sm hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              No planned trips yet.
            </div>
          ) : (
            upcoming.map((trip) => (
              <Link
                key={trip.id}
                href={`/driver/trips/${trip.id}`}
                className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/60"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-foreground">{trip.trip_number}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[trip.status]}`}>
                    {trip.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCityState(trip.origin_city as any, trip.origin_state as any)} →{" "}
                  {formatCityState(trip.destination_city as any, trip.destination_state as any)}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Recent trips</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {recent.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              No completed trips yet.
            </div>
          ) : (
            recent.slice(0, 4).map((trip) => (
              <Link
                key={trip.id}
                href={`/driver/trips/${trip.id}`}
                className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Trip</p>
                    <h4 className="text-base font-semibold text-foreground">{trip.trip_number}</h4>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[trip.status]}`}>
                    {trip.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCityState(trip.origin_city as any, trip.origin_state as any)} →{" "}
                  {formatCityState(trip.destination_city as any, trip.destination_state as any)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Miles: {trip.actual_miles ?? "—"} · Updated {new Date(trip.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

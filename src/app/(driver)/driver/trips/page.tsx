import Link from "next/link";
import { notFound } from "next/navigation";

import { getDriverTripsForDriver, requireCurrentDriver } from "@/data/driver-workflow";

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

export default async function DriverTripsPage() {
  let driver: Awaited<ReturnType<typeof requireCurrentDriver>> | null = null;
  try {
    driver = await requireCurrentDriver();
  } catch (error) {
    console.error("[DriverTripsPage] Failed to load current driver", error);
    notFound();
  }
  if (!driver?.owner_id) notFound();

  const trips = await getDriverTripsForDriver(driver.id, driver.owner_id);
  const sorted = [...trips].sort((a, b) => {
    const priority = (status: string) => {
      if (status === "active" || status === "en_route") return 0;
      if (status === "planned") return 1;
      if (status === "completed" || status === "settled") return 2;
      return 3;
    };
    const pDiff = priority(a.status) - priority(b.status);
    if (pDiff !== 0) return pDiff;
    return (b.updated_at || "").localeCompare(a.updated_at || "");
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-foreground">Your trips</h2>
        <p className="text-sm text-muted-foreground">Only trips assigned to you are shown here.</p>
      </div>

      <div className="grid gap-3">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            No trips yet.
          </div>
        ) : (
          sorted.map((trip) => (
            <Link
              key={trip.id}
              href={`/driver/trips/${trip.id}`}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Trip</p>
                  <h3 className="text-lg font-semibold text-foreground">{trip.trip_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCityState(trip.origin_city as any, trip.origin_state as any)} →{" "}
                    {formatCityState(trip.destination_city as any, trip.destination_state as any)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[trip.status]}`}>
                    {trip.status.replace("_", " ")}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">
                    Miles: {trip.actual_miles ?? "—"}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

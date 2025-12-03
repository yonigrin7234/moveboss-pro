import Link from 'next/link';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';

export interface UnassignedLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate: string;
  cubicFeet: number;
  value: number;
}

interface UnassignedLoadsProps {
  loads: UnassignedLoad[];
}

function getUrgency(pickupDate: string): 'critical' | 'urgent' | 'normal' {
  const pickup = new Date(pickupDate);
  const now = new Date();
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 24) return 'critical'; // Today
  if (hoursUntil < 48) return 'urgent'; // Tomorrow
  return 'normal';
}

function formatPickup(pickupDate: string): string {
  const pickup = new Date(pickupDate);
  const now = new Date();
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 24) return 'PICKUP TODAY';
  if (hoursUntil < 48) return 'Tomorrow';
  return pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UnassignedLoads({ loads }: UnassignedLoadsProps) {
  if (loads.length === 0) return null;

  // Sort by urgency
  const sorted = [...loads].sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, normal: 2 };
    const aUrg = getUrgency(a.pickupDate);
    const bUrg = getUrgency(b.pickupDate);
    if (urgencyOrder[aUrg] !== urgencyOrder[bUrg]) {
      return urgencyOrder[aUrg] - urgencyOrder[bUrg];
    }
    return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          UNASSIGNED LOADS
        </h2>
        <Link
          href="/dashboard/assigned-loads?filter=unassigned"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all ({loads.length}) →
        </Link>
      </div>

      <div className="space-y-2">
        {sorted.slice(0, 5).map((load) => {
          const urgency = getUrgency(load.pickupDate);
          const pickupLabel = formatPickup(load.pickupDate);

          const bgClass =
            urgency === 'critical'
              ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
              : urgency === 'urgent'
              ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
              : 'bg-card border-border/50 hover:bg-muted/30';

          const badgeClass =
            urgency === 'critical'
              ? 'bg-red-500/20 text-red-700 border-red-500/30'
              : urgency === 'urgent'
              ? 'bg-amber-500/20 text-amber-700 border-amber-500/30'
              : 'bg-muted text-foreground border-border';

          return (
            <Link
              key={load.id}
              href={`/dashboard/assigned-loads/${load.id}`}
              className={`block p-4 rounded-lg border transition-all group ${bgClass}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Pickup Date Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold ${badgeClass}`}
                  >
                    <Calendar className="h-3 w-3" />
                    {pickupLabel}
                  </span>

                  {/* Route */}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{load.origin}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium truncate">{load.destination}</span>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{load.cubicFeet} CF</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">
                      ${load.value.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>Assign</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

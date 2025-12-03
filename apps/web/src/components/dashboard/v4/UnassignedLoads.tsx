import Link from 'next/link';
import { Truck } from 'lucide-react';

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

  if (hoursUntil < 24) return 'critical';
  if (hoursUntil < 48) return 'urgent';
  return 'normal';
}

function formatPickup(pickupDate: string): string {
  const pickup = new Date(pickupDate);
  const now = new Date();
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 24) return 'TODAY';
  if (hoursUntil < 48) return 'Tomorrow';
  return pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UnassignedLoads({ loads }: UnassignedLoadsProps) {
  if (loads.length === 0) return null;

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
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
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

      {/* Apple Reminders style - compact vertical list */}
      <div className="space-y-1">
        {sorted.slice(0, 6).map((load) => {
          const urgency = getUrgency(load.pickupDate);
          const pickupLabel = formatPickup(load.pickupDate);
          const borderColor = urgency === 'critical' ? 'border-red-500/50' : urgency === 'urgent' ? 'border-amber-500/50' : 'border-border/30';
          const textColor = urgency === 'critical' ? 'text-red-700' : urgency === 'urgent' ? 'text-amber-700' : 'text-foreground';

          return (
            <Link
              key={load.id}
              href={`/dashboard/assigned-loads/${load.id}`}
              className={`flex items-center gap-3 px-3 py-2 rounded border-l-2 ${borderColor} bg-white hover:shadow-md transition-all duration-150 group`}
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className={`text-sm font-medium truncate ${textColor}`}>{load.origin}</span>
                <span className="text-muted-foreground">→</span>
                <span className={`text-sm font-medium truncate ${textColor}`}>{load.destination}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="text-xs text-muted-foreground min-w-[50px] text-right">{pickupLabel}</span>
                <span className="flex items-center gap-1"><Truck className="h-5 w-5" />{load.cubicFeet} CF</span>
                <span className="font-semibold text-foreground min-w-[60px] text-right">${load.value.toLocaleString()}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

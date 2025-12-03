import Link from 'next/link';
import { MapPin, Calendar, Truck } from 'lucide-react';

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
    <div className="space-y-3">
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

      <div className="space-y-1.5">
        {sorted.slice(0, 6).map((load) => {
          const urgency = getUrgency(load.pickupDate);
          const pickupLabel = formatPickup(load.pickupDate);
          const dotColor = urgency === 'critical' ? 'bg-red-500' : urgency === 'urgent' ? 'bg-amber-500' : 'bg-slate-300';

          return (
            <Link
              key={load.id}
              href={`/dashboard/assigned-loads/${load.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white border border-border/20 hover:border-border/40 hover:shadow-sm transition-all duration-150 group"
            >
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
              <span className="text-xs font-semibold text-muted-foreground min-w-[60px]">{pickupLabel}</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{load.origin}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm font-medium truncate">{load.destination}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{load.cubicFeet} CF</span>
                <span className="font-semibold text-foreground">\${load.value.toLocaleString()}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

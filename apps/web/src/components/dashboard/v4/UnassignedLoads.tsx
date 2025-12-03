import Link from 'next/link';
import { MapPin, Calendar, Truck, DollarSign } from 'lucide-react';

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

  if (hoursUntil < 24) return 'Today';
  if (hoursUntil < 48) return 'Tomorrow';
  return pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UnassignedLoads({ loads }: UnassignedLoadsProps) {
  if (loads.length === 0) {
    return (
      <div className="bg-white border border-border/40 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Unassigned Loads</h2>
        <p className="text-sm text-muted-foreground">All loads are assigned. Great work!</p>
      </div>
    );
  }

  const sorted = [...loads].sort((a, b) => {
    const urgencyOrder = { critical: 0, urgent: 1, normal: 2 };
    const aUrg = getUrgency(a.pickupDate);
    const bUrg = getUrgency(b.pickupDate);
    if (urgencyOrder[aUrg] !== urgencyOrder[bUrg]) {
      return urgencyOrder[aUrg] - urgencyOrder[bUrg];
    }
    return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
  });

  const criticalCount = sorted.filter(l => getUrgency(l.pickupDate) === 'critical').length;

  return (
    <div className="bg-white border border-border/40 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Unassigned Loads</h2>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              {criticalCount} urgent
            </span>
          )}
        </div>
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
          const urgencyStyles = {
            critical: 'border-l-red-500 bg-red-50/30',
            urgent: 'border-l-amber-500 bg-amber-50/30',
            normal: 'border-l-border bg-white',
          };

          return (
            <Link
              key={load.id}
              href={`/dashboard/assigned-loads/${load.id}`}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg border-l-4 ${urgencyStyles[urgency]} hover:shadow-md transition-all duration-150 group`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">{load.origin}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-semibold text-foreground truncate">{load.destination}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className={urgency === 'critical' ? 'font-semibold text-red-700' : urgency === 'urgent' ? 'font-semibold text-amber-700' : ''}>
                      {pickupLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    <span>{load.cubicFeet} CF</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">${load.value.toLocaleString()}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

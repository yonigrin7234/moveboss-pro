import Link from 'next/link';
import { MapPin, Calendar, Truck, ArrowRight } from 'lucide-react';

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
      <div className="bg-white rounded-lg border border-gray-200/80 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Unassigned Loads</h2>
        <p className="text-sm text-gray-500">All loads are assigned.</p>
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
    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Unassigned Loads</h2>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
              {criticalCount} urgent
            </span>
          )}
        </div>
        <Link
          href="/dashboard/assigned-loads?filter=unassigned"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          View all ({loads.length})
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {sorted.slice(0, 4).map((load) => {
          const urgency = getUrgency(load.pickupDate);
          const pickupLabel = formatPickup(load.pickupDate);

          return (
            <Link
              key={load.id}
              href={`/dashboard/assigned-loads/${load.id}`}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${
                urgency === 'critical' ? 'border-l-2 border-l-red-500' :
                urgency === 'urgent' ? 'border-l-2 border-l-amber-400' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">{load.origin}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-900 truncate">{load.destination}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className={`flex items-center gap-1 ${
                    urgency === 'critical' ? 'font-semibold text-red-600' :
                    urgency === 'urgent' ? 'font-semibold text-amber-600' : ''
                  }`}>
                    <Calendar className="h-3 w-3" />
                    {pickupLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {load.cubicFeet} CF
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ${load.value.toLocaleString()}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

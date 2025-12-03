import Link from 'next/link';
import { Package, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardMode } from '@/lib/dashboardMode';

export interface UnassignedLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate: string; // ISO format
  cubicFeet: number;
  value: number;
  isUrgent: boolean; // Pickup within 48hrs
  isCritical: boolean; // Pickup TODAY
}

interface UnassignedLoadsProps {
  loads: UnassignedLoad[];
  mode: DashboardMode;
}

function getUrgencyLevel(pickupDate: string) {
  const pickup = new Date(pickupDate);
  const now = new Date();
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 24) return 'critical'; // Today
  if (hoursUntil < 48) return 'urgent'; // Within 48hrs
  return 'normal';
}

function formatPickupDate(pickupDate: string) {
  const pickup = new Date(pickupDate);
  const now = new Date();
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 'OVERDUE';
  if (hoursUntil < 24) return 'PICKUP TODAY';
  if (hoursUntil < 48) return 'Tomorrow';

  // Format as "Mon, Dec 3"
  return pickup.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function UnassignedLoads({ loads, mode }: UnassignedLoadsProps) {
  // Sort by urgency (critical first, then urgent, then by pickup date)
  const sortedLoads = [...loads].sort((a, b) => {
    const aUrgency = getUrgencyLevel(a.pickupDate);
    const bUrgency = getUrgencyLevel(b.pickupDate);

    const urgencyOrder = { critical: 0, urgent: 1, normal: 2 };
    if (urgencyOrder[aUrgency] !== urgencyOrder[bUrgency]) {
      return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    }

    // Same urgency - sort by pickup date (earliest first)
    return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
  });

  // Only show first 5 loads
  const displayedLoads = sortedLoads.slice(0, 5);
  const hasMore = loads.length > 5;

  if (loads.length === 0) {
    return null; // Don't show section if no unassigned loads
  }

  return (
    <Card className="rounded-2xl shadow-md border-border/30">
      <CardHeader className="py-4 px-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Unassigned Loads</h2>
              <p className="text-xs text-muted-foreground">Need driver assignment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm h-6 px-2">
              {loads.length}
            </Badge>
            <Link
              href="/dashboard/assigned-loads?filter=unassigned"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {displayedLoads.map((load) => {
            const urgency = getUrgencyLevel(load.pickupDate);
            const pickupLabel = formatPickupDate(load.pickupDate);

            return (
              <Link
                key={load.id}
                href={`/dashboard/assigned-loads/${load.id}`}
                className={`block p-4 rounded-xl border transition-all hover:shadow-md ${
                  urgency === 'critical'
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : urgency === 'urgent'
                    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'bg-card border-border/50 hover:bg-accent/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Pickup Date with Urgency Badge */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={urgency === 'critical' ? 'destructive' : urgency === 'urgent' ? 'warning' : 'secondary'}
                        className="text-xs font-semibold"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {pickupLabel}
                      </Badge>
                      {urgency === 'critical' && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          URGENT
                        </span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">{load.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-foreground truncate">{load.destination}</span>
                      </div>
                    </div>

                    {/* Load Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium">{load.cubicFeet} CF</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        ${load.value.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Arrow */}
                  <div className={`text-sm font-semibold ${
                    urgency === 'critical' ? 'text-red-700' :
                    urgency === 'urgent' ? 'text-amber-700' :
                    'text-primary'
                  }`}>
                    Assign →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-4 text-center">
            <Link
              href="/dashboard/assigned-loads?filter=unassigned"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              +{loads.length - 5} more unassigned loads
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

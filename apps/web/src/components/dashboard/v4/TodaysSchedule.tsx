import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';

export interface ScheduleEvent {
  id: string;
  time: string;
  type: 'pickup' | 'delivery';
  location: string;
  driver: string;
  loadId: string;
}

interface TodaysScheduleProps {
  events: ScheduleEvent[];
}

export function TodaysSchedule({ events }: TodaysScheduleProps) {
  if (events.length === 0) return null;

  const pickups = events.filter(e => e.type === 'pickup');
  const deliveries = events.filter(e => e.type === 'delivery');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pickups Slot */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Today's Pickups</h3>
        {pickups.length === 0 ? (
          <div className="p-6 rounded-xl border border-border/30 bg-card text-center">
            <p className="text-sm text-muted-foreground">No pickups scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pickups.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Deliveries Slot */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Today's Deliveries</h3>
        {deliveries.length === 0 ? (
          <div className="p-6 rounded-xl border border-border/30 bg-card text-center">
            <p className="text-sm text-muted-foreground">No deliveries scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: ScheduleEvent }) {
  return (
    <Link
      href={`/dashboard/trips/${event.loadId}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-card hover:bg-muted/30 transition-all"
    >
      <div className="flex items-center gap-2 min-w-[70px]">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold tabular-nums">{event.time}</span>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">{event.location}</span>
      </div>
      <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[100px]">
        {event.driver}
      </span>
    </Link>
  );
}

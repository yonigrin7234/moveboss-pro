import Link from 'next/link';
import { MapPin, Clock, User, Package } from 'lucide-react';

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
  if (events.length === 0) {
    return (
      <div className="bg-white border border-border/40 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Today's Schedule</h2>
        <p className="text-sm text-muted-foreground">No events scheduled for today.</p>
      </div>
    );
  }

  const pickups = events.filter(e => e.type === 'pickup');
  const deliveries = events.filter(e => e.type === 'delivery');

  return (
    <div className="bg-white border border-border/40 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Today's Schedule</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickups Column */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pickups
          </h3>
          {pickups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pickups scheduled</p>
          ) : (
            <div className="space-y-2">
              {pickups.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Deliveries Column */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Deliveries
          </h3>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries scheduled</p>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: ScheduleEvent;
}

function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/dashboard/trips/${event.loadId}`}
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/40 hover:border-border/60 hover:bg-muted/30 hover:shadow-sm transition-all duration-150"
    >
      <div className="flex flex-col items-center pt-0.5">
        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
        <div className="w-0.5 h-full bg-border/30 mt-1 min-h-[30px]" />
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold tabular-nums text-foreground">{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{event.driver}</span>
        </div>
      </div>
    </Link>
  );
}
